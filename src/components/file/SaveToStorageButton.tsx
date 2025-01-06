import { Save } from "lucide-react";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const SaveToStorageButton = () => {
  const { toast } = useToast();

  const handleSaveToStorage = async () => {
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

      console.log('Начало сохранения файлов:', {
        filesCount: files.length,
        userId: session.user.id
      });

      // Сначала сохраняем файлы в Storage
      for (const file of files) {
        const filePath = `${session.user.id}/${file.name}`;
        const fileContent = new TextEncoder().encode(file.content);

        console.log(`Сохранение файла ${file.name} в Storage...`);
        
        const { error: uploadError } = await supabase.storage
          .from('project_files')
          .upload(filePath, fileContent, {
            contentType: 'text/plain',
            upsert: true
          });

        if (uploadError) {
          console.error('Ошибка загрузки файла в Storage:', uploadError);
          throw uploadError;
        }
      }

      // Затем сохраняем метаданные в базу данных
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/files`, {
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
          }))
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || "Ошибка при сохранении файлов");
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Успешно",
          description: "Файлы сохранены",
        });

        // Запускаем процесс развертывания
        const deployResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/deploy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            userId: session.user.id,
            files: result.files,
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
      onClick={handleSaveToStorage}
      title="Сохранить и развернуть"
    >
      <Save className="h-4 w-4" />
    </Button>
  );
};
