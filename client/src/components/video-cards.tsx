import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Film } from "lucide-react";
import type { Asset } from "@shared/schema";

interface VideoCardsProps {
  introCard: Asset | null;
  outroCard: Asset | null;
  onIntroUpload: (file: File) => Promise<void>;
  onOutroUpload: (file: File) => Promise<void>;
  onRemoveIntro: () => void;
  onRemoveOutro: () => void;
}

function CardUpload({
  label,
  asset,
  onUpload,
  onRemove,
}: {
  label: string;
  asset: Asset | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
}) {
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await onUpload(file);
      }
    },
    [onUpload]
  );

  if (asset) {
    return (
      <div className="relative rounded-md border border-border bg-muted/30 p-2">
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-background border border-border shadow-sm"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded overflow-hidden bg-muted">
            <img
              src={asset.url}
              alt={label}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{label}</p>
            <p className="text-[10px] text-muted-foreground truncate">{asset.filename}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border p-3 transition-colors hover:bg-muted/30">
      <input
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
      />
      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
        <Upload className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">Click to upload</p>
      </div>
    </label>
  );
}

export function VideoCards({
  introCard,
  outroCard,
  onIntroUpload,
  onOutroUpload,
  onRemoveIntro,
  onRemoveOutro,
}: VideoCardsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Film className="h-4 w-4 text-muted-foreground" />
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Video Intro/Outro Cards
        </Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Add static images to be used as intro and outro frames for generated videos.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <CardUpload
          label="Intro Card"
          asset={introCard}
          onUpload={onIntroUpload}
          onRemove={onRemoveIntro}
        />
        <CardUpload
          label="Outro Card"
          asset={outroCard}
          onUpload={onOutroUpload}
          onRemove={onRemoveOutro}
        />
      </div>
    </div>
  );
}
