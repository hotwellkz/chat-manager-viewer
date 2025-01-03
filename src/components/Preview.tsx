import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { 
  Maximize2, 
  Smartphone, 
  RefreshCw,
  Code,
  Play
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Preview = () => {
  const [showCode, setShowCode] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [files, setFiles] = useState([]);

  const { data: deployedProject } = useQuery({
    queryKey: ['deployedProject'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Пользователь не авторизован");

      const { data, error } = await supabase
        .from('deployed_projects')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    }
  });

  const { data: projectFiles } = useQuery({
    queryKey: ['projectFiles'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Пользователь не авторизован");

      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!deployedProject
  });

  useEffect(() => {
    if (projectFiles?.length > 0) {
      setFiles(projectFiles);
      setSelectedFile(projectFiles[0]);
    }
  }, [projectFiles]);

  const handleRefresh = () => {
    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  const handleMobileView = () => {
    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.style.width = '375px';
    }
  };

  const handleFullscreen = () => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.requestFullscreen) {
      iframe.requestFullscreen();
    }
  };

  const toggleView = () => {
    setShowCode(!showCode);
  };

  return (
    <div className="h-full flex flex-col border-l border-border">
      <div className="p-2 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleView}>
            {showCode ? <Play className="h-4 w-4" /> : <Code className="h-4 w-4" />}
          </Button>
          {showCode && (
            <select
              className="border rounded px-2 py-1"
              value={selectedFile?.id}
              onChange={(e) => {
                const file = files.find(f => f.id === e.target.value);
                setSelectedFile(file);
              }}
            >
              {files.map(file => (
                <option key={file.id} value={file.id}>
                  {file.filename}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleMobileView}>
            <Smartphone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-background">
        {showCode ? (
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={selectedFile?.content || '// Выберите файл для просмотра'}
            options={{
              readOnly: true,
              minimap: { enabled: false }
            }}
          />
        ) : (
          <iframe 
            src={deployedProject?.project_url || 'about:blank'}
            className="w-full h-full border-none"
            title="Preview"
          />
        )}
      </div>
    </div>
  );
};
