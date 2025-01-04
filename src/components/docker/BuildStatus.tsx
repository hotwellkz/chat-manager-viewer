import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface BuildStatusProps {
  stage: 'idle' | 'preparing' | 'packaging' | 'building' | 'deploying' | 'completed' | 'error';
  message: string;
  progress: number;
  isBuilding: boolean;
}

export const BuildStatus = ({ stage, message, progress, isBuilding }: BuildStatusProps) => {
  if (stage === 'idle') return null;

  return (
    <div className="space-y-2">
      <Alert variant={stage === 'error' ? 'destructive' : 'default'}>
        <AlertDescription>
          {message}
        </AlertDescription>
      </Alert>
      
      {isBuilding && (
        <Progress value={progress} className="h-2" />
      )}
    </div>
  );
};