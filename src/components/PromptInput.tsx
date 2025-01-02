import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Send, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const PromptInput = () => {
  const [prompt, setPrompt] = useState("");
  const [framework, setFramework] = useState<"nodejs" | "react" | "vue">("react");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Ошибка",
          description: "Необходимо войти в систему",
          variant: "destructive",
        });
        return;
      }

      // Отправляем промт на обработку
      const response = await fetch('/functions/v1/process-prompt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
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

      const { response: aiResponse } = await response.json();

      // Если есть файлы для сохранения, отправляем их
      if (aiResponse.files && aiResponse.files.length > 0) {
        const filesResponse = await fetch('/functions/v1/handle-files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ files: aiResponse.files }),
        });

        if (!filesResponse.ok) {
          throw new Error('Failed to save files');
        }
      }

      toast({
        title: "Успех",
        description: "Промт успешно обработан",
      });

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