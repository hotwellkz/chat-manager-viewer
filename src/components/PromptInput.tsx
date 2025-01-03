import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const PromptInput = () => {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [framework, setFramework] = useState("");
  const { toast } = useToast();

  const getFrameworkPrompt = (userPrompt, selectedFramework) => {
    const frameworkInstructions = {
      React: `Создай полноценное React приложение со следующими требованиями:
      1. Используй современные практики React разработки
      2. Добавь необходимые зависимости и конфигурационные файлы
      3. Структурируй код по компонентам
      4. Добавь базовую маршрутизацию
      5. Используй TypeScript
      6. Добавь стилизацию через CSS модули или Tailwind
      7. Реализуй следующую функциональность: ${userPrompt}`,

      "Node.js": `Создай полноценное Node.js приложение со следующими требованиями:
      1. Используй Express.js для создания сервера
      2. Добавь необходимые middleware и конфигурационные файлы
      3. Структурируй код по MVC паттерну
      4. Добавь обработку ошибок и логирование
      5. Настрой работу с базой данных
      6. Добавь базовую аутентификацию
      7. Реализуй следующую функциональность: ${userPrompt}`,

      Vue: `Создай полноценное Vue.js приложение со следующими требованиями:
      1. Используй Vue 3 Composition API
      2. Добавь необходимые зависимости и конфигурационные файлы
      3. Структурируй код по компонентам
      4. Добавь Vue Router для маршрутизации
      5. Используй TypeScript
      6. Добавь Pinia для управления состоянием
      7. Реализуй следующую функциональность: ${userPrompt}`
    };

    return frameworkInstructions[selectedFramework] || userPrompt;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Пользователь не авторизован");

      const finalPrompt = getFrameworkPrompt(prompt, framework);

      // Сохраняем промпт в chat_history
      const { error: chatError } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          prompt: prompt,
          is_ai: false
        });

      if (chatError) throw chatError;

      // Отправляем промпт на бэкенд
      const response = await fetch("https://backendlovable006.onrender.com/api/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          userId: user.id,
          framework
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка при обработке запроса");
      }

      const data = await response.json();

      // Сохраняем ответ ИИ в chat_history
      const { error: aiResponseError } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          prompt: data.description,
          is_ai: true
        });

      if (aiResponseError) throw aiResponseError;

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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      toast({
        title: "Файл выбран",
        description: `Выбран файл: ${file.name}`,
      });
    }
  };

  return (
    <div className="p-4 border-t">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4 items-center mb-4">
          <Select value={framework} onValueChange={setFramework}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Выберите фреймворк" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="React">React</SelectItem>
              <SelectItem value="Node.js">Node.js</SelectItem>
              <SelectItem value="Vue">Vue</SelectItem>
            </SelectContent>
          </Select>
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
            <Paperclip className="h-5 w-5 text-gray-500 hover:text-gray-700" />
          </label>
        </div>
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Введите ваш запрос..."
            className="min-h-[100px] pr-12"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="absolute right-3 bottom-3 p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
