import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ContainerStatus } from "../ContainerStatus";
import { useToast } from "@/hooks/use-toast";
import { DeploymentUrl } from "./deployment/DeploymentUrl";
import { DeploymentStatus, type DeploymentStatus as TDeploymentStatus } from "./deployment/DeploymentStatus";

interface PreviewDeploymentProps {
  onError: (error: string | null) => void;
}

const progressMap: Record<TDeploymentStatus, number> = {
  pending: 0,
  preparing: 20,
  packaging: 40,
  building: 60,
  deploying: 80,
  deployed: 100,
  error: 0,
};

export const PreviewDeployment = ({ onError }: PreviewDeploymentProps) => {
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<TDeploymentStatus>('pending');
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchLatestDeployment();
    const unsubscribe = subscribeToDeploymentUpdates();
    return () => {
      unsubscribe();
    };
  }, []);

  const subscribeToDeploymentUpdates = () => {
    const handleDeploymentUpdate = async () => {
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
              setDeploymentStatus(status as TDeploymentStatus);
              setProgress(progressMap[status as TDeploymentStatus]);
              
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

    return handleDeploymentUpdate();
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
        setDeploymentStatus(deployment.status as TDeploymentStatus);
        setProgress(progressMap[deployment.status as TDeploymentStatus]);
        
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

  return (
    <div className="flex flex-col gap-4">
      <DeploymentUrl url={deploymentUrl} />
      
      <div className="space-y-4">
        <DeploymentStatus 
          status={deploymentStatus} 
          progress={progress}
          error={null}
        />
      </div>

      {containerId && (
        <ContainerStatus containerId={containerId} />
      )}
    </div>
  );
};