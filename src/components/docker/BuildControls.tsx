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

      // Проверяем существующие проекты пользователя
      const { data: existingProjects, error: projectError } = await supabase
        .from('deployed_projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'preparing')
        .order('created_at', { ascending: false })
        .limit(1);

      if (projectError) {
        console.error('Error checking existing projects:', projectError);
        throw new Error('Ошибка при проверке существующих проектов');
      }

      let projectId;

      if (existingProjects && existingProjects.length > 0) {
        // Обновляем существующий проект
        const { data: updatedProject, error: updateError } = await supabase
          .from('deployed_projects')
          .update({
            framework: framework,
            status: 'preparing',
            last_deployment: new Date().toISOString()
          })
          .eq('id', existingProjects[0].id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating project:', updateError);
          throw new Error('Ошибка при обновлении проекта');
        }

        projectId = updatedProject.id;
        console.log('Updated existing project:', projectId);
      } else {
        // Создаем новый проект
        const { data: newProject, error: createError } = await supabase
          .from('deployed_projects')
          .insert({
            user_id: user.id,
            framework: framework,
            status: 'preparing'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating project:', createError);
          throw new Error('Ошибка при создании проекта');
        }

        projectId = newProject.id;
        console.log('Created new project:', projectId);
      }

      // Запускаем процесс подготовки к развертыванию
      const { data: prepData, error: prepError } = await supabase.functions.invoke('prepare-deployment', {
        body: { userId: user.id }
      });

      if (prepError || !prepData?.success) {
        console.error('Preparation error:', prepError || prepData?.error);
        throw new Error(prepData?.error || 'Ошибка при подготовке деплоя');
      }

      toast({
        title: "Успешно",
        description: "Начато развертывание проекта",
      });
      
      onBuild();

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