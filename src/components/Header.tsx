import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Eye, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  isAI: boolean;
}

export const ChatHistory = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const fetchChatHistory = async () => {
      const { data: chatHistory, error } = await supabase
        .from('chat_history')
        .select('*')
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching chat history:', error);
        return;
      }

      const formattedMessages = chatHistory.map((msg) => ({
        id: msg.id,
        content: msg.is_ai ? msg.response : msg.prompt,
        timestamp: new Date(msg.timestamp).toLocaleString(),
        isAI: msg.is_ai,
      }));

      setMessages(formattedMessages);
    };

    fetchChatHistory();

    // Подписка на изменения в таблице chat_history
    const subscription = supabase
      .channel('chat_history_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_history',
        },
        (payload) => {
          fetchChatHistory(); // Обновляем историю при любых изменениях
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex flex-col ${
              message.isAI ? "items-start" : "items-end"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.isAI
                  ? "bg-accent text-accent-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <p>{message.content}</p>
              <div className="text-xs mt-2 opacity-70">{message.timestamp}</div>
            </div>
            {message.isAI && (
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
