import { useCallback, useState } from "react";
import { Upload, Image, Film, X, FileImage, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Asset } from "@shared/schema";

interface UploadZoneProps {
  asset: Asset | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
  isUploading: boolean;
  uploadProgress: number;
}

export function UploadZone({ asset, onUpload, onRemove, isUploading, uploadProgress }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      
      const file = e.dataTransfer.files[0];
      if (file) {
        await onUpload(file);
      }
    },
    [onUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await onUpload(file);
      }
    },
    [onUpload]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (asset) {
    return (
      <div className="relative rounded-lg border border-border bg-card p-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-7 w-7"
          onClick={onRemove}
          data-testid="button-remove-asset"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="flex gap-4">
          <div className="relative aspect-video w-32 overflow-hidden rounded-md bg-muted">
            {asset.type === 'image' ? (
              <img
                src={asset.url}
                alt={asset.filename}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Film className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
          
          <div className="flex flex-col justify-center gap-1">
            <p className="font-mono text-sm font-medium truncate max-w-[180px]" data-testid="text-asset-filename">
              {asset.filename}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {asset.type === 'image' ? (
                <FileImage className="h-3 w-3" />
              ) : (
                <FileVideo className="h-3 w-3" />
              )}
              <span>{formatFileSize(asset.size)}</span>
              {asset.width && asset.height && (
                <span className="font-mono">{asset.width}x{asset.height}</span>
              )}
              {asset.duration && (
                <span>{asset.duration.toFixed(1)}s</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isUploading) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8">
        <div className="w-full max-w-xs space-y-4">
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 animate-pulse text-primary" />
            <span className="text-sm text-muted-foreground">Uploading...</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-center text-xs text-muted-foreground">{uploadProgress}%</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-[200px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/30 hover:border-muted-foreground/50"
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      data-testid="upload-dropzone"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-3">
            <Image className="h-6 w-6 text-primary" />
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <Film className="h-6 w-6 text-primary" />
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm font-medium">
            Drag and drop your asset here
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse
          </p>
        </div>
        
        <label>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
            onChange={handleFileSelect}
            data-testid="input-file-upload"
          />
          <Button variant="outline" size="sm" className="pointer-events-none" tabIndex={-1}>
            Browse Files
          </Button>
        </label>
        
        <div className="space-y-1 text-center">
          <p className="text-xs text-muted-foreground">
            Images: JPG, PNG, WebP (max 20MB)
          </p>
          <p className="text-xs text-muted-foreground">
            Videos: MP4, MOV, WebM (max 500MB, 60s)
          </p>
        </div>
      </div>
    </div>
  );
}
