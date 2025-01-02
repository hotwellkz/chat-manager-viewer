import { Button } from "./ui/button";
import { 
  Maximize2, 
  Smartphone, 
  RefreshCw 
} from "lucide-react";

export const Preview = () => {
  const previewUrl = "https://lovable006.netlify.app";
  
  const handleRefresh = () => {
    // Найти iframe и обновить его
    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  const handleMobileView = () => {
    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.style.width = '375px'; // стандартная ширина мобильного устройства
    }
  };

  const handleFullscreen = () => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.requestFullscreen) {
      iframe.requestFullscreen();
    }
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
        <iframe 
          src={previewUrl}
          className="w-full h-full border-none"
          title="Preview"
        />
      </div>
    </div>
  );
};