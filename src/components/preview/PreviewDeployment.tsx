import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ContainerStatus } from "../ContainerStatus";

interface PreviewDeploymentProps {
  onError: (error: string | null) => void;
}

export const PreviewDeployment = ({ onError }: PreviewDeploymentProps) => {
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestDeployment();
  }, []);

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
      } else {
        setDeploymentUrl(null);
        setContainerId(null);
      }
    } catch (err) {
      console.error('Error in fetchLatestDeployment:', err);
      onError('Произошла ошибка при получении данных о развертывании');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <a 
        href={deploymentUrl || '#'} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        {deploymentUrl || 'Ожидание развертывания...'}
      </a>
      {containerId && (
        <ContainerStatus containerId={containerId} />
      )}
    </div>
  );
};