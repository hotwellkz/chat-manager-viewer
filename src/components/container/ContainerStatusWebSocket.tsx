import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { debounce } from "lodash";

interface ContainerStatusWebSocketProps {
  containerId: string;
  onStatusUpdate: (status: string, url: string | null) => void;
}

export const ContainerStatusWebSocket = ({ 
  containerId, 
  onStatusUpdate 
}: ContainerStatusWebSocketProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isConnectingRef = useRef(false);

  const debouncedStatusUpdate = debounce((status: string, url: string | null) => {
    onStatusUpdate(status, url);
  }, 1000);

  useEffect(() => {
    let isMounted = true;
    
    const setupWebSocket = async () => {
      try {
        if (isConnectingRef.current) {
          console.log('Подключение уже в процессе');
          return;
        }

        if (wsRef.current) {
          console.log('Закрываем предыдущее соединение');
          wsRef.current.close();
          wsRef.current = null;
        }

        isConnectingRef.current = true;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !isMounted) {
          console.error('Нет активной сессии или компонент размонтирован');
          return;
        }

        const wsUrl = `${import.meta.env.VITE_BACKEND_URL.replace('https://', 'wss://')}/api/container-status?jwt=${session.access_token}&containerId=${containerId}`;
        
        console.log('Создание нового WebSocket подключения');
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket подключен');
          isConnectingRef.current = false;
          if (isMounted) {
            toast.success('Подключено к статусу контейнера');
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
              case 'ping':
                ws.send(JSON.stringify({ type: 'pong' }));
                break;
              
              case 'state':
              case 'update':
                if (message.data) {
                  console.log('Получено обновление:', message.data);
                  debouncedStatusUpdate(message.data.status, message.data.container_url);
                  
                  if (message.data.status === 'running' && isMounted) {
                    toast.success('Контейнер успешно запущен!');
                  } else if (message.data.status === 'error' && isMounted) {
                    toast.error('Ошибка при запуске контейнера');
                  }
                }
                break;
              
              case 'error':
                console.error('Ошибка WebSocket:', message.message);
                if (isMounted) {
                  toast.error(message.message || 'Ошибка подключения к статусу контейнера');
                }
                break;
            }
          } catch (error) {
            console.error('Ошибка обработки сообщения:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket ошибка:', error);
          isConnectingRef.current = false;
          if (isMounted) {
            toast.error('Ошибка подключения к статусу контейнера');
          }
        };

        ws.onclose = () => {
          console.log('WebSocket закрыт');
          isConnectingRef.current = false;
          wsRef.current = null;

          // Пробуем переподключиться только если компонент все еще смонтирован
          if (isMounted && !reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = undefined;
              setupWebSocket();
            }, 5000);
          }
        };

      } catch (error) {
        console.error('Ошибка настройки WebSocket:', error);
        isConnectingRef.current = false;
        if (isMounted) {
          toast.error('Не удалось подключиться к статусу контейнера');
        }
      }
    };

    setupWebSocket();

    return () => {
      isMounted = false;
      debouncedStatusUpdate.cancel();
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        console.log('Закрытие WebSocket соединения при размонтировании');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [containerId]);

  return null;
};