import { Check, Upload, Settings, Play } from "lucide-react";

interface WorkflowStepperProps {
  hasAsset: boolean;
  hasSizes: boolean;
  isGenerating: boolean;
}

export function WorkflowStepper({ hasAsset, hasSizes, isGenerating }: WorkflowStepperProps) {
  const currentStep = !hasAsset ? 1 : !hasSizes ? 2 : 3;

  const steps = [
    { number: 1, label: "Upload", icon: Upload, completed: hasAsset },
    { number: 2, label: "Configure", icon: Settings, completed: hasAsset && hasSizes },
    { number: 3, label: "Generate", icon: Play, completed: false },
  ];

  return (
    <div className="flex items-center justify-center gap-2 px-3 py-3 border-b border-border bg-muted/30">
      {steps.map((step, index) => {
        const isActive = step.number === currentStep;
        const isCompleted = step.completed;
        const Icon = step.icon;

        return (
          <div key={step.number} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isActive
                    ? "bg-primary/20 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-px w-4 ${
                  step.completed ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
