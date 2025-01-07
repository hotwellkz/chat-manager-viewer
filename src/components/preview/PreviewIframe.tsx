import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PreviewIframeProps {
  isLoading: boolean;
  error: string | null;
  deploymentUrl: string | null;
  onError: () => void;
}

export const PreviewIframe = ({
  isLoading,
  error,
  deploymentUrl,
  onError,
}: PreviewIframeProps) => {
  return (
    <div className="w-full h-full relative">
      {error && (
        <Alert variant="destructive" className="absolute top-4 left-4 right-4 z-20">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Загрузка приложения...</span>
          </div>
        </div>
      )}
      
      <iframe 
        src={deploymentUrl || 'about:blank'}
        className="w-full h-full border-none"
        title="Preview"
        onError={onError}
      />
    </div>
  );
};