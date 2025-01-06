import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BuildControlsProps {
  isBuilding: boolean;
  onBuild: () => void;
  metadata?: {
    version: string;
  };
}

export const BuildControls = ({ isBuilding, onBuild, metadata }: BuildControlsProps) => {
  const { toast } = useToast();

  const handleBuild = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Ошибка",
          description: "Необходима авторизация",
          variant: "destructive",
        });
        return;
      }

      // Получаем список файлов пользователя
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id);

      if (filesError) {
        console.error('Error fetching files:', filesError);
        toast({
          title: "Ошибка",
          description: "Не удалось получить список файлов",
          variant: "destructive",
        });
        return;
      }

      if (!files || files.length === 0) {
        toast({
          title: "Ошибка",
          description: "Нет файлов для сборки",
          variant: "destructive",
        });
        return;
      }

      // Определяем фреймворк на основе package.json
      const packageJson = files.find(f => f.file_path.includes('package.json'));
      const framework = packageJson?.content?.includes('react') ? 'react' : 'node';

      // Запускаем процесс развертывания
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/deploy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: user.id,
          files: files,
          framework: framework
        }),
      });

      if (!response.ok) {
        throw new Error("Ошибка при запуске развертывания");
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Успешно",
          description: "Начато развертывание проекта",
        });
        
        onBuild();
      }

    } catch (error) {
      console.error('Build error:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Произошла ошибка при сборке",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleBuild}
              disabled={isBuilding}
              size="icon"
              className="h-9 w-9"
            >
              {isBuilding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isBuilding ? 'Идет сборка...' : 'Запустить сборку'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {metadata && (
        <span className="text-sm text-muted-foreground">
          Версия: {metadata.version}
        </span>
      )}
    </div>
  );
};