import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, FilePlus } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const PromptInput = () => {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [framework, setFramework] = useState("react"); // react по умолчанию
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите текст запроса",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Пользователь не авторизован");

      // Сначала сохраняем сообщение пользователя в chat_history
      const { error: chatError } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          prompt: prompt.trim(),
          is_ai: false
        });

      if (chatError) throw chatError;

      // Отправляем запрос на бэкенд
      const response = await fetch(`https://backendlovable006.onrender.com/api/prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          framework 
        }),
      });

      if (!response.ok) throw new Error("Ошибка при обработке запроса");
      
      const data = await response.json();

      // Сохраняем ответ ИИ в chat_history
      const { error: aiChatError } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          prompt: data.description || "Получен ответ от ИИ",
          is_ai: true,
          response: JSON.stringify(data)
        });

      if (aiChatError) throw aiChatError;

      toast({
        title: "Успешно!",
        description: "Запрос обработан",
      });

      setPrompt("");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Произошла ошибка при обработке запроса",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border-t">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Введите ваш запрос..."
            className="min-h-[100px] pr-24"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <Button 
              type="button" 
              size="icon" 
              variant="ghost"
              disabled={isLoading}
            >
              <FilePlus className="h-4 w-4" />
            </Button>
            <Button 
              type="submit" 
              size="icon"
              disabled={isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <ToggleGroup 
            type="single" 
            value={framework}
            onValueChange={(value) => {
              if (value) setFramework(value);
            }}
          >
            <ToggleGroupItem value="node" aria-label="Node.js">
              Node.js
            </ToggleGroupItem>
            <ToggleGroupItem value="react" aria-label="React">
              React
            </ToggleGroupItem>
            <ToggleGroupItem value="vue" aria-label="Vue">
              Vue
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </form>
    </div>
  );
};
