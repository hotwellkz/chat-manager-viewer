import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const DeployButton = () => {
  const [isDeploying, setIsDeploying] = useState(false);
  const { toast } = useToast();

  const handleVercelDeploy = async () => {
    try {
      setIsDeploying(true);
      
      // Получаем текущего пользователя
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error(userError?.message || "Необходима авторизация");
      }

      console.log('Starting deployment for user:', user.id);

      // Получаем файлы пользователя
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id);

      if (filesError) {
        console.error('Error fetching files:', filesError);
        throw new Error(filesError.message || "Ошибка при получении файлов");
      }

      if (!files || files.length === 0) {
        throw new Error("Нет файлов для деплоя. Создайте хотя бы один файл.");
      }

      console.log('Files ready for deployment:', files.length);

      // Определяем фреймворк на основе package.json или используем react по умолчанию
      let framework = 'react';
      const packageJson = files.find(f => f.filename === 'package.json');
      if (packageJson?.content) {
        try {
          const pkg = JSON.parse(packageJson.content);
          if (pkg.dependencies?.vue) framework = 'vue';
          else if (pkg.dependencies?.['@nestjs/core']) framework = 'node';
        } catch (e) {
          console.warn('Error parsing package.json:', e);
        }
      }

      console.log('Deploying with framework:', framework);

      // Форматируем файлы для отправки
      const formattedFiles = files
        .filter(f => f.content && f.filename) // Фильтруем файлы без контента или имени
        .map(f => ({
          path: f.filename, // Используем filename вместо file_path
          content: f.content || '' // Убеждаемся, что content не undefined
        }));

      // Отправляем запрос на деплой
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          files: formattedFiles,
          framework: framework,
          platform: 'vercel'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Ошибка при деплое');
      }

      toast({
        title: "Успешно",
        description: "Проект отправлен на деплой в Vercel",
      });

      // Открываем Vercel в новой вкладке если есть URL
      if (result.deploymentUrl) {
        window.open(result.deploymentUrl, '_blank');
      }

    } catch (error) {
      console.error('Deploy error:', error);
      toast({
        variant: "destructive",
        title: "Ошибка деплоя",
        description: error.message || "Не удалось выполнить деплой на Vercel",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleVercelDeploy}
            disabled={isDeploying}
            className="hover:bg-accent"
          >
            <Rocket className={`h-5 w-5 ${isDeploying ? 'animate-pulse' : ''}`} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Деплой на Vercel</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};