import { Button } from "./ui/button";
import { 
  Maximize2, 
  Smartphone, 
  RefreshCw,
  Code,
  Eye
} from "lucide-react";
import { FilesTable } from "@/integrations/supabase/types/tables";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Editor } from "@monaco-editor/react";
import { ContainerStatus } from "./ContainerStatus";

export const Preview = () => {
  const [showCode, setShowCode] = useState(false);
  const [files, setFiles] = useState<FilesTable['Row'][]>([]);
  const [selectedFile, setSelectedFile] = useState<FilesTable['Row'] | null>(null);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  
  useEffect(() => {
    fetchFiles();
    fetchLatestDeployment();
  }, []);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });
      
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
    } catch (err) {
      console.error('Error in fetchFiles:', err);
    }
  };

  const fetchLatestDeployment = async () => {
    try {
      const { data: deployment, error } = await supabase
        .from('deployed_projects')
        .select('*')
        .order('last_deployment', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching deployment:', error);
        setError('Ошибка при получении данных о развертывании');
        return;
      }

      if (deployment) {
        setDeploymentUrl(deployment.project_url);
        
        // Получаем связанный контейнер
        const { data: container, error: containerError } = await supabase
          .from('docker_containers')
          .select('*')
          .eq('project_id', deployment.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (containerError) {
          console.error('Error fetching container:', containerError);
          return;
        }

        if (container) {
          setContainerId(container.id);
        }
      } else {
        setDeploymentUrl(null);
        setContainerId(null);
      }
    } catch (err) {
      console.error('Error in fetchLatestDeployment:', err);
      setError('Произошла ошибка при получении данных о развертывании');
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
            <>
              <a 
                href={deploymentUrl || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {deploymentUrl || 'Ожидание развертывания...'}
              </a>
              {containerId && (
                <ContainerStatus containerId={containerId} />
              )}
            </>
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
        {showCode ? (
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
        ) : (
          <iframe 
            src={deploymentUrl || 'about:blank'}
            className="w-full h-full border-none"
            title="Preview"
          />
        )}
      </div>
    </div>
  );
};