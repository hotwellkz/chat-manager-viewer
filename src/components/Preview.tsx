import { Button } from "./ui/button";
import { 
  Maximize2, 
  Smartphone, 
  RefreshCw 
} from "lucide-react";
import { FilesTable } from "@/integrations/supabase/types/tables";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Editor } from "@monaco-editor/react";

export const Preview = () => {
  const previewUrl = "https://lovable006.netlify.app";
  const [showCode, setShowCode] = useState(false);
  const [files, setFiles] = useState<FilesTable[]>([]);
  const [selectedFile, setSelectedFile] = useState<FilesTable | null>(null);
  
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from('files')
      .select('*');
    
    if (error) {
      console.error('Error fetching files:', error);
      return;
    }

    if (data) {
      setFiles(data);
      if (data.length > 0) {
        setSelectedFile(data[0]);
      }
    }
  };
  
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
        <a 
          href={previewUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {previewUrl}
        </a>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={toggleView}>
            {showCode ? 'Preview' : 'Code'}
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
        {showCode ? (
          selectedFile && (
            <Editor
              height="100%"
              defaultLanguage="typescript"
              defaultValue={selectedFile.content || '// No content'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
              }}
            />
          )
        ) : (
          <iframe 
            src={previewUrl}
            className="w-full h-full border-none"
            title="Preview"
          />
        )}
      </div>
    </div>
  );
};
