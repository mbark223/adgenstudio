import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { X, RotateCcw, Clock, ChevronUp, ChevronDown, ChevronRight, Trophy, Swords, MessageSquare, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { GenerationJob, Variation, VariationStatus } from "@shared/schema";
import { useState } from "react";

interface GenerationQueueProps {
  jobs: GenerationJob[];
  variations?: Variation[];
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  onCancelAll: () => void;
  onStatusChange?: (variationId: string, status: VariationStatus | undefined) => void;
  onFeedbackChange?: (variationId: string, feedback: string) => void;
}

// Model-specific time estimates (in seconds)
const MODEL_ESTIMATES: Record<string, number> = {
  'nanobanana': 15,
  'prunaai': 3,
  'veo-3': 90,
  'sora': 180,
  'luma-reframe': 20,
};

const statusColors: Record<GenerationJob['status'], string> = {
  queued: "bg-muted text-muted-foreground",
  processing: "bg-blue-500/10 text-blue-500",
  completed: "bg-green-500/10 text-green-500",
  failed: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<GenerationJob['status'], string> = {
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

// Status icon helper
const StatusIcon = ({ status }: { status: GenerationJob['status'] }) => {
  switch (status) {
    case 'queued':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />;
  }
};

export function GenerationQueue({ jobs, variations = [], onCancelJob, onRetryJob, onCancelAll, onStatusChange, onFeedbackChange }: GenerationQueueProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});

  // Helper to get variation for a job
  const getVariationForJob = (job: GenerationJob): Variation | undefined => {
    // Try exact job ID match first
    const byJobId = variations.find(v => v.jobId === job.id);
    if (byJobId) return byJobId;

    // Fallback: match by variation index and size config
    // This handles timing issues where variations haven't synced with jobId yet
    return variations.find(v =>
      v.variationIndex === job.variationIndex &&
      v.sizeConfig.width === job.sizeConfig.width &&
      v.sizeConfig.height === job.sizeConfig.height
    );
  };
  
  if (jobs.length === 0) {
    return null;
  }

  const completedCount = jobs.filter((j) => j.status === 'completed').length;
  const failedCount = jobs.filter((j) => j.status === 'failed').length;
  const processingCount = jobs.filter((j) => j.status === 'processing').length;
  const queuedCount = jobs.filter((j) => j.status === 'queued').length;
  
  const overallProgress = jobs.length > 0 
    ? Math.round((completedCount / jobs.length) * 100)
    : 0;

  const activeJobs = jobs.filter((j) => j.status !== 'completed');
  const estimatedTime = activeJobs.reduce((acc, job) => {
    const estimate = MODEL_ESTIMATES[job.modelId] || 30;

    if (job.status === 'processing') {
      // Adjust by progress percentage
      return acc + (estimate * ((100 - job.progress) / 100));
    }
    if (job.status === 'queued') {
      return acc + estimate;
    }
    return acc;
  }, 0);

  return (
    <div className="border-t border-border bg-card">
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover-elevate"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="button-toggle-queue"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Generation Queue</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {completedCount}/{jobs.length}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {processingCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                {processingCount} processing
              </span>
            )}
            {queuedCount > 0 && (
              <span>{queuedCount} queued</span>
            )}
            {failedCount > 0 && (
              <span className="text-destructive">{failedCount} failed</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {estimatedTime > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                ~{estimatedTime < 60
                  ? `${Math.ceil(estimatedTime)}s`
                  : `${Math.ceil(estimatedTime / 60)}m`} remaining
              </span>
            </div>
          )}
          
          <div className="w-32">
            <Progress value={overallProgress} className="h-1.5" />
          </div>
          
          {activeJobs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onCancelAll();
              }}
              data-testid="button-cancel-all"
            >
              Cancel All
            </Button>
          )}
          
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <ScrollArea className="max-h-[400px] border-t border-border">
          <div className="divide-y divide-border">
            {jobs.map((job) => {
              const variation = getVariationForJob(job);
              const isJobExpanded = expandedJobId === job.id;
              const canExpand = job.status === 'completed';

              return (
                <div key={job.id} data-testid={`queue-job-${job.id}`}>
                  <div
                    className={`flex items-center gap-3 px-4 py-2 ${canExpand ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                    onClick={() => canExpand && setExpandedJobId(isJobExpanded ? null : job.id)}
                  >
                    {canExpand && (
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isJobExpanded ? 'rotate-90' : ''}`} />
                    )}

                    <div
                      className="shrink-0 overflow-hidden rounded-md bg-muted"
                      style={{
                        width: '64px',
                        aspectRatio: `${job.sizeConfig.width} / ${job.sizeConfig.height}`,
                        maxHeight: '96px'
                      }}
                    >
                      {job.result?.thumbnailUrl ? (
                        <img
                          src={job.result.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="text-xs text-muted-foreground">
                            V{job.variationIndex + 1}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          Variation {job.variationIndex + 1}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {job.sizeConfig.width}x{job.sizeConfig.height}
                        </span>
                        {variation?.status === 'winner' && (
                          <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                            <Trophy className="h-3 w-3 mr-0.5" />
                            Winner
                          </Badge>
                        )}
                        {variation?.status === 'challenger' && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Swords className="h-3 w-3 mr-0.5" />
                            Challenger
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusIcon status={job.status} />
                        <Badge className={`text-[10px] ${statusColors[job.status]}`}>
                          {statusLabels[job.status]}
                        </Badge>
                        {job.status === 'processing' && (
                          <div className="flex-1 max-w-[120px]">
                            <Progress value={job.progress} className="h-1" />
                          </div>
                        )}
                        {job.error && (
                          <span className="text-xs text-destructive truncate max-w-[150px]">
                            {job.error}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {job.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRetryJob(job.id);
                          }}
                          data-testid={`button-retry-${job.id}`}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(job.status === 'queued' || job.status === 'processing') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancelJob(job.id);
                          }}
                          data-testid={`button-cancel-${job.id}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isJobExpanded && (
                    <div className="px-4 py-3 bg-muted/30 border-t border-border space-y-3">
                      {variation ? (
                        <>
                          {/* Hypothesis */}
                          {variation.hypothesis && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <span>Hypothesis</span>
                              </div>
                              <p className="text-sm italic border-l-2 border-primary/30 pl-2 text-muted-foreground">
                                {variation.hypothesis}
                              </p>
                            </div>
                          )}

                          {/* Status Actions */}
                          {onStatusChange && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-muted-foreground">Mark As</div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant={variation.status === 'winner' ? "default" : "outline"}
                                  className={`h-7 text-xs ${variation.status === 'winner' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange(variation.id, variation.status === 'winner' ? undefined : 'winner');
                                  }}
                                >
                                  <Trophy className="h-3 w-3 mr-1" />
                                  Winner
                                </Button>
                                <Button
                                  size="sm"
                                  variant={variation.status === 'challenger' ? "secondary" : "outline"}
                                  className="h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange(variation.id, variation.status === 'challenger' ? undefined : 'challenger');
                                  }}
                                >
                                  <Swords className="h-3 w-3 mr-1" />
                                  Challenger
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Feedback */}
                          {onFeedbackChange && (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <MessageSquare className="h-3 w-3" />
                                <span>Feedback</span>
                              </div>
                              <div className="flex gap-2">
                                <Textarea
                                  value={feedbackInputs[variation.id] ?? variation.feedback ?? ''}
                                  onChange={(e) => setFeedbackInputs(prev => ({ ...prev, [variation.id]: e.target.value }))}
                                  placeholder="Add notes about this variation..."
                                  className="min-h-[60px] text-xs resize-none"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const feedback = feedbackInputs[variation.id] ?? variation.feedback ?? '';
                                  onFeedbackChange(variation.id, feedback);
                                }}
                                disabled={(feedbackInputs[variation.id] ?? variation.feedback ?? '') === (variation.feedback ?? '')}
                              >
                                Save Feedback
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">Loading variation details...</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
