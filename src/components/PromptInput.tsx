import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Send, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = "https://your-render-url.onrender.com"; // Замените на ваш URL после деплоя

export const PromptInput = () => {
  const [prompt, setPrompt] = useState("");
  const [framework, setFramework] = useState<"nodejs" | "react" | "vue">("react");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    try {
      // Сначала пробуем обновить существующие файлы
      const updateResponse = await fetch(`${API_URL}/api/update-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!updateResponse.ok) {
        // Если нет существующих файлов или произошла ошибка, 
        // используем стандартный endpoint для создания новых файлов
        const response = await fetch(`${API_URL}/api/prompt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            prompt,
            framework 
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to process prompt');
        }

        const { files, description } = await response.json();

        if (files && files.length > 0) {
          const filesResponse = await fetch(`${API_URL}/api/files`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ files }),
          });

          if (!filesResponse.ok) {
            throw new Error('Failed to save files');
          }
        }
      } else {
        const result = await updateResponse.json();
        if (result.description) {
          toast({
            title: "Успех",
            description: result.description,
          });
        }
      }

      setPrompt("");
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обработать промт",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border-t border-border">
      <div className="flex gap-2 mb-2">
        {["nodejs", "react", "vue"].map((fw) => (
          <Button
            key={fw}
            variant={framework === fw ? "default" : "outline"}
            size="sm"
            onClick={() => setFramework(fw as typeof framework)}
          >
            {fw}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Введите ваш промт..."
          className="min-h-[40px] resize-none"
        />
        <div className="flex flex-col gap-2">
          <Button size="icon" variant="ghost">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            onClick={handleSubmit}
            disabled={isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};