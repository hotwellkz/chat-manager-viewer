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
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Ошибка",
          description: "Пользователь не авторизован",
          variant: "destructive",
        });
        return;
      }

      // Сохраняем промт в chat_history
      const { error: chatError } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          prompt: prompt,
          is_ai: false
        });

      if (chatError) throw chatError;

      // Формируем расширенный промт в зависимости от фреймворка
      let frameworkInstructions = "";
      switch (framework) {
        case "react":
          frameworkInstructions = "Создай полноценное React приложение с использованием следующих технологий: React Router для маршрутизации, Tailwind CSS для стилей, TypeScript для типизации. Структура должна включать компоненты, хуки, утилиты и страницы. ";
          break;
        case "node":
          frameworkInstructions = "Создай полноценное Node.js приложение с использованием Express.js для сервера, MongoDB/Mongoose для базы данных, JWT для аутентификации. Структура должна включать роуты, контроллеры, модели и middleware. ";
          break;
        case "vue":
          frameworkInstructions = "Создай полноценное Vue.js приложение с использованием Vue Router для маршрутизации, Vuex для управления состоянием, TypeScript для типизации. Структура должна включать компоненты, хранилище, миксины и страницы. ";
          break;
      }

      const enhancedPrompt = `${frameworkInstructions}${prompt}`;

      // Отправляем запрос на бэкенд
      const response = await fetch('https://backendlovable006.onrender.com/api/prompt', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        credentials: 'include',
        body: JSON.stringify({ 
          prompt: enhancedPrompt,
          userId: user.id,
          framework
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Ошибка при обработке запроса");
      }
      
      const data = await response.json();

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
