import { useEffect, useState } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Eye, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: string;
  prompt: string;
  response: string | null;
  timestamp: string;
  is_ai: boolean;
}

export const ChatHistory = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    // Загрузка начальных сообщений
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("chat_history")
        .select("*")
        .order("timestamp", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      if (data) {
        setMessages(data as ChatMessage[]);
      }
    };

    fetchMessages();

    // Подписка на новые сообщения
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_history",
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((currentMessages) => [...currentMessages, newMessage]);
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
              <p>{message.is_ai ? message.response : message.prompt}</p>
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
