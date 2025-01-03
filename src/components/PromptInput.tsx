import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const PromptInput = () => {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Пользователь не авторизован");

      const response = await fetch('https://backendlovable006.onrender.com/api/prompt', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt,
          userId: user.id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка при обработке запроса");
      }
      
      const data = await response.json();

      // Сохраняем сообщение в историю чата
      await supabase
        .from('chat_history')
        .insert([
          {
            user_id: user.id,
            prompt: prompt,
            response: JSON.stringify(data),
            is_ai: false
          }
        ]);

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
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Введите ваш запрос..."
          className="min-h-[100px]"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Обработка..." : "Отправить"}
          </Button>
        </div>
      </form>
    </div>
  );
};
