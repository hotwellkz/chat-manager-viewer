import { useEffect, useState } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Eye, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";

interface ChatMessage {
  id: string;
  prompt: string;
  timestamp: string;
  is_ai: boolean;
}

export const ChatHistory = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    const channel = setupRealtimeSubscription();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('Загрузка сообщений для пользователя:', user.id);

      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Ошибка при загрузке сообщений:', error);
        throw error;
      }

      console.log('Получено сообщений:', data?.length);
      setMessages(data || []);
    } catch (error) {
      console.error('Ошибка при загрузке сообщений:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить историю чата",
        variant: "destructive",
      });
    }
  };

  const setupRealtimeSubscription = () => {
    console.log('Настройка real-time подписки для чата');
    
    const channel = supabase
      .channel('chat_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_history'
        },
        (payload) => {
          console.log('Получено новое сообщение:', payload);
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe((status) => {
        console.log('Статус подписки:', status);
      });

    return channel;
  };

  const regenerateResponse = async (messageId: string) => {
    // Здесь будет логика регенерации ответа
    console.log('Regenerating response for:', messageId);
  };

  const viewFiles = async (messageId: string) => {
    // Здесь будет логика просмотра файлов
    console.log('Viewing files for:', messageId);
  };

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex flex-col ${
              message.is_ai ? "items-start" : "items-end"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.is_ai
                  ? "bg-accent text-accent-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <p>{message.prompt}</p>
              <div className="text-xs mt-2 opacity-70">
                {new Date(message.timestamp).toLocaleString()}
              </div>
            </div>
            {message.is_ai && (
              <div className="flex gap-2 mt-1">
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => regenerateResponse(message.id)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => viewFiles(message.id)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};