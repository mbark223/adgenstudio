import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Shield, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { variationTypes, brandProtectionOptions, type VariationTypeId, type BrandProtectionId } from "@shared/schema";

interface VariationConfigProps {
  variationCount: number;
  onVariationCountChange: (count: number) => void;
  selectedTypes: VariationTypeId[];
  onTypesChange: (types: VariationTypeId[]) => void;
  selectedProtections: BrandProtectionId[];
  onProtectionsChange: (protections: BrandProtectionId[]) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  negativePrompt: string;
  onNegativePromptChange: (prompt: string) => void;
  assetType: 'image' | 'video' | null;
  previewedPrompts?: string[];
  isLoadingPrompts?: boolean;
}

export function VariationConfig({
  variationCount,
  onVariationCountChange,
  selectedTypes,
  onTypesChange,
  selectedProtections,
  onProtectionsChange,
  prompt,
  onPromptChange,
  negativePrompt,
  onNegativePromptChange,
  assetType,
  previewedPrompts = [],
  isLoadingPrompts = false,
}: VariationConfigProps) {
  const [promptsExpanded, setPromptsExpanded] = useState(false);
  const handleTypeToggle = (typeId: VariationTypeId) => {
    if (selectedTypes.includes(typeId)) {
      onTypesChange(selectedTypes.filter((t) => t !== typeId));
    } else {
      onTypesChange([...selectedTypes, typeId]);
    }
  };

  const handleProtectionToggle = (protectionId: BrandProtectionId) => {
    if (selectedProtections.includes(protectionId)) {
      onProtectionsChange(selectedProtections.filter((p) => p !== protectionId));
    } else {
      onProtectionsChange([...selectedProtections, protectionId]);
    }
  };

  const filteredTypes = assetType
    ? variationTypes.filter((t) => (t.applicableTo as readonly string[]).includes(assetType))
    : variationTypes;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Variation Count
          </Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={variationCount}
            onChange={(e) => onVariationCountChange(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
            className="h-8 w-16 text-center font-mono text-sm"
            data-testid="input-variation-count"
          />
        </div>
        <Slider
          value={[variationCount]}
          onValueChange={([value]) => onVariationCountChange(value)}
          min={1}
          max={10}
          step={1}
          className="w-full"
          data-testid="slider-variation-count"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Variation Types
        </Label>
        <div className="grid grid-cols-1 gap-2">
          {filteredTypes.map((type) => (
            <label
              key={type.id}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover-elevate ${
                selectedTypes.includes(type.id as VariationTypeId)
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <Checkbox
                checked={selectedTypes.includes(type.id as VariationTypeId)}
                onCheckedChange={() => handleTypeToggle(type.id as VariationTypeId)}
                className="mt-0.5"
                data-testid={`checkbox-variation-${type.id}`}
              />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">{type.name}</p>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </div>
              <div className="flex gap-1">
                {type.applicableTo.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {t}
                  </Badge>
                ))}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Brand Protection
          </Label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {brandProtectionOptions.map((protection) => (
            <label
              key={protection.id}
              className={`flex cursor-pointer items-center gap-2 rounded-md border p-2.5 transition-colors ${
                selectedProtections.includes(protection.id as BrandProtectionId)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <Checkbox
                checked={selectedProtections.includes(protection.id as BrandProtectionId)}
                onCheckedChange={() => handleProtectionToggle(protection.id as BrandProtectionId)}
                data-testid={`checkbox-protection-${protection.id}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none truncate">{protection.name}</p>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Selected protections ensure these elements stay consistent across variations
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Creative Direction
        </Label>
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Describe your creative direction... Use {{variable}} tokens for dynamic content (e.g., 'Feature {{product_name}} with tropical background')"
          className="min-h-[100px] resize-none font-mono text-sm"
          data-testid="textarea-prompt"
        />
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground">Tokens:</span>
          {['{{product_name}}', '{{tagline}}', '{{brand}}', '{{cta}}'].map((token) => (
            <Badge
              key={token}
              variant="outline"
              className="text-[10px] cursor-pointer hover:bg-primary/10"
              onClick={() => onPromptChange(prompt + ' ' + token)}
            >
              {token}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Avoid These Elements (Optional)
        </Label>
        <Textarea
          value={negativePrompt}
          onChange={(e) => onNegativePromptChange(e.target.value)}
          placeholder="What to avoid... (e.g., 'No text, no watermarks')"
          className="min-h-[60px] resize-none font-mono text-sm"
          data-testid="textarea-negative-prompt"
        />
      </div>

      {/* Live Prompts Preview */}
      {(previewedPrompts.length > 0 || isLoadingPrompts) && (
        <div className="space-y-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => setPromptsExpanded(!promptsExpanded)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              {isLoadingPrompts ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground cursor-pointer">
                {isLoadingPrompts ? 'Generating Directions...' : `${previewedPrompts.length} Directions Ready`}
              </Label>
            </div>
            {promptsExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {promptsExpanded && previewedPrompts.length > 0 && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {previewedPrompts.map((p, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border bg-muted/30 p-2"
                >
                  <p className="text-xs text-muted-foreground mb-1">Variation {i + 1}</p>
                  <p className="text-xs font-mono leading-relaxed">{p}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
