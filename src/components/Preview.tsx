import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { 
  Maximize2, 
  Smartphone, 
  RefreshCw,
  Code,
  Eye,
  AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PreviewFiles } from "./preview/PreviewFiles";
import { PreviewDeployment } from "./preview/PreviewDeployment";
import { FileChangeTracker } from "./FileChangeTracker";
import { Alert, AlertDescription } from "./ui/alert";

export const Preview = () => {
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    checkAuth();
    
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

  const checkUrlAvailability = async (url: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(url, {
        mode: 'no-cors',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      // Даже если response.ok === false, но ответ получен - URL доступен
      return true;
    } catch (error) {
      console.error('Error checking URL availability:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.src) {
      const isAvailable = await checkUrlAvailability(iframe.src);
      if (isAvailable) {
        iframe.src = iframe.src;
      } else {
        setError('Приложение временно недоступно. Попробуйте обновить позже.');
        toast.error('Не удалось загрузить приложение');
      }
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

  const handleIframeError = () => {
    setError('Не удалось загрузить приложение. Пожалуйста, проверьте соединение или попробуйте позже.');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-border flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col gap-2">
          {error ? (
            <Alert variant="destructive" className="w-auto">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <PreviewFiles 
          showCode={showCode} 
          selectedFilePath={selectedFilePath}
          selectedFileContent={selectedFileContent}
        />
        {!showCode && (
          <div className="w-full h-full relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">Загрузка приложения...</span>
                </div>
              </div>
            )}
            <iframe 
              src={error ? 'about:blank' : undefined}
              className="w-full h-full border-none"
              title="Preview"
              onError={handleIframeError}
            />
          </div>
        )}
      </div>
      <FileChangeTracker />
    </div>
  );
};