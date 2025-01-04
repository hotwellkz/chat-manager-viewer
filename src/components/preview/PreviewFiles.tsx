import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FilesTable } from "@/integrations/supabase/types/tables";
import { Editor } from "@monaco-editor/react";
import { FileVersion } from "@/integrations/supabase/types/tables";

interface PreviewFilesProps {
  showCode: boolean;
}

export const PreviewFiles = ({ showCode }: PreviewFilesProps) => {
  const [files, setFiles] = useState<FilesTable['Row'][]>([]);
  const [selectedFile, setSelectedFile] = useState<FilesTable['Row'] | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

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
          previous_versions: (file.previous_versions as FileVersion[]) || []
        }));
        setFiles(typedData);
        if (typedData.length > 0) {
          setSelectedFile(typedData[0]);
        }
      }
    } catch (err) {
      console.error('Error in fetchFiles:', err);
    }
  };

  if (!showCode) return null;

  return (
    <div className="h-full">
      {selectedFile ? (
        <Editor
          height="100%"
          defaultLanguage="typescript"
          value={selectedFile.content || '// Нет содержимого'}
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