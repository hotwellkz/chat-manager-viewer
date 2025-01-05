import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const SaveToStorageButton = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSaveToStorage = async () => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      const { data: files } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id);

      if (!files || files.length === 0) {
        throw new Error('Нет файлов для сохранения');
      }

      const response = await fetch('https://backendlovable006.onrender.com/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files,
          userId: user.id
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка при сохранении файлов');
      }

      toast({
        title: "Успешно",
        description: "Файлы сохранены в Storage",
      });

    } catch (error) {
      console.error('Save error:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message || "Не удалось сохранить файлы",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSaveToStorage}
            disabled={isSaving}
            className="h-8 w-8"
          >
            <Save className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Сохранить в Storage</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};