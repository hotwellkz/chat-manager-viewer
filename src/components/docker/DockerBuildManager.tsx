import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Progress } from "../ui/progress";

interface BuildMetadata {
  version: string;
  containerId: string;
  lastModified: string;
}

export const DockerBuildManager = () => {
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildStatus, setBuildStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [metadata, setMetadata] = useState<BuildMetadata | null>(null);
  const { toast } = useToast();

  const handleBuild = async () => {
    try {
      setIsBuilding(true);
      setProgress(10);
      setBuildStatus("Подготовка к сборке...");
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      setProgress(25);
      setBuildStatus("Инициализация сборки...");
      const response = await supabase.functions.invoke('prepare-deployment', {
        body: { userId: user.id }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Ошибка при подготовке деплоя');
      }

      setProgress(40);
      setBuildStatus("Сборка Docker образа...");
      
      // Сохраняем метаданные проекта
      setMetadata(response.data.metadata);
      
      toast({
        title: "Успешно",
        description: "Сборка Docker образа запущена",
      });

      // Проверяем статус сборки каждые 5 секунд
      const checkBuildStatus = setInterval(async () => {
        const { data: deployData, error: deployError } = await supabase
          .from('deployed_projects')
          .select('status, project_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (deployError) {
          clearInterval(checkBuildStatus);
          throw deployError;
        }

        switch (deployData.status) {
          case 'packaging':
            setProgress(60);
            setBuildStatus("Упаковка файлов проекта...");
            break;
          case 'building':
            setProgress(75);
            setBuildStatus("Сборка Docker образа...");
            break;
          case 'deploying':
            setProgress(90);
            setBuildStatus("Развертывание контейнера...");
            break;
          case 'deployed':
            clearInterval(checkBuildStatus);
            setProgress(100);
            setBuildStatus("Сборка завершена успешно!");
            setIsBuilding(false);
            toast({
              title: "Готово",
              description: `Docker образ успешно собран и развернут по адресу: ${deployData.project_url}`,
            });
            break;
          case 'error':
            clearInterval(checkBuildStatus);
            throw new Error('Ошибка при сборке образа');
        }
      }, 5000);

    } catch (error) {
      console.error('Build error:', error);
      setBuildStatus("Произошла ошибка при сборке");
      setProgress(0);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось запустить сборку Docker образа",
      });
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <Button
          onClick={handleBuild}
          disabled={isBuilding}
          className="flex items-center gap-2"
        >
          {isBuilding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Package2 className="h-4 w-4" />
          )}
          {isBuilding ? 'Сборка...' : 'Собрать образ'}
        </Button>
        
        {metadata && (
          <span className="text-sm text-muted-foreground">
            Версия: {metadata.version}
          </span>
        )}
      </div>
      
      {buildStatus && (
        <div className="space-y-2">
          <Alert>
            <AlertDescription>
              {buildStatus}
            </AlertDescription>
          </Alert>
          
          {isBuilding && (
            <Progress value={progress} className="h-2" />
          )}
        </div>
      )}
    </div>
  );
};