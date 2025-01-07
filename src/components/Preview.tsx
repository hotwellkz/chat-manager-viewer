import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PreviewFiles } from "./preview/PreviewFiles";
import { PreviewDeployment } from "./preview/PreviewDeployment";
import { FileChangeTracker } from "./FileChangeTracker";
import { PreviewToolbar } from "./preview/PreviewToolbar";
import { PreviewIframe } from "./preview/PreviewIframe";

export const Preview = () => {
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    checkAuth();
    setupDeploymentListener();
    
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

  const setupDeploymentListener = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const channel = supabase
      .channel('deployment-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deployed_projects',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('Получено обновление развертывания:', payload);
          
          if (payload.new) {
            const { status, project_url } = payload.new as any;
            
            if (status === 'deployed' && project_url) {
              setDeploymentUrl(`${import.meta.env.VITE_BACKEND_URL}${project_url}`);
              setIsLoading(false);
              toast.success('Приложение успешно развернуто!');
            } else if (status === 'error') {
              setError('Произошла ошибка при развертывании');
              setIsLoading(false);
              toast.error('Ошибка при развертывании');
            } else {
              setIsLoading(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Необходима авторизация');
      navigate('/login');
    }
  };

  const checkUrlAvailability = async (url: string) => {
    try {
      setIsLoading(true);
      await fetch(url, { mode: 'no-cors' });
      return true;
    } catch (error) {
      console.error('Error checking URL availability:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    if (deploymentUrl) {
      const isAvailable = await checkUrlAvailability(deploymentUrl);
      if (!isAvailable) {
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

  const handleIframeError = () => {
    setError('Не удалось загрузить приложение. Пожалуйста, проверьте соединение или попробуйте позже.');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-border flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <PreviewDeployment onError={setError} />
        <PreviewToolbar 
          showCode={showCode}
          isLoading={isLoading}
          onToggleView={() => setShowCode(!showCode)}
          onMobileView={handleMobileView}
          onRefresh={handleRefresh}
          onFullscreen={handleFullscreen}
        />
      </div>
      
      <div className="flex-1 overflow-hidden">
        <PreviewFiles 
          showCode={showCode} 
          selectedFilePath={selectedFilePath}
          selectedFileContent={selectedFileContent}
        />
        
        {!showCode && (
          <PreviewIframe
            isLoading={isLoading}
            error={error}
            deploymentUrl={deploymentUrl}
            onError={handleIframeError}
          />
        )}
      </div>
      
      <FileChangeTracker />
    </div>
  );
};