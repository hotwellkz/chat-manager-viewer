import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package2, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Progress } from "../ui/progress";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

interface BuildMetadata {
  version: string;
  containerId: string;
  lastModified: string;
}

interface BuildStatus {
  stage: 'idle' | 'preparing' | 'packaging' | 'building' | 'deploying' | 'completed' | 'error';
  message: string;
  progress: number;
}

const STAGES = {
  idle: { progress: 0, message: 'Готов к сборке' },
  preparing: { progress: 10, message: 'Подготовка к сборке...' },
  packaging: { progress: 30, message: 'Упаковка файлов проекта...' },
  building: { progress: 60, message: 'Сборка Docker образа...' },
  deploying: { progress: 80, message: 'Развертывание контейнера...' },
  completed: { progress: 100, message: 'Сборка завершена успешно!' },
  error: { progress: 0, message: 'Произошла ошибка при сборке' }
};

export const DockerBuildManager = () => {
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>({ 
    stage: 'idle', 
    message: STAGES.idle.message,
    progress: STAGES.idle.progress 
  });
  const [metadata, setMetadata] = useState<BuildMetadata | null>(null);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const updateBuildStatus = (stage: BuildStatus['stage']) => {
    const stageInfo = STAGES[stage];
    setBuildStatus({
      stage,
      message: stageInfo.message,
      progress: stageInfo.progress
    });
  };

  const handleBuild = async () => {
    try {
      setIsBuilding(true);
      updateBuildStatus('preparing');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      updateBuildStatus('packaging');
      const response = await supabase.functions.invoke('prepare-deployment', {
        body: { userId: user.id }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Ошибка при подготовке деплоя');
      }

      setMetadata(response.data.metadata);
      updateBuildStatus('building');
      
      toast({
        title: "Сборка запущена",
        description: "Началась сборка Docker образа",
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
            updateBuildStatus('packaging');
            break;
          case 'building':
            updateBuildStatus('building');
            break;
          case 'deploying':
            updateBuildStatus('deploying');
            break;
          case 'deployed':
            clearInterval(checkBuildStatus);
            updateBuildStatus('completed');
            setDeployedUrl(deployData.project_url);
            setIsBuilding(false);
            toast({
              title: "Готово",
              description: `Docker образ успешно собран и развернут`,
            });
            break;
          case 'error':
            clearInterval(checkBuildStatus);
            throw new Error('Ошибка при сборке образа');
        }
      }, 5000);

    } catch (error) {
      console.error('Build error:', error);
      updateBuildStatus('error');
      setIsBuilding(false);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось запустить сборку Docker образа",
      });
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
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

        {deployedUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(deployedUrl, '_blank')}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Открыть проект
          </Button>
        )}
      </div>
      
      {buildStatus.stage !== 'idle' && (
        <div className="space-y-2">
          <Alert variant={buildStatus.stage === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>
              {buildStatus.message}
            </AlertDescription>
          </Alert>
          
          {isBuilding && (
            <Progress value={buildStatus.progress} className="h-2" />
          )}
        </div>
      )}
    </Card>
  );
};