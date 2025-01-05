import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (showCode) {
      fetchFiles();
    }
  }, [showCode]);

  const fetchFiles = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

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
      }
    } catch (err) {
      console.error('Error in fetchFiles:', err);
    }
  };

  if (!showCode) return null;

  const getFileLanguage = (filePath: string | null) => {
    if (!filePath) return 'typescript';
    if (filePath.endsWith('.css')) return 'css';
    if (filePath.endsWith('.html')) return 'html';
    if (filePath.endsWith('.json')) return 'json';
    return 'typescript';
  };

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
          }}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Выберите файл для просмотра
        </div>
      )}
    </div>
  );
};