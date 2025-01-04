import { useState } from "react";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";

export const DockerBuildManager = () => {
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildStatus, setBuildStatus] = useState<string | null>(null);
  const { toast } = useToast();

  const handleBuild = async () => {
    try {
      setIsBuilding(true);
      setBuildStatus("Подготовка к сборке...");
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      setBuildStatus("Инициализация сборки...");
      const response = await supabase.functions.invoke('prepare-deployment', {
        body: { userId: user.id }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Ошибка при подготовке деплоя');
      }

      setBuildStatus("Сборка Docker образа...");
      
      // Получаем метаданные проекта
      const { metadata } = response.data;
      
      toast({
        title: "Успешно",
        description: "Сборка Docker образа запущена",
      });

      // Проверяем статус сборки каждые 5 секунд
      const checkBuildStatus = setInterval(async () => {
        const { data: deployData, error: deployError } = await supabase
          .from('deployed_projects')
          .select('status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (deployError) {
          clearInterval(checkBuildStatus);
          throw deployError;
        }

        if (deployData.status === 'deployed') {
          clearInterval(checkBuildStatus);
          setBuildStatus("Сборка завершена успешно!");
          setIsBuilding(false);
          toast({
            title: "Готово",
            description: "Docker образ успешно собран",
          });
        } else if (deployData.status === 'error') {
          clearInterval(checkBuildStatus);
          throw new Error('Ошибка при сборке образа');
        }
      }, 5000);

    } catch (error) {
      console.error('Build error:', error);
      setBuildStatus("Произошла ошибка при сборке");
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
    <div className="flex flex-col gap-2">
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
      
      {buildStatus && (
        <Alert>
          <AlertDescription>
            {buildStatus}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};