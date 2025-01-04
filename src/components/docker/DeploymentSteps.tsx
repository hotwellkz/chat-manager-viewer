import { Check, Loader2 } from "lucide-react";

interface Step {
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
}

interface DeploymentStepsProps {
  steps: Step[];
}

export const DeploymentSteps = ({ steps }: DeploymentStepsProps) => {
  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div 
          key={index} 
          className="flex items-center gap-2 text-sm"
        >
          {step.status === 'completed' && (
            <Check className="h-4 w-4 text-green-500" />
          )}
          {step.status === 'in-progress' && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {(step.status === 'pending' || step.status === 'error') && (
            <div className="h-4 w-4 rounded-full border border-muted" />
          )}
          <span className={
            step.status === 'completed' 
              ? 'text-muted-foreground line-through' 
              : step.status === 'in-progress'
                ? 'font-medium'
                : ''
          }>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
};