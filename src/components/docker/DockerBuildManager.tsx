import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BuildControls } from "./BuildControls";
import { BuildStatus } from "./BuildStatus";
import { DeploymentLink } from "./DeploymentLink";

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
        <BuildControls 
          isBuilding={isBuilding}
          onBuild={handleBuild}
          metadata={metadata}
        />
        <DeploymentLink url={deployedUrl} />
      </div>
      
      <BuildStatus 
        stage={buildStatus.stage}
        message={buildStatus.message}
        progress={buildStatus.progress}
        isBuilding={isBuilding}
      />
    </Card>
  );
};