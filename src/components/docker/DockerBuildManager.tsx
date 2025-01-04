import { useState } from "react";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package2, Loader2 } from "lucide-react";

export const DockerBuildManager = () => {
  const [isBuilding, setIsBuilding] = useState(false);
  const { toast } = useToast();

  const handleBuild = async () => {
    try {
      setIsBuilding(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await supabase.functions.invoke('prepare-deployment', {
        body: { userId: user.id }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Ошибка при подготовке деплоя');
      }

      toast({
        title: "Успешно",
        description: "Сборка Docker образа запущена",
      });

    } catch (error) {
      console.error('Build error:', error);
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
  );
};