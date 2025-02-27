import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send } from "lucide-react";
import { saveFilesToDatabase } from "@/utils/fileStorage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PreviewDeployment } from "./preview/PreviewDeployment";

export const PromptInput = () => {
  const [prompt, setPrompt] = useState("");
  const [framework, setFramework] = useState("react");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDeployAfterPrompt = async (files: any[], userId: string, token: string) => {
    try {
      console.log('Начало процесса деплоя:', {
        filesCount: files.length,
        userId
      });

      // Сначала сохраняем файлы
      const savedFiles = await saveFilesToDatabase(files, userId);
      console.log('Файлы успешно сохранены:', savedFiles);

      // Теперь запускаем деплой
      const deployResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/deploy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          files: savedFiles.map(f => ({
            path: f.file_path.split('/').pop() || f.filename,
            content: f.content
          })),
          framework
        }),
      });

      if (!deployResponse.ok) {
        throw new Error("Ошибка при запуске развертывания");
      }

      const deployResult = await deployResponse.json();
      
      if (deployResult.success) {
        toast({
          title: "Успешно!",
          description: "Начинаем создание приложения",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Произошла ошибка при обработке запроса",
        variant: "destructive",
      });
    }
  };

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
    setError(null);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error("Ошибка авторизации");
      
      if (!session) {
        toast({
          title: "Ошибка",
          description: "Необходима авторизация",
          variant: "destructive",
        });
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw new Error("Ошибка получения данных пользователя");

      if (!user) {
        toast({
          title: "Ошибка",
          description: "Пользователь не найден",
          variant: "destructive",
        });
        return;
      }

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
        throw new Error(errorData.error || "Ошибка при обработке запроса");
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error("Неуспешный ответ от сервера");
      }

      // Сначала сохраняем файлы, потом запускаем деплой
      if (data.files && data.files.length > 0) {
        await handleDeployAfterPrompt(data.files, user.id, session.access_token);
      }

      toast({
        title: "Успешно!",
        description: "Начинаем создание приложения",
      });

      setPrompt("");
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "Произошла ошибка при обработке запроса");
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
    <div className="space-y-4">
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
            placeholder="Опишите приложение, которое хотите создать..."
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

      <PreviewDeployment onError={setError} />
    </div>
  );
};
