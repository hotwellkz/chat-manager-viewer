import { Save } from "lucide-react";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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

      // Сохраняем файлы
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: session.user.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Ошибка при сохранении файлов");
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Успешно",
          description: "Файлы сохранены",
        });

        // Автоматически запускаем развертывание
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
            framework: 'react' // По умолчанию используем React
          }),
        });

        if (!deployResponse.ok) {
          throw new Error("Ошибка при запуске развертывания");
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
        description: error.message || "Произошла ошибка",
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