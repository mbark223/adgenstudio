import { availableModels, type AIModelId, type AIModelType } from "@shared/schema";
import { Clock, Video, Image, Sparkles } from "lucide-react";

interface ModelSelectorProps {
  selectedModelId: AIModelId | null;
  onModelChange: (modelId: AIModelId) => void;
  assetType: 'image' | 'video' | null;
}

const modelTypeIcons: Record<AIModelType, React.ReactNode> = {
  image: <Image className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
};

const modelTypeLabels: Record<AIModelType, string> = {
  image: 'Image',
  video: 'Video',
};

export function ModelSelector({ selectedModelId, onModelChange, assetType }: ModelSelectorProps) {
  const groupedModels = {
    image: availableModels.filter((m) => m.type === 'image'),
    video: availableModels.filter((m) => m.type === 'video'),
  };

  const recommendedType: AIModelType | null = assetType === 'image'
    ? 'image'
    : assetType === 'video'
    ? 'video'
    : null;

  return (
    <div className="space-y-3">
      {(['image', 'video'] as AIModelType[]).map((type) => (
        <div key={type} className="space-y-2">
          <div className="flex items-center gap-1.5">
            {modelTypeIcons[type]}
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {modelTypeLabels[type]}
            </span>
            {recommendedType === type && (
              <Sparkles className="h-3 w-3 text-primary" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {groupedModels[type].map((model) => {
              const isSelected = selectedModelId === model.id;

              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => onModelChange(model.id)}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                  data-testid={`button-model-${model.id}`}
                >
                  <div className="font-medium text-sm">{model.name}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">~{model.avgGenerationTime}s</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
