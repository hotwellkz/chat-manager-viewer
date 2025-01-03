import { useState } from "react";
import { Button } from "./ui/button";
import { 
  Maximize2, 
  Smartphone, 
  RefreshCw,
  Code,
  Eye
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Preview = () => {
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const previewUrl = "https://lovable006.netlify.app";
  
  // Получаем последний развернутый проект пользователя
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

  // Получаем файлы проекта
  const { data: files } = useQuery({
    queryKey: ['projectFiles', deployedProject?.id],
    enabled: !!deployedProject,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Пользователь не авторизован");

      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    }
  });

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

  const toggleViewMode = () => {
    setViewMode(prev => prev === "preview" ? "code" : "preview");
  };

  return (
    <div className="h-full flex flex-col border-l border-border">
      <div className="p-2 border-b border-border flex justify-between items-center">
        <a 
          href={previewUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {previewUrl}
        </a>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={toggleViewMode}>
            {viewMode === "preview" ? <Code className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
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
        {viewMode === "preview" ? (
          <iframe 
            src={previewUrl}
            className="w-full h-full border-none"
            title="Preview"
          />
        ) : (
          <div className="h-full">
            {files?.map((file) => (
              <Editor
                key={file.id}
                height="100%"
                defaultLanguage="javascript"
                defaultValue={file.content || "// Loading..."}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
