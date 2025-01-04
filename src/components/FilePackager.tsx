import { useState } from "react";
import { Button } from "./ui/button";
import { Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const FilePackager = () => {
  const [isPackaging, setIsPackaging] = useState(false);
  const { toast } = useToast();

  const handlePackageFiles = async () => {
    try {
      setIsPackaging(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await supabase.functions.invoke('package-files', {
        body: { userId: user.id }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Ошибка при упаковке файлов');
      }

      // Получаем URL для скачивания
      const downloadUrl = response.data.downloadUrl;

      toast({
        title: "Успешно",
        description: "Файлы упакованы в ZIP архив",
      });

      // Создаем ссылку для скачивания
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `project-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Package error:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось упаковать файлы",
      });
    } finally {
      setIsPackaging(false);
    }
  };

  return (
    <Button
      onClick={handlePackageFiles}
      disabled={isPackaging}
      className="flex items-center gap-2"
    >
      <Archive className="h-4 w-4" />
      {isPackaging ? 'Упаковка...' : 'Упаковать в ZIP'}
    </Button>
  );
};