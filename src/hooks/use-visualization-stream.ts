'use client';

/**
 * useVisualizationStream
 * React hook that connects to the SSE streaming visualization endpoint
 * and exposes real-time generation progress, partial concepts, and final result.
 */

import { useState, useCallback, useRef } from 'react';
import type { GeneratedConcept, VisualizationResponse } from '@/lib/schemas/visualization';

interface VisualizationRequest {
  image: string;
  roomType: string;
  style: string;
  customRoomType?: string | undefined;
  customStyle?: string | undefined;
  constraints?: string | undefined;
  count: number;
  mode?: string | undefined;
  designIntent?: { desiredChanges: string[]; constraintsToPreserve: string[]; materialPreferences?: string[] | undefined } | undefined;
  voicePreferencesSummary?: string | undefined;
  voiceTranscript?: { role: string; content: string; timestamp: Date }[] | undefined;
  photoAnalysis?: Record<string, unknown> | undefined;
}

export type StreamStatus = 'idle' | 'connecting' | 'generating' | 'complete' | 'error';

export interface UseVisualizationStreamReturn {
  startGeneration: (request: VisualizationRequest) => void;
  cancel: () => void;
  stage: string;
  progress: number;
  concepts: GeneratedConcept[];
  visualization: VisualizationResponse | null;
  error: string | null;
  status: StreamStatus;
}

/** Parse a single SSE frame from the buffer, returning { event, data } or null */
function parseSSEFrame(frame: string): { event: string; data: string } | null {
  let event = 'message';
  let dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith('event: ')) {
      event = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      dataLines.push(line.slice(6));
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5));
    }
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

export function useVisualizationStream(): UseVisualizationStreamReturn {
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [stage, setStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [concepts, setConcepts] = useState<GeneratedConcept[]>([]);
  const [visualization, setVisualization] = useState<VisualizationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
  }, []);

  const startGeneration = useCallback((request: VisualizationRequest) => {
    // Reset state
    setStatus('connecting');
    setStage('');
    setProgress(0);
    setConcepts([]);
    setVisualization(null);
    setError(null);

    // Abort any previous stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Client-side timeout (150s)
    const timeoutId = setTimeout(() => {
      controller.abort();
      setError('Generation timed out. Please try again.');
      setStatus('error');
    }, 150000);

    (async () => {
      try {
        const response = await fetch('/api/ai/visualize/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        if (!response.ok) {
          clearTimeout(timeoutId);
          let message = 'Generation failed';
          try {
            const errBody = await response.json();
            message = errBody.error || errBody.details || message;
          } catch { /* ignore parse errors */ }
          setError(message);
          setStatus('error');
          return;
        }

        setStatus('generating');

        const reader = response.body?.getReader();
        if (!reader) {
          clearTimeout(timeoutId);
          setError('Failed to read stream');
          setStatus('error');
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Split on double-newline (SSE frame boundary)
          const frames = buffer.split('\n\n');
          // The last element might be incomplete — keep it in buffer
          buffer = frames.pop() || '';

          for (const frame of frames) {
            const trimmed = frame.trim();
            if (!trimmed || trimmed === ':') continue; // heartbeat or empty

            const parsed = parseSSEFrame(trimmed);
            if (!parsed) continue;

            try {
              const data = JSON.parse(parsed.data);

              switch (parsed.event) {
                case 'status':
                  setStage(data.stage || '');
                  setProgress(data.progress || 0);
                  break;

                case 'concept':
                  setConcepts(prev => {
                    const idx = data.index as number;
                    const concept: GeneratedConcept = {
                      id: `concept-${idx + 1}-stream`,
                      imageUrl: data.imageUrl,
                      description: data.description,
                      generatedAt: new Date().toISOString(),
                    };
                    // If this index already exists (description update), replace it
                    const existing = prev.findIndex(c => c.id === concept.id);
                    if (existing >= 0) {
                      const updated = [...prev];
                      updated[existing] = concept;
                      return updated;
                    }
                    return [...prev, concept];
                  });
                  break;

                case 'complete':
                  clearTimeout(timeoutId);
                  if (data.visualization) {
                    setVisualization(data.visualization as VisualizationResponse);
                  }
                  setProgress(100);
                  setStatus('complete');
                  break;

                case 'error':
                  clearTimeout(timeoutId);
                  setError(data.message || 'An unexpected error occurred.');
                  setStatus('error');
                  break;
              }
            } catch {
              // Ignore non-JSON frames (heartbeats, comments)
            }
          }
        }

        // Stream ended without a complete/error event
        clearTimeout(timeoutId);
        if (status !== 'complete' && status !== 'error') {
          // If we got concepts but no complete event, treat as success
          // (safety timeout on server may have closed the stream)
          setStatus(prev => {
            if (prev === 'generating') return 'complete';
            return prev;
          });
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          // User cancelled or timeout — status already set if timeout
          if (status !== 'error') {
            setStatus('idle');
          }
          return;
        }
        setError(err instanceof Error ? err.message : 'Connection to visualization service failed.');
        setStatus('error');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    startGeneration,
    cancel,
    stage,
    progress,
    concepts,
    visualization,
    error,
    status,
  };
}
