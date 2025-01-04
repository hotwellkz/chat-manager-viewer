import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ContainerStatus } from "../ContainerStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface PreviewDeploymentProps {
  onError: (error: string | null) => void;
}

export const PreviewDeployment = ({ onError }: PreviewDeploymentProps) => {
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<string>('pending');
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchLatestDeployment();
    subscribeToDeploymentUpdates();
  }, []);

  const getProgressByStatus = (status: string): number => {
    switch (status) {
      case 'packaging': return 25;
      case 'building': return 50;
      case 'deploying': return 75;
      case 'deployed': return 100;
      case 'error': return 0;
      default: return 0;
    }
  };

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
            setDeploymentStatus(status);
            setProgress(getProgressByStatus(status));
            if (project_url) setDeploymentUrl(project_url);

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
        setDeploymentStatus(deployment.status);
        setProgress(getProgressByStatus(deployment.status));
        
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

  const getStatusIcon = () => {
    switch (deploymentStatus) {
      case 'deployed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
      case 'packaging':
      case 'building':
      case 'deploying':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (deploymentStatus) {
      case 'pending': return 'Ожидание развертывания...';
      case 'packaging': return 'Подготовка файлов...';
      case 'building': return 'Сборка проекта...';
      case 'deploying': return 'Развертывание...';
      case 'deployed': return 'Проект успешно развернут';
      case 'error': return 'Ошибка при развертывании';
      default: return 'Неизвестный статус';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {deploymentUrl && (
        <a 
          href={deploymentUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
        >
          {getStatusIcon()}
          {deploymentUrl}
        </a>
      )}

      {deploymentStatus !== 'deployed' && deploymentStatus !== 'error' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {getStatusIcon()}
            <span>{getStatusMessage()}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {deploymentStatus === 'error' && (
        <Alert variant="destructive">
          <AlertDescription>
            Произошла ошибка при развертывании проекта. Пожалуйста, попробуйте снова.
          </AlertDescription>
        </Alert>
      )}

      {containerId && (
        <ContainerStatus containerId={containerId} />
      )}
    </div>
  );
};