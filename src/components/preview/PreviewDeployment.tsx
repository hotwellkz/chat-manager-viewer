import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DeploymentUrl } from "./deployment/DeploymentUrl";
import { DeploymentStatus } from "./deployment/DeploymentStatus";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ContainerStatus } from "../ContainerStatus";

interface PreviewDeploymentProps {
  onError: (error: string | null) => void;
}

export const PreviewDeployment = ({ onError }: PreviewDeploymentProps) => {
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<'pending' | 'preparing' | 'packaging' | 'building' | 'deploying' | 'deployed' | 'error'>('pending');
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchLatestDeployment();
    let channel: RealtimeChannel | null = null;
    
    const setupChannel = async () => {
      channel = await subscribeToDeploymentUpdates();
    };
    
    setupChannel();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const subscribeToDeploymentUpdates = async (): Promise<RealtimeChannel | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

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
            setDeploymentStatus(status as any);
            setProgress(getProgressForStatus(status));
            
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

    return channel;
  };

  const getProgressForStatus = (status: string): number => {
    const progressMap: Record<string, number> = {
      pending: 0,
      preparing: 20,
      packaging: 40,
      building: 60,
      deploying: 80,
      deployed: 100,
      error: 0,
    };
    return progressMap[status] || 0;
  };

  const fetchLatestDeployment = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No active session found');
        return;
      }

      const { data: deployment, error } = await supabase
        .from('deployed_projects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // Используем maybeSingle вместо single

      if (error) {
        console.error('Error fetching deployment:', error);
        onError('Ошибка при получении данных о развертывании');
        return;
      }

      if (deployment) {
        console.log('Found deployment:', deployment);
        setDeploymentUrl(deployment.project_url);
        setDeploymentStatus(deployment.status as any);
        setProgress(getProgressForStatus(deployment.status));
        
        // Получаем информацию о контейнере только если есть развертывание
        const { data: container, error: containerError } = await supabase
          .from('docker_containers')
          .select('*')
          .eq('project_id', deployment.id)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Также используем maybeSingle здесь

        if (containerError) {
          console.error('Error fetching container:', containerError);
          return;
        }

        if (container) {
          console.log('Found container:', container);
          setContainerId(container.id);
        } else {
          console.log('No container found for deployment');
        }
      } else {
        console.log('No deployments found');
        // Если развертываний нет, устанавливаем начальное состояние
        setDeploymentStatus('pending');
        setProgress(0);
        setDeploymentUrl(null);
        setContainerId(null);
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