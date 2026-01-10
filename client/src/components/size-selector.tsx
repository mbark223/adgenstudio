import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { platformPresets, type SizeConfig, type PlatformKey } from "@shared/schema";
import { SiFacebook, SiTiktok, SiSnapchat, SiGoogleads } from "react-icons/si";
import { Layers } from "lucide-react";

interface SizeSelectorProps {
  selectedSizes: SizeConfig[];
  onSizesChange: (sizes: SizeConfig[]) => void;
  maxSelections?: number;
}

const platformIcons: Record<PlatformKey, React.ReactNode> = {
  meta: <SiFacebook className="h-4 w-4 text-blue-500" />,
  tiktok: <SiTiktok className="h-4 w-4" />,
  snapchat: <SiSnapchat className="h-4 w-4 text-yellow-400" />,
  moloco: <Layers className="h-4 w-4 text-purple-500" />,
  googleUAC: <SiGoogleads className="h-4 w-4 text-blue-600" />,
};

function AspectRatioPreview({ width, height }: { width: number; height: number }) {
  const maxSize = 20;
  const ratio = width / height;
  const displayWidth = ratio >= 1 ? maxSize : maxSize * ratio;
  const displayHeight = ratio >= 1 ? maxSize / ratio : maxSize;
  
  return (
    <div 
      className="rounded-sm border border-muted-foreground/30 bg-muted"
      style={{ width: displayWidth, height: displayHeight }}
    />
  );
}

export function SizeSelector({ selectedSizes, onSizesChange, maxSelections = 6 }: SizeSelectorProps) {
  const isSizeSelected = (platform: string, name: string) => {
    return selectedSizes.some((s) => s.platform === platform && s.name === name);
  };

  const toggleSize = (platform: PlatformKey, size: typeof platformPresets[PlatformKey]['sizes'][number]) => {
    const sizeConfig: SizeConfig = {
      name: size.name,
      width: size.width,
      height: size.height,
      placement: size.placement,
      platform,
    };

    if (isSizeSelected(platform, size.name)) {
      onSizesChange(selectedSizes.filter((s) => !(s.platform === platform && s.name === size.name)));
    } else if (selectedSizes.length < maxSelections) {
      onSizesChange([...selectedSizes, sizeConfig]);
    }
  };

  const selectAllPlatform = (platformKey: PlatformKey) => {
    const platform = platformPresets[platformKey];
    const platformSizes: SizeConfig[] = platform.sizes.map((size) => ({
      name: size.name,
      width: size.width,
      height: size.height,
      placement: size.placement,
      platform: platformKey,
    }));

    const otherSizes = selectedSizes.filter((s) => s.platform !== platformKey);
    const newTotal = otherSizes.length + platformSizes.length;

    if (newTotal <= maxSelections) {
      onSizesChange([...otherSizes, ...platformSizes]);
    }
  };

  const deselectAllPlatform = (platformKey: PlatformKey) => {
    onSizesChange(selectedSizes.filter((s) => s.platform !== platformKey));
  };

  const isPlatformFullySelected = (platformKey: PlatformKey) => {
    const platform = platformPresets[platformKey];
    return platform.sizes.every((size) => isSizeSelected(platformKey, size.name));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Output Sizes
        </Label>
        <Badge 
          variant={selectedSizes.length >= maxSelections ? "destructive" : "secondary"}
          className="font-mono text-xs"
        >
          {selectedSizes.length}/{maxSelections}
        </Badge>
      </div>

      <div className="space-y-4">
        {(Object.keys(platformPresets) as PlatformKey[]).map((platformKey) => {
          const platform = platformPresets[platformKey];
          const isFullySelected = isPlatformFullySelected(platformKey);

          return (
            <div key={platformKey} className="rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  {platformIcons[platformKey]}
                  <span className="text-sm font-medium">{platform.displayName}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => isFullySelected ? deselectAllPlatform(platformKey) : selectAllPlatform(platformKey)}
                  data-testid={`button-toggle-all-${platformKey}`}
                >
                  {isFullySelected ? "Deselect All" : "Select All"}
                </Button>
              </div>
              
              <div className="divide-y divide-border">
                {platform.sizes.map((size) => {
                  const isSelected = isSizeSelected(platformKey, size.name);
                  const isDisabled = !isSelected && selectedSizes.length >= maxSelections;

                  return (
                    <label
                      key={size.name}
                      className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors ${
                        isDisabled ? "opacity-50 cursor-not-allowed" : "hover-elevate"
                      } ${isSelected ? "bg-primary/5" : ""}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => !isDisabled && toggleSize(platformKey, size)}
                        disabled={isDisabled}
                        data-testid={`checkbox-size-${platformKey}-${size.name.toLowerCase().replace(/\s+/g, '-')}`}
                      />
                      <AspectRatioPreview width={size.width} height={size.height} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{size.name}</p>
                        <p className="text-xs text-muted-foreground">{size.placement}</p>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {size.width}x{size.height}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
