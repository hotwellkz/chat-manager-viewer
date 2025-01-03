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
  const [framework, setFramework] = useState("react");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Пользователь не авторизован");

      // Сохраняем промпт в историю чата
      const { error: chatError } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          prompt: prompt,
          is_ai: false
        });

      if (chatError) throw chatError;

      // Отправляем промпт на бэкенд
      const response = await fetch(`https://backendlovable006.onrender.com/api/prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, framework }),
      });

      if (!response.ok) throw new Error("Ошибка при обработке запроса");
      
      const data = await response.json();

      // Сохраняем ответ ИИ в историю чата
      const { error: aiResponseError } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          prompt: data.response,
          is_ai: true
        });

      if (aiResponseError) throw aiResponseError;

      // Если есть файлы для создания, сохраняем их
      if (data.files && data.files.length > 0) {
        for (const file of data.files) {
          const { error: fileError } = await supabase
            .from('files')
            .insert({
              user_id: user.id,
              filename: file.path.split('/').pop(),
              file_path: file.path,
              content_type: 'text/plain',
              size: file.content.length
            });

          if (fileError) throw fileError;
        }
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
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Введите ваш запрос..."
            className="min-h-[100px] pr-24"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon" disabled={isLoading}>
              <FilePlus className="h-4 w-4" />
            </Button>
            <Button type="submit" variant="ghost" size="icon" disabled={isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex justify-end">
          <ToggleGroup type="single" value={framework} onValueChange={(value) => value && setFramework(value)}>
            <ToggleGroupItem value="nodejs" aria-label="Node.js">
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
