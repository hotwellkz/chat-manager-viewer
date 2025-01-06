import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { ContainerMetrics } from "@/components/ContainerMetrics";
import { ContainerMetricsChart } from "@/components/ContainerMetricsChart";
import { ContainerStatusBadge } from "@/components/container/ContainerStatusBadge";
import { ContainerActions } from "@/components/container/ContainerActions";
import { ContainerStatusWebSocket } from "@/components/container/ContainerStatusWebSocket";
import { useQuery } from "@tanstack/react-query";

interface ContainerStatusProps {
  containerId: string;
}

export const ContainerStatus = ({ containerId }: ContainerStatusProps) => {
  const [status, setStatus] = useState<string>("pending");
  const [url, setUrl] = useState<string | null>(null);

  const { isLoading } = useQuery({
    queryKey: ['container-initial-status', containerId],
    queryFn: async () => {
      const { data: container, error } = await supabase
        .from('docker_containers')
        .select('*')
        .eq('id', containerId)
        .single();

      if (error) throw error;

      if (container) {
        setStatus(container.status);
        setUrl(container.container_url);
      }
      return container;
    }
  });

  const handleStatusUpdate = (newStatus: string, newUrl: string | null) => {
    setStatus(newStatus);
    setUrl(newUrl);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Загрузка статуса...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <ContainerStatusBadge status={status} />
        <ContainerActions 
          containerId={containerId} 
          status={status} 
          url={url} 
        />
      </div>
      
      <ContainerStatusWebSocket
        containerId={containerId}
        onStatusUpdate={handleStatusUpdate}
      />
      
      {status === 'running' && (
        <>
          <ContainerMetrics containerId={containerId} />
          <ContainerMetricsChart containerId={containerId} />
        </>
      )}
    </div>
  );
};