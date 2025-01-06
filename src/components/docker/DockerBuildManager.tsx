import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DeploymentProgress } from "./DeploymentProgress";
import { DeploymentSteps } from "./DeploymentSteps";
import { PlayCircle, Loader2 } from "lucide-react";
import { Button } from "../ui/button";

const STAGES = {
  idle: { progress: 0, message: 'Готов к сборке' },
  preparing: { progress: 10, message: 'Подготовка к сборке...' },
  packaging: { progress: 30, message: 'Упаковка файлов проекта...' },
  building: { progress: 60, message: 'Сборка Docker образа...' },
  deploying: { progress: 80, message: 'Развертывание контейнера...' },
  completed: { progress: 100, message: 'Сборка завершена успешно!' },
  error: { progress: 0, message: 'Произошла ошибка при сборке' }
};

type BuildStage = keyof typeof STAGES;

export const DockerBuildManager = () => {
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildStage, setBuildStage] = useState<BuildStage>('idle');
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleBuild = async () => {
    try {
      setIsBuilding(true);
      setError(null);
      setBuildStage('preparing');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Пользователь не авторизован');
      }

      // Получаем список файлов из localStorage
      const files = JSON.parse(localStorage.getItem('editorFiles') || '[]');
      
      if (!files.length) {
        throw new Error('Нет файлов для сборки');
      }

      console.log('Начинаем сборку:', {
        filesCount: files.length,
        userId: session.user.id
      });

      // Запускаем процесс сборки
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/deploy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: session.user.id,
          files: files.map(f => ({
            path: f.name,
            content: f.content
          })),
          framework: 'react'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || "Ошибка при запуске сборки");
      }

      const result = await response.json();

      if (result.success) {
        setBuildStage('completed');
        setDeployedUrl(result.deploymentUrl);
        toast({
          title: "Успешно",
          description: "Сборка завершена успешно",
        });
      }
    } catch (error) {
      console.error('Build error:', error);
      setBuildStage('error');
      setError(error.message);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось запустить сборку",
      });
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 flex-1">
        <Button
          onClick={handleBuild}
          disabled={isBuilding}
          variant="ghost"
          className="h-8"
        >
          {isBuilding ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4 mr-2" />
          )}
          {isBuilding ? 'Сборка...' : 'Запустить сборку'}
        </Button>
        <span className="text-sm text-muted-foreground">
          {STAGES[buildStage].message}
        </span>
      </div>
      
      {error && (
        <span className="text-sm text-destructive">
          {error}
        </span>
      )}
    </div>
  );
};