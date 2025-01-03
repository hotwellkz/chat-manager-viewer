import { useEffect, useState } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Eye, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  is_ai: boolean;
}

export const ChatHistory = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    // Загрузка начальных сообщений
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .order('timestamp', { ascending: true });

      if (!error && data) {
        const formattedMessages = data.map(msg => ({
          id: msg.id,
          content: msg.prompt || msg.response || '',
          timestamp: new Date(msg.timestamp).toLocaleString(),
          is_ai: msg.is_ai || false
        }));
        setMessages(formattedMessages);
      }
    };

    fetchMessages();

    // Подписка на изменения в реальном времени
    const channel = supabase
      .channel('chat_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_history'
        },
        () => {
          fetchMessages(); // Обновляем сообщения при любых изменениях
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
              <p>{message.content}</p>
              <div className="text-xs mt-2 opacity-70">{message.timestamp}</div>
            </div>
            {message.is_ai && (
              <div className="flex gap-2 mt-1">
                <Button size="icon" variant="ghost">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost">
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
