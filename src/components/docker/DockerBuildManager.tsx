import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BuildControls } from "./BuildControls";
import { DeploymentLink } from "./DeploymentLink";
import { DeploymentProgress } from "./DeploymentProgress";
import { DeploymentSteps } from "./DeploymentSteps";

interface BuildMetadata {
  version: string;
  containerId: string;
  lastModified: string;
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

type BuildStage = keyof typeof STAGES;

export const DockerBuildManager = () => {
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildStage, setBuildStage] = useState<BuildStage>('idle');
  const [metadata, setMetadata] = useState<BuildMetadata | null>(null);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getDeploymentSteps = () => {
    const stages: BuildStage[] = ['preparing', 'packaging', 'building', 'deploying'];
    return stages.map(stage => ({
      label: STAGES[stage].message,
      status: buildStage === stage 
        ? 'in-progress'
        : stages.indexOf(stage) < stages.indexOf(buildStage as BuildStage)
          ? 'completed'
          : buildStage === 'error'
            ? 'error'
            : 'pending'
    }));
  };

  const handleBuild = async () => {
    try {
      setIsBuilding(true);
      setError(null);
      setBuildStage('preparing');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      setBuildStage('packaging');
      const response = await supabase.functions.invoke('prepare-deployment', {
        body: { userId: user.id }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Ошибка при подготовке деплоя');
      }

      setMetadata(response.data.metadata);
      setBuildStage('building');
      
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
            setBuildStage('packaging');
            break;
          case 'building':
            setBuildStage('building');
            break;
          case 'deploying':
            setBuildStage('deploying');
            break;
          case 'deployed':
            clearInterval(checkBuildStatus);
            setBuildStage('completed');
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
      setBuildStage('error');
      setError(error.message);
      setIsBuilding(false);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось запустить сборку Docker образа",
      });
    }
  };

  return (
    <Card className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <BuildControls 
          isBuilding={isBuilding}
          onBuild={handleBuild}
          metadata={metadata}
        />
        <DeploymentLink url={deployedUrl} />
      </div>
      
      <DeploymentProgress 
        stage={buildStage}
        message={STAGES[buildStage].message}
        progress={STAGES[buildStage].progress}
        error={error}
      />

      {isBuilding && (
        <DeploymentSteps steps={getDeploymentSteps()} />
      )}
    </Card>
  );
};