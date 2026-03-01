'use client';

/**
 * Resume Chat Component
 * Fetches session data and initializes chat with previous messages
 */

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/chat/chat-interface';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
}

interface SessionData {
  id: string;
  messages: SessionMessage[];
  extractedData?: Record<string, unknown>;
}

type LoadingState = 'loading' | 'success' | 'error' | 'expired' | 'not_found';

export function ResumeChat() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [state, setState] = useState<LoadingState>('loading');
  const [session, setSession] = useState<SessionData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!sessionId) {
      setState('not_found');
      setErrorMessage('No session ID provided');
      return;
    }

    async function fetchSession() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);

        if (response.status === 404) {
          setState('not_found');
          setErrorMessage('Session not found. It may have been deleted.');
          return;
        }

        if (response.status === 410) {
          setState('expired');
          setErrorMessage('This session has expired or was already completed.');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load session');
        }

        const data = await response.json();

        if (data.success && data.session) {
          setSession({
            id: data.session.id,
            messages: data.session.messages || [],
            extractedData: data.session.extractedData,
          });
          setState('success');
        } else {
          throw new Error(data.error || 'Invalid session data');
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        setState('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load session'
        );
      }
    }

    fetchSession();
  }, [sessionId]);

  // Loading state
  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your session...</p>
        </div>
      </div>
    );
  }

  // Error states
  if (state === 'error' || state === 'expired' || state === 'not_found') {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {state === 'expired'
              ? 'Session Expired'
              : state === 'not_found'
              ? 'Session Not Found'
              : 'Unable to Load Session'}
          </h1>
          <p className="text-muted-foreground mb-6">{errorMessage}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <Button asChild>
              <Link href="/visualizer">
                <RefreshCw className="mr-2 h-4 w-4" />
                Start Fresh
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success - render chat with initial messages
  return (
    <ChatInterface
      initialMessages={session?.messages}
      sessionId={session?.id}
    />
  );
}
