import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ContainerMetrics } from "./ContainerMetrics";

interface ContainerStatusProps {
  containerId: string;
}

export const ContainerStatus = ({ containerId }: ContainerStatusProps) => {
  const [status, setStatus] = useState<string>("pending");
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Получаем начальный статус
    const fetchStatus = async () => {
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

    fetchStatus();

    // Подписываемся на обновления статуса
    const channel = supabase
      .channel('container-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'docker_containers',
          filter: `id=eq.${containerId}`
        },
        (payload) => {
          console.log('Получено обновление статуса:', payload);
          if (payload.new) {
            setStatus(payload.new.status);
            setUrl(payload.new.container_url);
            
            if (payload.new.status === 'running') {
              toast.success('Контейнер успешно запущен!');
            } else if (payload.new.status === 'error') {
              toast.error('Ошибка при запуске контейнера');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [containerId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'creating':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
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
      <div className="flex items-center gap-2">
        <Badge className={getStatusColor(status)}>
          {status === 'running' && 'Запущен'}
          {status === 'creating' && 'Создается'}
          {status === 'error' && 'Ошибка'}
          {status === 'pending' && 'Ожидание'}
        </Badge>
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
        <ContainerMetrics containerId={containerId} />
      )}
    </div>
  );
};