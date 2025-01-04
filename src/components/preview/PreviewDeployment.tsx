import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ContainerStatus } from "../ContainerStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Hammer,
  Upload,
  Rocket
} from "lucide-react";

interface PreviewDeploymentProps {
  onError: (error: string | null) => void;
}

type DeploymentStatus = 'pending' | 'preparing' | 'packaging' | 'building' | 'deploying' | 'deployed' | 'error';

interface DeploymentStep {
  status: DeploymentStatus;
  icon: React.ReactNode;
  label: string;
  progress: number;
}

export const PreviewDeployment = ({ onError }: PreviewDeploymentProps) => {
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>('pending');
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const deploymentSteps: Record<DeploymentStatus, DeploymentStep> = {
    pending: {
      status: 'pending',
      icon: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
      label: 'Ожидание начала деплоя...',
      progress: 0
    },
    preparing: {
      status: 'preparing',
      icon: <Package className="h-4 w-4 text-blue-500" />,
      label: 'Подготовка файлов...',
      progress: 20
    },
    packaging: {
      status: 'packaging',
      icon: <Package className="h-4 w-4 text-blue-500 animate-pulse" />,
      label: 'Упаковка проекта...',
      progress: 40
    },
    building: {
      status: 'building',
      icon: <Hammer className="h-4 w-4 text-yellow-500 animate-bounce" />,
      label: 'Сборка проекта...',
      progress: 60
    },
    deploying: {
      status: 'deploying',
      icon: <Upload className="h-4 w-4 text-purple-500 animate-pulse" />,
      label: 'Развертывание...',
      progress: 80
    },
    deployed: {
      status: 'deployed',
      icon: <Rocket className="h-4 w-4 text-green-500" />,
      label: 'Проект успешно развернут',
      progress: 100
    },
    error: {
      status: 'error',
      icon: <AlertCircle className="h-4 w-4 text-destructive" />,
      label: 'Ошибка при развертывании',
      progress: 0
    }
  };

  useEffect(() => {
    fetchLatestDeployment();
    subscribeToDeploymentUpdates();
  }, []);

  const subscribeToDeploymentUpdates = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const channel = supabase
      .channel('deployment-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deployed_projects',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          if (payload.new) {
            const { status, project_url } = payload.new as any;
            setDeploymentStatus(status as DeploymentStatus);
            setProgress(deploymentSteps[status as DeploymentStatus].progress);
            
            if (project_url) {
              setDeploymentUrl(project_url);
            }

            if (status === 'deployed') {
              toast({
                title: "Развертывание завершено",
                description: "Ваш проект успешно развернут",
              });
            } else if (status === 'error') {
              toast({
                variant: "destructive",
                title: "Ошибка развертывания",
                description: "Произошла ошибка при развертывании проекта",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchLatestDeployment = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: deployment, error } = await supabase
        .from('deployed_projects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('last_deployment', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching deployment:', error);
        onError('Ошибка при получении данных о развертывании');
        return;
      }

      if (deployment) {
        setDeploymentUrl(deployment.project_url);
        setDeploymentStatus(deployment.status as DeploymentStatus);
        setProgress(deploymentSteps[deployment.status as DeploymentStatus].progress);
        
        const { data: container, error: containerError } = await supabase
          .from('docker_containers')
          .select('*')
          .eq('project_id', deployment.id)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (containerError) {
          console.error('Error fetching container:', containerError);
          return;
        }

        if (container) {
          setContainerId(container.id);
        }
      }
    } catch (err) {
      console.error('Error in fetchLatestDeployment:', err);
      onError('Произошла ошибка при получении данных о развертывании');
    }
  };

  const currentStep = deploymentSteps[deploymentStatus];

  return (
    <div className="flex flex-col gap-4">
      {deploymentUrl && (
        <a 
          href={deploymentUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
        >
          <Rocket className="h-4 w-4" />
          {deploymentUrl}
        </a>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          {currentStep.icon}
          <span>{currentStep.label}</span>
        </div>

        {deploymentStatus !== 'deployed' && deploymentStatus !== 'error' && (
          <Progress value={progress} className="h-2" />
        )}

        {deploymentStatus === 'error' && (
          <Alert variant="destructive">
            <AlertDescription>
              Произошла ошибка при развертывании проекта. Пожалуйста, попробуйте снова.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {containerId && (
        <ContainerStatus containerId={containerId} />
      )}
    </div>
  );
};