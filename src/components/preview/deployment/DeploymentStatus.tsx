import { AlertCircle, CheckCircle2, Loader2, Package, Hammer, Upload, Rocket } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type DeploymentStatus = 'pending' | 'preparing' | 'packaging' | 'building' | 'deploying' | 'deployed' | 'error';

interface DeploymentStatusProps {
  status: DeploymentStatus;
  progress: number;
  error?: string | null;
}

const statusConfig = {
  pending: {
    icon: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
    label: 'Ожидание начала деплоя...',
  },
  preparing: {
    icon: <Package className="h-4 w-4 text-blue-500" />,
    label: 'Подготовка файлов...',
  },
  packaging: {
    icon: <Package className="h-4 w-4 text-blue-500 animate-pulse" />,
    label: 'Упаковка проекта...',
  },
  building: {
    icon: <Hammer className="h-4 w-4 text-yellow-500 animate-bounce" />,
    label: 'Сборка проекта...',
  },
  deploying: {
    icon: <Upload className="h-4 w-4 text-purple-500 animate-pulse" />,
    label: 'Развертывание...',
  },
  deployed: {
    icon: <Rocket className="h-4 w-4 text-green-500" />,
    label: 'Проект успешно развернут',
  },
  error: {
    icon: <AlertCircle className="h-4 w-4 text-destructive" />,
    label: 'Ошибка при развертывании',
  },
};

export const DeploymentStatus = ({ status, progress, error }: DeploymentStatusProps) => {
  const config = statusConfig[status];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {config.icon}
        <span className="text-sm font-medium">
          {config.label}
        </span>
      </div>

      {status !== 'deployed' && status !== 'error' && status !== 'pending' && (
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