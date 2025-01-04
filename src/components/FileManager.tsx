import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "./ui/use-toast";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  Download,
  Edit,
  Trash,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FilePackager } from "./FilePackager";

interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  path?: string;
  children?: FileNode[];
}

export const FileManager = () => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [files, setFiles] = useState<FileNode[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Преобразуем плоский список файлов в древовидную структуру
      const fileTree = buildFileTree(data || []);
      setFiles(fileTree);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список файлов",
        variant: "destructive",
      });
    }
  };

  const buildFileTree = (files: any[]): FileNode[] => {
    const tree: Record<string, FileNode> = {};
    const root: FileNode[] = [];

    files.forEach(file => {
      const parts = file.file_path.split('/');
      let currentPath = '';
      
      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!tree[currentPath]) {
          const node: FileNode = {
            id: isLast ? file.id : currentPath,
            name: part,
            type: isLast ? 'file' : 'folder',
            path: isLast ? file.file_path : undefined,
            children: isLast ? undefined : []
          };
          
          tree[currentPath] = node;
          
          if (index === 0) {
            root.push(node);
          } else {
            const parentPath = parts.slice(0, index).join('/');
            tree[parentPath].children?.push(node);
          }
        }
      });
    });

    return root;
  };

  const handleDownload = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('project_files')
        .download(path);

      if (error) throw error;

      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Успех",
        description: "Файл успешно скачан",
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось скачать файл",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string, path: string) => {
    try {
      // Удаляем файл из storage
      const { error: storageError } = await supabase.storage
        .from('project_files')
        .remove([path]);

      if (storageError) throw storageError;

      // Удаляем запись из базы данных
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      toast({
        title: "Успех",
        description: "Файл успешно удален",
      });

      // Обновляем список файлов
      await fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить файл",
        variant: "destructive",
      });
    }
  };

  const toggleFolder = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (node: FileNode, level = 0) => {
    const isExpanded = expanded[node.id];
    const paddingLeft = level * 16;

    return (
      <div key={node.id}>
        <div
          className="flex items-center hover:bg-accent/50 py-1 px-2"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {node.type === "folder" ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4"
              onClick={() => toggleFolder(node.id)}
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
                onClick={() => handleDownload(node.path!)}
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => handleDelete(node.id, node.path!)}
              >
                <Trash className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        {node.type === "folder" && isExpanded && node.children?.map((child) => renderNode(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col border-l border-border">
      <div className="p-2 border-b border-border flex justify-between items-center">
        <h2 className="font-semibold">Файлы</h2>
        <div className="flex gap-2">
          <FilePackager />
          <Button size="icon" variant="ghost">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        {files.map((node) => renderNode(node))}
      </ScrollArea>
    </div>
  );
};
