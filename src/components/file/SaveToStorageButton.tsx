import { Save } from "lucide-react";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { saveFilesToDatabase } from "@/utils/fileStorage";

export const SaveToStorageButton = () => {
  const { toast } = useToast();

  const handleSaveAndDeploy = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Ошибка",
          description: "Необходима авторизация",
          variant: "destructive",
        });
        return;
      }

      // Получаем список файлов из localStorage
      const files = JSON.parse(localStorage.getItem('editorFiles') || '[]');
      
      if (!files.length) {
        toast({
          title: "Ошибка",
          description: "Нет файлов для сохранения",
          variant: "destructive",
        });
        return;
      }

      console.log('Начало процесса сохранения и деплоя:', {
        filesCount: files.length,
        userId: session.user.id
      });

      // Сначала сохраняем файлы в базу данных
      const savedFiles = await saveFilesToDatabase(files, session.user.id);
      console.log('Файлы успешно сохранены:', savedFiles);

      // Теперь запускаем процесс развертывания
      const deployResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/deploy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: session.user.id,
          files: savedFiles.map(f => ({
            path: f.file_path.split('/').pop() || f.filename,
            content: f.content
          })),
          framework: 'react'
        }),
      });

      if (!deployResponse.ok) {
        const deployError = await deployResponse.json();
        throw new Error(deployError.details || deployError.error || "Ошибка при запуске развертывания");
      }

      const deployResult = await deployResponse.json();

      if (deployResult.success) {
        toast({
          title: "Развертывание запущено",
          description: "Начинаем создание Docker контейнера",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Произошла ошибка при сохранении",
        variant: "destructive",
      });
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={handleSaveAndDeploy}
      title="Сохранить и развернуть"
    >
      <Save className="h-4 w-4" />
    </Button>
  );
};