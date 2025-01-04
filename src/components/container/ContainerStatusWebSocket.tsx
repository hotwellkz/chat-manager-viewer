import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContainerStatusWebSocketProps {
  containerId: string;
  onStatusUpdate: (status: string, url: string | null) => void;
}

export const ContainerStatusWebSocket = ({ containerId, onStatusUpdate }: ContainerStatusWebSocketProps) => {
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
            onStatusUpdate(update.new.status, update.new.container_url);
            
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

    const cleanup = setupWebSocket();
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [containerId, onStatusUpdate]);

  return null;
};