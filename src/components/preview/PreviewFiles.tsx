import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FilesTable } from "@/integrations/supabase/types/tables";
import { Editor } from "@monaco-editor/react";
import { FileVersion } from "@/integrations/supabase/types/tables";
import { debounce } from "lodash";

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
  const isMountedRef = useRef(true);

  // Используем debounce для предотвращения частых обновлений
  const debouncedSetFiles = useCallback(
    debounce((newFiles: FilesTable['Row'][]) => {
      if (isMountedRef.current) {
        setFiles(newFiles);
      }
    }, 300),
    []
  );

  const fetchFiles = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < 1000) {
      return;
    }
    lastFetchRef.current = now;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !isMountedRef.current) return;

      // Добавляем минимальную задержку для загрузки
      loadingTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setIsLoading(true);
        }
      }, 500);

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

      if (data && isMountedRef.current) {
        const typedData = data.map(file => ({
          ...file,
          previous_versions: (file.previous_versions as unknown as FileVersion[]) || []
        }));
        debouncedSetFiles(typedData);
        console.log('Файлы успешно загружены:', typedData.length);
      }
    } catch (err) {
      console.error('Error in fetchFiles:', err);
    } finally {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [debouncedSetFiles]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (showCode) {
      fetchFiles();
    }

    return () => {
      isMountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      debouncedSetFiles.cancel();
    };
  }, [showCode, fetchFiles, debouncedSetFiles]);

  // Оптимизированная real-time подписка
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
        debounce((payload) => {
          console.log('Получено обновление файлов:', payload);
          if (isMountedRef.current) {
            fetchFiles();
          }
        }, 500)
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
      <div className="flex items-center justify-center h-full bg-background/95">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">Загрузка файлов...</span>
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
            automaticLayout: true,
            renderWhitespace: 'none',
            smoothScrolling: true,
            cursorBlinking: 'smooth'
          }}
          theme="vs-dark"
          loading={<div className="flex items-center justify-center h-full">Загрузка редактора...</div>}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Выберите файл для просмотра
        </div>
      )}
    </div>
  );
};