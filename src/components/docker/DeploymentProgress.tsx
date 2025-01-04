import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2
} from "lucide-react";

interface DeploymentProgressProps {
  stage: 'idle' | 'preparing' | 'packaging' | 'building' | 'deploying' | 'completed' | 'error';
  message: string;
  progress: number;
  error?: string;
}

export const DeploymentProgress = ({ 
  stage, 
  message, 
  progress,
  error 
}: DeploymentProgressProps) => {
  const getIcon = () => {
    switch (stage) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'idle':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="text-sm font-medium">
          {message}
        </span>
      </div>

      {stage !== 'idle' && stage !== 'completed' && stage !== 'error' && (
        <Progress value={progress} className="h-2" />
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};