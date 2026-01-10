import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, RotateCcw, Clock, ChevronUp, ChevronDown } from "lucide-react";
import type { GenerationJob } from "@shared/schema";
import { useState } from "react";

interface GenerationQueueProps {
  jobs: GenerationJob[];
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  onCancelAll: () => void;
}

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

export function GenerationQueue({ jobs, onCancelJob, onRetryJob, onCancelAll }: GenerationQueueProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
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
    if (job.status === 'processing') {
      return acc + (100 - job.progress) * 0.5;
    }
    if (job.status === 'queued') {
      return acc + 50;
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
              <span>~{Math.ceil(estimatedTime)}s remaining</span>
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
        <ScrollArea className="h-[140px] border-t border-border">
          <div className="divide-y divide-border">
            {jobs.map((job) => (
              <div 
                key={job.id} 
                className="flex items-center gap-3 px-4 py-2"
                data-testid={`queue-job-${job.id}`}
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  {job.result?.thumbnailUrl ? (
                    <img 
                      src={job.result.thumbnailUrl} 
                      alt="" 
                      className="h-full w-full object-cover"
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
                  </div>
                  <div className="mt-1 flex items-center gap-2">
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
                      onClick={() => onRetryJob(job.id)}
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
                      onClick={() => onCancelJob(job.id)}
                      data-testid={`button-cancel-${job.id}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
