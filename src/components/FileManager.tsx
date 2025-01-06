import { useState, useEffect } from "react";
import { useToast } from "./ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileToolbar } from "./file/FileToolbar";
import { FileTree } from "./file/FileTree";

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
    setupRealtimeSubscription();
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

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('files_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files'
        },
        async (payload) => {
          console.log('Получено обновление файлов:', payload);
          await fetchFiles(); // Перезагружаем все файлы для обновления дерева
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      const { error: storageError } = await supabase.storage
        .from('project_files')
        .remove([path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      toast({
        title: "Успех",
        description: "Файл успешно удален",
      });

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

  return (
    <div className="h-full flex flex-col border-l border-border">
      <FileToolbar />
      <FileTree
        files={files}
        expanded={expanded}
        onToggle={toggleFolder}
        onDownload={handleDownload}
        onDelete={handleDelete}
      />
    </div>
  );
};
