import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PromptInput = () => {
  const [prompt, setPrompt] = useState("");
  const [framework, setFramework] = useState("react");
  const [isLoading, setIsLoading] = useState(false);
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Ошибка получения сессии:", sessionError);
        throw new Error("Ошибка авторизации");
      }
      
      if (!session) {
        toast({
          title: "Ошибка",
          description: "Необходима авторизация",
          variant: "destructive",
        });
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Ошибка получения пользователя:", userError);
        throw new Error("Ошибка получения данных пользователя");
      }

      if (!user) {
        toast({
          title: "Ошибка",
          description: "Пользователь не найден",
          variant: "destructive",
        });
        return;
      }

      // Сохраняем промт в историю чата
      const { error: chatError } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          prompt: prompt,
          is_ai: false
        });

      if (chatError) {
        console.error("Ошибка при сохранении в chat_history:", chatError);
        throw new Error("Ошибка сохранения запроса");
      }

      console.log("Отправляем запрос:", {
        prompt,
        userId: user.id,
        framework
      });

      // Отправляем запрос на бэкенд
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ 
          prompt,
          userId: user.id,
          framework
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Ошибка от сервера:", errorData);
        throw new Error(errorData.error || "Ошибка при обработке запроса");
      }
      
      const data = await response.json();
      console.log("Получен ответ:", data);

      if (!data.success) {
        throw new Error("Неуспешный ответ от сервера");
      }

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
        <div className="flex items-center gap-4">
          <Select
            value={framework}
            onValueChange={setFramework}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Выберите фреймворк" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="react">React</SelectItem>
              <SelectItem value="node">Node.js</SelectItem>
              <SelectItem value="vue">Vue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Введите ваш запрос..."
            className="min-h-[100px] pr-12"
          />
          <Button 
            type="submit" 
            disabled={isLoading}
            size="icon"
            className="absolute bottom-2 right-2"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};
