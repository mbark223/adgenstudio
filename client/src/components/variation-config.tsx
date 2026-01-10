import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { variationTypes, type VariationTypeId } from "@shared/schema";

interface VariationConfigProps {
  variationCount: number;
  onVariationCountChange: (count: number) => void;
  selectedTypes: VariationTypeId[];
  onTypesChange: (types: VariationTypeId[]) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  negativePrompt: string;
  onNegativePromptChange: (prompt: string) => void;
  assetType: 'image' | 'video' | null;
}

export function VariationConfig({
  variationCount,
  onVariationCountChange,
  selectedTypes,
  onTypesChange,
  prompt,
  onPromptChange,
  negativePrompt,
  onNegativePromptChange,
  assetType,
}: VariationConfigProps) {
  const handleTypeToggle = (typeId: VariationTypeId) => {
    if (selectedTypes.includes(typeId)) {
      onTypesChange(selectedTypes.filter((t) => t !== typeId));
    } else {
      onTypesChange([...selectedTypes, typeId]);
    }
  };

  const filteredTypes = assetType
    ? variationTypes.filter((t) => t.applicableTo.includes(assetType))
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
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Creative Direction
        </Label>
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Describe your creative direction... (e.g., 'Make background more tropical, add palm trees')"
          className="min-h-[100px] resize-none font-mono text-sm"
          data-testid="textarea-prompt"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Negative Prompt (Optional)
        </Label>
        <Textarea
          value={negativePrompt}
          onChange={(e) => onNegativePromptChange(e.target.value)}
          placeholder="What to avoid... (e.g., 'No text, no watermarks')"
          className="min-h-[60px] resize-none font-mono text-sm"
          data-testid="textarea-negative-prompt"
        />
      </div>
    </div>
  );
}
