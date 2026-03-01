'use client';

/**
 * Lead Visualization Panel
 * Admin component for viewing and managing visualizations linked to a lead
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { BeforeAfterComparison } from './before-after-comparison';
import {
  Star,
  ChevronDown,
  ChevronUp,
  Save,
  MessageSquare,
  Eye,
  Camera,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Loader2,
  DollarSign,
  Bot,
  User,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCAD } from '@/lib/ai/knowledge/pricing-data';
import type { Json } from '@/types/database';

interface GeneratedConcept {
  id: string;
  imageUrl: string;
  description?: string;
  generatedAt: string;
}

interface PhotoAnalysis {
  roomType: string;
  currentCondition: string;
  structuralElements: string[];
  identifiedFixtures: string[];
  layoutType: string;
  lightingConditions: string;
  perspectiveNotes: string;
  preservationConstraints: string[];
  confidenceScore: number;
}

interface ConversationContext {
  extractedData?: {
    desiredChanges: string[];
    constraintsToPreserve: string[];
    stylePreference?: string;
    materialPreferences?: string[];
  };
  turnCount?: number;
}

interface ConceptPricing {
  identifiedMaterials: {
    name: string;
    category: string;
    estimatedQuantity: string;
    priceRange: { low: number; high: number };
    unit: string;
    confidence: number;
  }[];
  inferredFinishLevel: 'economy' | 'standard' | 'premium';
  materialCostRange: { low: number; high: number };
  labourCostRange: { low: number; high: number };
  totalEstimate: { low: number; high: number };
  visibleChanges: string[];
  overallConfidence: number;
}

interface Visualization {
  id: string;
  original_photo_url: string;
  room_type: string;
  style: string;
  constraints?: string;
  generated_concepts: GeneratedConcept[];
  generation_time_ms: number;
  photo_analysis?: PhotoAnalysis;
  conversation_context?: ConversationContext;
  concept_pricing?: ConceptPricing;
  admin_notes?: string;
  selected_concept_index?: number;
  contractor_feasibility_score?: number;
  estimated_cost_impact?: string;
  technical_concerns?: string[];
  created_at: string;
  is_primary?: boolean;
  admin_selected?: boolean;
  client_favourited_concepts?: number[];
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

interface LeadVisualizationPanelProps {
  leadId: string;
  chatTranscript?: Json | null | undefined;
  className?: string;
}

export function LeadVisualizationPanel({
  leadId,
  chatTranscript,
  className,
}: LeadVisualizationPanelProps) {
  const [visualizations, setVisualizations] = useState<Visualization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVizIndex, setSelectedVizIndex] = useState(0);
  const [selectedConceptIndex, setSelectedConceptIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [showCostAnalysis, setShowCostAnalysis] = useState(false);
  const [showChatTranscript, setShowChatTranscript] = useState(false);

  // Local state for editable fields
  const [adminNotes, setAdminNotes] = useState('');
  const [feasibilityScore, setFeasibilityScore] = useState<string>('');
  const [costImpact, setCostImpact] = useState('');
  const [technicalConcerns, setTechnicalConcerns] = useState('');

  // Fetch visualizations for this lead
  useEffect(() => {
    const fetchVisualizations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/leads/${leadId}/visualizations`);
        if (!response.ok) {
          throw new Error('Failed to fetch visualizations');
        }
        const data = await response.json();
        setVisualizations(data.visualizations || []);

        // Initialize local state with first visualization
        if (data.visualizations?.length > 0) {
          const viz = data.visualizations[0];
          setAdminNotes(viz.admin_notes || '');
          setFeasibilityScore(viz.contractor_feasibility_score?.toString() || '');
          setCostImpact(viz.estimated_cost_impact || '');
          setTechnicalConcerns(viz.technical_concerns?.join('\n') || '');
          setSelectedConceptIndex(viz.selected_concept_index || 0);
        }
      } catch (err) {
        console.error('Error fetching visualizations:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVisualizations();
  }, [leadId]);

  // Update local state when selected visualization changes
  useEffect(() => {
    const viz = visualizations[selectedVizIndex];
    if (viz) {
      setAdminNotes(viz.admin_notes || '');
      setFeasibilityScore(viz.contractor_feasibility_score?.toString() || '');
      setCostImpact(viz.estimated_cost_impact || '');
      setTechnicalConcerns(viz.technical_concerns?.join('\n') || '');
      setSelectedConceptIndex(viz.selected_concept_index || 0);
    }
  }, [selectedVizIndex, visualizations]);

  // Save changes
  const handleSave = useCallback(async () => {
    const viz = visualizations[selectedVizIndex];
    if (!viz) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/admin/visualizations/${viz.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admin_notes: adminNotes || null,
            contractor_feasibility_score: feasibilityScore
              ? parseInt(feasibilityScore, 10)
              : null,
            selected_concept_index: selectedConceptIndex,
            estimated_cost_impact: costImpact || null,
            technical_concerns: technicalConcerns
              ? technicalConcerns.split('\n').filter((c) => c.trim())
              : null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      // Update local state
      setVisualizations((prev) =>
        prev.map((v, i) => {
          if (i !== selectedVizIndex) return v;
          // Build updated visualization with explicit property handling for exactOptionalPropertyTypes
          const updated: Visualization = {
            ...v,
            admin_notes: adminNotes,
            selected_concept_index: selectedConceptIndex,
            estimated_cost_impact: costImpact,
          };
          // Only set optional properties if they have values
          if (feasibilityScore) {
            updated.contractor_feasibility_score = parseInt(feasibilityScore, 10);
          }
          if (technicalConcerns) {
            updated.technical_concerns = technicalConcerns.split('\n').filter((c) => c.trim());
          }
          return updated;
        })
      );
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [
    visualizations,
    selectedVizIndex,
    adminNotes,
    feasibilityScore,
    selectedConceptIndex,
    costImpact,
    technicalConcerns,
  ]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading visualizations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-12', className)}>
        <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (visualizations.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-medium text-lg">No Visualizations</h3>
        <p className="text-muted-foreground mt-1">
          This lead doesn&apos;t have any AI visualizations yet.
        </p>
      </div>
    );
  }

  const currentViz = visualizations[selectedVizIndex];
  const currentConcept = currentViz?.generated_concepts[selectedConceptIndex];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Visualization selector (if multiple) */}
      {visualizations.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {visualizations.map((viz, index) => (
            <button
              key={viz.id}
              onClick={() => setSelectedVizIndex(index)}
              className={cn(
                'flex-shrink-0 p-2 rounded-lg border transition-all',
                index === selectedVizIndex
                  ? 'border-primary ring-2 ring-primary ring-offset-2'
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              <img
                src={viz.original_photo_url}
                alt={`Visualization ${index + 1}`}
                className="w-16 h-12 object-cover rounded"
              />
              <div className="text-xs mt-1 text-center capitalize">
                {viz.room_type.replace('_', ' ')}
              </div>
              {viz.is_primary && (
                <Badge variant="secondary" className="text-[10px] mt-1">
                  Primary
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      {currentViz && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left column - Before/After comparison */}
          <div className="space-y-4">
            <BeforeAfterComparison
              beforeImage={currentViz.original_photo_url}
              afterImage={currentConcept?.imageUrl || ''}
              beforeLabel="Original"
              afterLabel={`Concept ${selectedConceptIndex + 1}`}
            />

            {/* Concept thumbnails */}
            {currentViz.generated_concepts.length > 1 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Concept</Label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {currentViz.generated_concepts.map((concept, index) => (
                    <button
                      key={concept.id}
                      onClick={() => setSelectedConceptIndex(index)}
                      className={cn(
                        'flex-shrink-0 relative rounded-lg overflow-hidden border-2 transition-all',
                        index === selectedConceptIndex
                          ? 'border-primary ring-2 ring-primary ring-offset-2'
                          : 'border-transparent hover:border-muted-foreground'
                      )}
                    >
                      <img
                        src={concept.imageUrl}
                        alt={`Concept ${index + 1}`}
                        className="w-20 h-14 object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] py-0.5 text-center">
                        Concept {index + 1}
                      </div>
                      {currentViz.client_favourited_concepts?.includes(index) && (
                        <div className="absolute top-0.5 right-0.5" title="Customer favourited this concept">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 drop-shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline" className="capitalize">
                {currentViz.room_type.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {currentViz.style}
              </Badge>
              <Badge variant="outline">
                {Math.round(currentViz.generation_time_ms / 1000)}s generation
              </Badge>
            </div>

            {/* User constraints */}
            {currentViz.constraints && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    User Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <p className="text-sm text-muted-foreground">
                    {currentViz.constraints}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column - Admin controls */}
          <div className="space-y-4">
            {/* Feasibility Score */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Contractor Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm">Feasibility Score</Label>
                  <Select
                    value={feasibilityScore}
                    onValueChange={setFeasibilityScore}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Rate feasibility..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 - Very Feasible</SelectItem>
                      <SelectItem value="4">4 - Feasible</SelectItem>
                      <SelectItem value="3">3 - Moderate Effort</SelectItem>
                      <SelectItem value="2">2 - Challenging</SelectItem>
                      <SelectItem value="1">1 - Not Recommended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Estimated Cost Impact</Label>
                  <Select value={costImpact} onValueChange={setCostImpact}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select impact..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Minor changes</SelectItem>
                      <SelectItem value="medium">Medium - Significant work</SelectItem>
                      <SelectItem value="high">High - Major renovation</SelectItem>
                      <SelectItem value="very_high">Very High - Structural changes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Technical Concerns (one per line)</Label>
                  <Textarea
                    value={technicalConcerns}
                    onChange={(e) => setTechnicalConcerns(e.target.value)}
                    placeholder="e.g., Plumbing relocation needed..."
                    className="mt-1 min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Admin Notes */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Internal Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Notes for internal use..."
                  className="min-h-[100px]"
                />
              </CardContent>
            </Card>

            {/* Photo Analysis (collapsible) */}
            {currentViz.photo_analysis && (
              <Collapsible open={showAnalysis} onOpenChange={setShowAnalysis}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          AI Photo Analysis
                        </span>
                        {showAnalysis ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 text-sm space-y-3">
                      <div>
                        <span className="font-medium">Layout:</span>{' '}
                        {currentViz.photo_analysis.layoutType}
                      </div>
                      <div>
                        <span className="font-medium">Condition:</span>{' '}
                        <span className="capitalize">
                          {currentViz.photo_analysis.currentCondition.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Fixtures:</span>{' '}
                        {currentViz.photo_analysis.identifiedFixtures.join(', ')}
                      </div>
                      <div>
                        <span className="font-medium">Preservation:</span>{' '}
                        {currentViz.photo_analysis.preservationConstraints.join(', ')}
                      </div>
                      <div>
                        <span className="font-medium">Confidence:</span>{' '}
                        {Math.round(currentViz.photo_analysis.confidenceScore * 100)}%
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Conversation Context (collapsible) */}
            {currentViz.conversation_context?.extractedData && (
              <Collapsible open={showConversation} onOpenChange={setShowConversation}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Conversation Insights
                          <Badge variant="secondary" className="text-xs">
                            {currentViz.conversation_context.turnCount || 0} turns
                          </Badge>
                        </span>
                        {showConversation ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 text-sm space-y-3">
                      {currentViz.conversation_context.extractedData.desiredChanges
                        ?.length > 0 && (
                        <div>
                          <span className="font-medium">Desired Changes:</span>
                          <ul className="list-disc list-inside mt-1 text-muted-foreground">
                            {currentViz.conversation_context.extractedData.desiredChanges.map(
                              (change, i) => (
                                <li key={i}>{change}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                      {currentViz.conversation_context.extractedData
                        .constraintsToPreserve?.length > 0 && (
                        <div>
                          <span className="font-medium">Wants to Keep:</span>
                          <ul className="list-disc list-inside mt-1 text-muted-foreground">
                            {currentViz.conversation_context.extractedData.constraintsToPreserve.map(
                              (constraint, i) => (
                                <li key={i}>{constraint}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                      {currentViz.conversation_context.extractedData
                        .materialPreferences &&
                        currentViz.conversation_context.extractedData
                          .materialPreferences.length > 0 && (
                        <div>
                          <span className="font-medium">Material Preferences:</span>{' '}
                          {currentViz.conversation_context.extractedData.materialPreferences.join(
                            ', '
                          )}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Design Studio Chat (collapsible) */}
            {(() => {
              const chatMessages: ChatMessage[] = Array.isArray(chatTranscript)
                ? (chatTranscript as unknown as ChatMessage[]).filter((m) => m.role !== 'system')
                : [];
              if (chatMessages.length === 0) return null;
              return (
                <Collapsible open={showChatTranscript} onOpenChange={setShowChatTranscript}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Design Studio Chat
                            <Badge variant="secondary" className="text-xs">
                              {chatMessages.length} messages
                            </Badge>
                          </span>
                          {showChatTranscript ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-3 pr-4">
                            {chatMessages.map((msg, i) => (
                              <div
                                key={i}
                                className={cn(
                                  'flex gap-2',
                                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                )}
                              >
                                <div
                                  className={cn(
                                    'flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center',
                                    msg.role === 'user'
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted'
                                  )}
                                >
                                  {msg.role === 'user' ? (
                                    <User className="h-3 w-3" />
                                  ) : (
                                    <Bot className="h-3 w-3" />
                                  )}
                                </div>
                                <div
                                  className={cn(
                                    'max-w-[85%] rounded-lg px-3 py-2 text-xs',
                                    msg.role === 'user'
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted'
                                  )}
                                >
                                  <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })()}

            {/* AI Cost Analysis (collapsible) */}
            {currentViz.concept_pricing && (
              <Collapsible open={showCostAnalysis} onOpenChange={setShowCostAnalysis}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          AI Cost Analysis
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs capitalize',
                              currentViz.concept_pricing.inferredFinishLevel === 'economy' && 'bg-gray-100 text-gray-700',
                              currentViz.concept_pricing.inferredFinishLevel === 'standard' && 'bg-blue-100 text-blue-700',
                              currentViz.concept_pricing.inferredFinishLevel === 'premium' && 'bg-purple-100 text-purple-700',
                            )}
                          >
                            {currentViz.concept_pricing.inferredFinishLevel}
                          </Badge>
                        </span>
                        {showCostAnalysis ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 text-sm space-y-4">
                      {/* Identified Materials */}
                      {currentViz.concept_pricing.identifiedMaterials.length > 0 && (
                        <div>
                          <span className="font-medium">Identified Materials</span>
                          <div className="mt-2 overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                  <th className="pb-1 pr-3">Material</th>
                                  <th className="pb-1 pr-3">Category</th>
                                  <th className="pb-1 text-right">Price Range</th>
                                </tr>
                              </thead>
                              <tbody>
                                {currentViz.concept_pricing.identifiedMaterials.map((mat, i) => (
                                  <tr key={i} className="border-b border-border/50">
                                    <td className="py-1.5 pr-3">{mat.name}</td>
                                    <td className="py-1.5 pr-3 capitalize text-muted-foreground">
                                      {mat.category}
                                    </td>
                                    <td className="py-1.5 text-right whitespace-nowrap">
                                      {formatCAD(mat.priceRange.low)} – {formatCAD(mat.priceRange.high)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Cost Summary */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Materials</div>
                          <div className="font-medium mt-0.5">
                            {formatCAD(currentViz.concept_pricing.materialCostRange.low)} – {formatCAD(currentViz.concept_pricing.materialCostRange.high)}
                          </div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Labour</div>
                          <div className="font-medium mt-0.5">
                            {formatCAD(currentViz.concept_pricing.labourCostRange.low)} – {formatCAD(currentViz.concept_pricing.labourCostRange.high)}
                          </div>
                        </div>
                        <div className="bg-primary/5 rounded-lg p-2.5 text-center border border-primary/20">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
                          <div className="font-semibold mt-0.5">
                            {formatCAD(currentViz.concept_pricing.totalEstimate.low)} – {formatCAD(currentViz.concept_pricing.totalEstimate.high)}
                          </div>
                        </div>
                      </div>

                      {/* Visible Changes */}
                      {currentViz.concept_pricing.visibleChanges.length > 0 && (
                        <div>
                          <span className="font-medium">Visible Changes</span>
                          <ul className="list-disc list-inside mt-1 text-muted-foreground">
                            {currentViz.concept_pricing.visibleChanges.map((change, i) => (
                              <li key={i}>{change}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Confidence */}
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Confidence:</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            currentViz.concept_pricing.overallConfidence >= 0.7 && 'bg-green-100 text-green-700',
                            currentViz.concept_pricing.overallConfidence >= 0.5 && currentViz.concept_pricing.overallConfidence < 0.7 && 'bg-yellow-100 text-yellow-700',
                            currentViz.concept_pricing.overallConfidence < 0.5 && 'bg-red-100 text-red-700',
                          )}
                        >
                          {Math.round(currentViz.concept_pricing.overallConfidence * 100)}%
                        </Badge>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Assessment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
