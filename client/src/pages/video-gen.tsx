import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Upload, Play, Download, Loader2, X, AlertCircle, ArrowLeft, FileVideo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoJob {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  progress?: number;
  message?: string;
  note?: string;
}

export default function VideoGen() {
  const { toast } = useToast();

  // State
  const [firstFrame, setFirstFrame] = useState<File | null>(null);
  const [lastFrame, setLastFrame] = useState<File | null>(null);
  const [firstFramePreview, setFirstFramePreview] = useState<string | null>(null);
  const [lastFramePreview, setLastFramePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(6);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [currentJob, setCurrentJob] = useState<VideoJob | null>(null);

  // Mutations
  const uploadKeyframes = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('firstFrame', firstFrame!);
      formData.append('lastFrame', lastFrame!);

      const response = await fetch('/api/video/upload-keyframes', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      return response.json();
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message,
      });
    },
  });

  const generateVideo = useMutation({
    mutationFn: async (keyframeUrls: { firstFrameUrl: string; lastFrameUrl: string }) => {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstFrameUrl: keyframeUrls.firstFrameUrl,
          lastFrameUrl: keyframeUrls.lastFrameUrl,
          prompt: prompt || undefined,
          duration,
          aspectRatio,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.message || 'Generation failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setCurrentJob({
        jobId: data.jobId,
        status: 'processing',
        progress: 0,
        message: data.message,
        note: data.note,
      });
      toast({
        title: 'Generation started',
        description: 'Your video is being generated. This may take a few minutes.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: error.message,
      });
    },
  });

  // Polling for job status
  const { data: jobStatus } = useQuery({
    queryKey: ['video-job-status', currentJob?.jobId],
    queryFn: async () => {
      const response = await fetch(`/api/video/${currentJob?.jobId}/status`);
      if (!response.ok) {
        throw new Error('Failed to check status');
      }
      return response.json();
    },
    enabled: !!currentJob && currentJob.status === 'processing',
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Update job status when polling returns data
  useEffect(() => {
    if (jobStatus) {
      setCurrentJob((prev) => {
        if (!prev) return null;

        const updated = { ...prev, ...jobStatus };

        // Show success toast when completed
        if (updated.status === 'completed' && prev.status !== 'completed') {
          toast({
            title: 'Video ready!',
            description: 'Your video has been generated successfully.',
          });
        }

        // Show error toast when failed
        if (updated.status === 'failed' && prev.status !== 'failed') {
          toast({
            variant: 'destructive',
            title: 'Generation failed',
            description: updated.error || 'An error occurred during video generation',
          });
        }

        return updated;
      });
    }
  }, [jobStatus, toast]);

  // Handlers
  const handleFirstFrameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFirstFrame(file);
      const url = URL.createObjectURL(file);
      setFirstFramePreview(url);
    }
  };

  const handleLastFrameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLastFrame(file);
      const url = URL.createObjectURL(file);
      setLastFramePreview(url);
    }
  };

  const handleRemoveFirstFrame = () => {
    setFirstFrame(null);
    if (firstFramePreview) {
      URL.revokeObjectURL(firstFramePreview);
      setFirstFramePreview(null);
    }
  };

  const handleRemoveLastFrame = () => {
    setLastFrame(null);
    if (lastFramePreview) {
      URL.revokeObjectURL(lastFramePreview);
      setLastFramePreview(null);
    }
  };

  const handleGenerate = async () => {
    if (!firstFrame || !lastFrame) {
      toast({
        variant: 'destructive',
        title: 'Missing frames',
        description: 'Please upload both first and last frames',
      });
      return;
    }

    try {
      // Step 1: Upload keyframes
      const keyframeUrls = await uploadKeyframes.mutateAsync();

      // Step 2: Start video generation
      await generateVideo.mutateAsync(keyframeUrls);
    } catch (error) {
      console.error('Generation error:', error);
    }
  };

  const handleReset = () => {
    setCurrentJob(null);
    handleRemoveFirstFrame();
    handleRemoveLastFrame();
    setPrompt('');
    setDuration(5);
    setAspectRatio('16:9');
  };

  const handleDownload = () => {
    if (currentJob?.videoUrl) {
      window.open(currentJob.videoUrl, '_blank');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (firstFramePreview) URL.revokeObjectURL(firstFramePreview);
      if (lastFramePreview) URL.revokeObjectURL(lastFramePreview);
    };
  }, [firstFramePreview, lastFramePreview]);

  const isGenerating = uploadKeyframes.isPending || generateVideo.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a
                href="/"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to AdGen Studio
              </a>
            </div>
            <div className="flex items-center gap-3">
              <FileVideo className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Veo Video Generator</h1>
            </div>
            <div className="w-[140px]" /> {/* Spacer for alignment */}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Instructions */}
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <FileVideo className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-2">How it works</h2>
                <p className="text-muted-foreground">
                  Upload two images (first frame and last frame), and Veo 3.1 will generate a smooth video transition between them.
                  Perfect for creating dynamic ad content from static images.
                </p>
              </div>
            </div>
          </Card>

          {/* Keyframe Upload Section */}
          {!currentJob && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Frame */}
                <Card className="p-6">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">
                      1
                    </span>
                    First Frame
                  </h3>
                  <div className="space-y-4">
                    {firstFramePreview ? (
                      <div className="relative">
                        <img
                          src={firstFramePreview}
                          alt="First frame"
                          className="w-full rounded-lg border border-border"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveFirstFrame}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground mb-1">Upload first frame</span>
                        <span className="text-xs text-muted-foreground">JPG, PNG, or WebP</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleFirstFrameChange}
                        />
                      </label>
                    )}
                  </div>
                </Card>

                {/* Last Frame */}
                <Card className="p-6">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">
                      2
                    </span>
                    Last Frame
                  </h3>
                  <div className="space-y-4">
                    {lastFramePreview ? (
                      <div className="relative">
                        <img
                          src={lastFramePreview}
                          alt="Last frame"
                          className="w-full rounded-lg border border-border"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveLastFrame}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground mb-1">Upload last frame</span>
                        <span className="text-xs text-muted-foreground">JPG, PNG, or WebP</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleLastFrameChange}
                        />
                      </label>
                    )}
                  </div>
                </Card>
              </div>

              {/* Generation Settings */}
              <Card className="p-6 space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">
                    3
                  </span>
                  Video Settings
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="prompt" className="text-sm font-medium">
                    Prompt (optional)
                  </Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe the video transition... (e.g., 'smooth camera movement', 'slow zoom')"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for a default smooth transition
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration" className="text-sm font-medium">
                      Duration
                    </Label>
                    <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                      <SelectTrigger id="duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 seconds</SelectItem>
                        <SelectItem value="6">6 seconds (Recommended)</SelectItem>
                        <SelectItem value="8">8 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aspectRatio" className="text-sm font-medium">
                      Aspect Ratio
                    </Label>
                    <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as any)}>
                      <SelectTrigger id="aspectRatio">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                        <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!firstFrame || !lastFrame || isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {uploadKeyframes.isPending ? 'Uploading keyframes...' : 'Starting generation...'}
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Generate Video
                    </>
                  )}
                </Button>
              </Card>
            </>
          )}

          {/* Generation Progress */}
          {currentJob && currentJob.status === 'processing' && (
            <Card className="p-6">
              <h3 className="font-medium mb-4">Generating Video</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm">Veo is creating your video...</span>
                </div>
                <Progress value={currentJob.progress || 0} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {currentJob.progress || 0}% complete • This usually takes 2-5 minutes
                </p>
                {currentJob.note && (
                  <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-xs text-muted-foreground">{currentJob.note}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Completed Video */}
          {currentJob && currentJob.status === 'completed' && currentJob.videoUrl && (
            <Card className="p-6">
              <h3 className="font-medium mb-4 text-green-600 flex items-center gap-2">
                <div className="rounded-full bg-green-100 p-1">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                Your Video is Ready!
              </h3>
              <video
                src={currentJob.videoUrl}
                controls
                className="w-full rounded-lg border border-border"
                poster={currentJob.thumbnailUrl}
              />
              <div className="mt-4 flex gap-2">
                <Button onClick={handleDownload} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download Video
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Generate Another
                </Button>
              </div>
            </Card>
          )}

          {/* Error State */}
          {currentJob && currentJob.status === 'failed' && (
            <Card className="p-6 border-destructive">
              <h3 className="font-medium text-destructive mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Generation Failed
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {currentJob.error || 'An unknown error occurred during video generation'}
              </p>
              <Button variant="outline" onClick={handleReset}>
                Try Again
              </Button>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
