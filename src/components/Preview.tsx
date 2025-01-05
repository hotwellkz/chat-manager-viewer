import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { 
  Maximize2, 
  Smartphone, 
  RefreshCw,
  Code,
  Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PreviewFiles } from "./preview/PreviewFiles";
import { PreviewDeployment } from "./preview/PreviewDeployment";
import { FileChangeTracker } from "./FileChangeTracker";

export const Preview = () => {
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    checkAuth();
    
    // Добавляем слушатель события для отображения содержимого файла
    const handleShowFileContent = (event: CustomEvent<{ content: string, path: string }>) => {
      setSelectedFileContent(event.detail.content);
      setSelectedFilePath(event.detail.path);
      setShowCode(true);
    };

    window.addEventListener('showFileContent', handleShowFileContent as EventListener);

    return () => {
      window.removeEventListener('showFileContent', handleShowFileContent as EventListener);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Необходима авторизация');
      navigate('/login');
      return;
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
        <div className="flex flex-col gap-2">
          {error ? (
            <span className="text-sm text-red-500">{error}</span>
          ) : (
            <PreviewDeployment onError={setError} />
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={toggleView}>
            {showCode ? <Eye className="h-4 w-4" /> : <Code className="h-4 w-4" />}
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
        <PreviewFiles 
          showCode={showCode} 
          selectedFilePath={selectedFilePath}
          selectedFileContent={selectedFileContent}
        />
        {!showCode && (
          <iframe 
            src={error ? 'about:blank' : undefined}
            className="w-full h-full border-none"
            title="Preview"
          />
        )}
      </div>
      <FileChangeTracker />
    </div>
  );
};