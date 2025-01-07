import { ChevronRight, ChevronDown, File, Folder, Download, Trash } from "lucide-react";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "../ui/use-toast";

interface FileNodeProps {
  node: {
    id: string;
    name: string;
    type: "file" | "folder";
    path?: string;
    children?: any[];
  };
  level?: number;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onDownload: (path: string) => void;
  onDelete: (id: string, path: string) => void;
}

export const FileNode = ({ 
  node, 
  level = 0, 
  expanded, 
  onToggle, 
  onDownload, 
  onDelete 
}: FileNodeProps) => {
  const { toast } = useToast();
  const isExpanded = expanded[node.id];
  const paddingLeft = level * 16;

  const handleFileClick = async () => {
    if (node.type === 'file' && node.path) {
      try {
        const { data: fileData, error } = await supabase
          .from('files')
          .select('content')
          .eq('file_path', node.path)
          .single();

        if (error) {
          console.error('Error fetching file content:', error);
          return;
        }

        // Отправляем событие для обновления кода в Preview
        const event = new CustomEvent('showFileContent', { 
          detail: { 
            content: fileData.content,
            path: node.path 
          } 
        });
        window.dispatchEvent(event);
      } catch (err) {
        console.error('Error in handleFileClick:', err);
      }
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'file' && node.path) {
      try {
        // Получаем содержимое файла из базы данных
        const { data: fileData, error: fileError } = await supabase
          .from('files')
          .select('content')
          .eq('file_path', node.path)
          .single();

        if (fileError) {
          throw fileError;
        }

        // Создаем blob из содержимого
        const blob = new Blob([fileData.content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        
        // Создаем временную ссылку для скачивания
        const a = document.createElement('a');
        a.href = url;
        a.download = node.name;
        document.body.appendChild(a);
        a.click();
        
        // Очищаем
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Успешно",
          description: `Файл ${node.name} скачан`,
        });
      } catch (error) {
        console.error('Error downloading file:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось скачать файл",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div key={node.id}>
      <div
        className={`flex items-center hover:bg-accent/50 py-1 px-2 ${node.type === 'file' ? 'cursor-pointer' : ''}`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={node.type === 'file' ? handleFileClick : undefined}
      >
        {node.type === "folder" ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <span className="w-4" />
        )}
        {node.type === "folder" ? (
          <Folder className="h-4 w-4 mr-2" />
        ) : (
          <File className="h-4 w-4 mr-2" />
        )}
        <span className="flex-1">{node.name}</span>
        {node.type === "file" && node.path && (
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={handleDownload}
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id, node.path!);
              }}
            >
              <Trash className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      {node.type === "folder" && isExpanded && node.children?.map((child) => (
        <FileNode
          key={child.id}
          node={child}
          level={level + 1}
          expanded={expanded}
          onToggle={onToggle}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};