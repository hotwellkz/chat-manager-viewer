import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContainerStatusWebSocketProps {
  containerId: string;
  onStatusUpdate: (status: string, url: string | null) => void;
}

export const ContainerStatusWebSocket = ({ containerId, onStatusUpdate }: ContainerStatusWebSocketProps) => {
  useEffect(() => {
    let ws: WebSocket | null = null;
    
    const setupWebSocket = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error('Нет активной сессии');
          return;
        }

        // Формируем корректный URL для WebSocket
        const wsUrl = `${import.meta.env.VITE_BACKEND_URL.replace('https://', 'wss://')}/api/container-status?jwt=${session.access_token}&containerId=${containerId}`;
        
        console.log('Подключение к WebSocket:', wsUrl);
        
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket подключен');
          toast.success('Подключено к статусу контейнера');
        };

        ws.onmessage = (event) => {
          try {
            const update = JSON.parse(event.data);
            console.log('Получено обновление:', update);
            
            if (update.new && update.new.id === containerId) {
              onStatusUpdate(update.new.status, update.new.container_url);
              
              if (update.new.status === 'running') {
                toast.success('Контейнер успешно запущен!');
              } else if (update.new.status === 'error') {
                toast.error('Ошибка при запуске контейнера');
              }
            }
          } catch (error) {
            console.error('Ошибка обработки сообщения:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket ошибка:', error);
          toast.error('Ошибка подключения к статусу контейнера');
        };

        ws.onclose = () => {
          console.log('WebSocket закрыт');
          // Пробуем переподключиться через 5 секунд
          setTimeout(setupWebSocket, 5000);
        };

      } catch (error) {
        console.error('Ошибка настройки WebSocket:', error);
        toast.error('Не удалось подключиться к статусу контейнера');
      }
    };

    setupWebSocket();

    return () => {
      if (ws) {
        console.log('Закрытие WebSocket соединения');
        ws.close();
      }
    };
  }, [containerId, onStatusUpdate]);

  return null;
};
