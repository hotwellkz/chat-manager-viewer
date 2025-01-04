import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ContainerActionsProps {
  containerId: string;
  status: string;
  url: string | null;
}

export const ContainerActions = ({ containerId, status, url }: ContainerActionsProps) => {
  const handleDelete = async () => {
    try {
      const response = await fetch(`https://backendlovable006.onrender.com/api/containers/${containerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка при удалении контейнера');
      }

      toast.success('Контейнер успешно удаляется');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка при удалении контейнера');
    }
  };

  return (
    <>
      {status === 'running' && (
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Удалить
        </Button>
      )}
      
      {url && status === 'running' && (
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:underline"
        >
          Открыть приложение
        </a>
      )}
    </>
  );
};