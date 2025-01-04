import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ContainerMetrics } from "./ContainerMetrics";
import { ContainerMetricsChart } from "./ContainerMetricsChart";
import { useQuery } from "@tanstack/react-query";

interface ContainerStatusProps {
  containerId: string;
}

export const ContainerStatus = ({ containerId }: ContainerStatusProps) => {
  const [status, setStatus] = useState<string>("pending");
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error('No session found');
          return;
        }

        const wsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/container-status?jwt=${session.access_token}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket connected');
        };

        ws.onmessage = (event) => {
          const update = JSON.parse(event.data);
          if (update.new && update.new.id === containerId) {
            setStatus(update.new.status);
            setUrl(update.new.container_url);
            
            if (update.new.status === 'running') {
              toast.success('Контейнер успешно запущен!');
            } else if (update.new.status === 'error') {
              toast.error('Ошибка при запуске контейнера');
            } else if (update.new.status === 'warning') {
              toast.warning('Высокая нагрузка на контейнер');
            }
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          toast.error('Ошибка подключения к WebSocket');
        };

        return () => {
          ws.close();
        };
      } catch (error) {
        console.error('Error setting up WebSocket:', error);
        toast.error('Ошибка при настройке WebSocket');
      }
    };

    const fetchInitialStatus = async () => {
      try {
        const { data: container, error } = await supabase
          .from('docker_containers')
          .select('*')
          .eq('id', containerId)
          .single();

        if (error) {
          console.error('Ошибка при получении статуса:', error);
          toast.error('Ошибка при получении статуса контейнера');
          return;
        }

        if (container) {
          setStatus(container.status);
          setUrl(container.container_url);
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Ошибка при получении статуса контейнера');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialStatus();
    const cleanup = setupWebSocket();

    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [containerId]);

  const handleDelete = async () => {
    try {
      const response = await fetch(`https://backendlovable006.onrender.com/api/containers/${containerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка при удалении контейнера');
      }

      toast.success('Контейнер успешно удаляется');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка при удалении контейнера');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'creating':
      case 'starting':
        return 'bg-yellow-500';
      case 'warning':
        return 'bg-orange-500';
      case 'stopping':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return 'Запущен';
      case 'creating':
        return 'Создается';
      case 'starting':
        return 'Запускается';
      case 'error':
        return 'Ошибка';
      case 'stopping':
        return 'Останавливается';
      case 'initializing':
        return 'Инициализация';
      default:
        return 'Ожидание';
    }
  };

  if (loading) {
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
        <Badge className={getStatusColor(status)}>
          {getStatusText(status)}
        </Badge>
        
        {status === 'running' && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Удалить
          </Button>
        )}
        
        {url && status === 'running' && (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:underline"
          >
            Открыть приложение
          </a>
        )}
      </div>
      
      {status === 'running' && (
        <>
          <ContainerMetrics containerId={containerId} />
          <ContainerMetricsChart containerId={containerId} />
        </>
      )}
    </div>
  );
};