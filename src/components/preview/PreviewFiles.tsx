import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FilesTable } from "@/integrations/supabase/types/tables";
import { Editor } from "@monaco-editor/react";
import { FileVersion } from "@/integrations/supabase/types/tables";

interface PreviewFilesProps {
  showCode: boolean;
  selectedFilePath?: string | null;
  selectedFileContent?: string | null;
}

export const PreviewFiles = ({ 
  showCode, 
  selectedFilePath, 
  selectedFileContent 
}: PreviewFilesProps) => {
  const [files, setFiles] = useState<FilesTable['Row'][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastFetchRef = useRef<number>(0);

  const fetchFiles = useCallback(async () => {
    const now = Date.now();
    // Предотвращаем слишком частые запросы (минимум 1 секунда между запросами)
    if (now - lastFetchRef.current < 1000) {
      return;
    }
    lastFetchRef.current = now;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Устанавливаем задержку для показа загрузки
      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(true);
      }, 300);

      console.log('Загрузка файлов...');

      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching files:', error);
        return;
      }

      if (data) {
        const typedData = data.map(file => ({
          ...file,
          previous_versions: (file.previous_versions as unknown as FileVersion[]) || []
        }));
        setFiles(typedData);
        console.log('Файлы успешно загружены:', typedData.length);
      }
    } catch (err) {
      console.error('Error in fetchFiles:', err);
    } finally {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showCode) {
      fetchFiles();
    }
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [showCode, fetchFiles]);

  // Настраиваем real-time подписку на изменения файлов
  useEffect(() => {
    if (!showCode) return;

    const channel = supabase
      .channel('files_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files'
        },
        (payload) => {
          console.log('Получено обновление файлов:', payload);
          fetchFiles();
        }
      )
      .subscribe((status) => {
        console.log('Статус подписки на файлы:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showCode, fetchFiles]);

  const getFileLanguage = (filePath: string | null) => {
    if (!filePath) return 'typescript';
    if (filePath.endsWith('.css')) return 'css';
    if (filePath.endsWith('.html')) return 'html';
    if (filePath.endsWith('.json')) return 'json';
    return 'typescript';
  };

  if (!showCode) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span>Загрузка файлов...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {selectedFileContent ? (
        <Editor
          height="100%"
          defaultLanguage={getFileLanguage(selectedFilePath)}
          value={selectedFileContent}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true
          }}
          theme="vs-dark"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Выберите файл для просмотра
        </div>
      )}
    </div>
  );
};