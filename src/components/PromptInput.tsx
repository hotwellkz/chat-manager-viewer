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

      const response = await fetch("https://backendlovable006.onrender.com/api/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, framework }),
      });

      if (!response.ok) throw new Error("Ошибка при обработке запроса");
      
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

  const handleFileUpload = () => {
    toast({
      title: "Загрузка файлов",
      description: "Функция загрузки файлов будет доступна в ближайшее время",
    });
  };

  return (
    <div className="p-4 border-t">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4">
          <ToggleGroup
            type="single"
            value={framework}
            onValueChange={(value) => value && setFramework(value)}
            className="justify-start"
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
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Введите ваш запрос..."
            className="min-h-[100px] pr-20"
          />
          <div className="absolute bottom-2 right-2 flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleFileUpload}
              className="h-8 w-8"
            >
              <FilePlus className="h-4 w-4" />
            </Button>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              disabled={isLoading}
              className="h-8 w-8"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
