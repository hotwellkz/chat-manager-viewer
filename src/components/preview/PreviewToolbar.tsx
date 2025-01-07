import { Button } from "@/components/ui/button";
import { 
  Maximize2, 
  Smartphone, 
  RefreshCw,
  Code,
  Eye,
} from "lucide-react";

interface PreviewToolbarProps {
  showCode: boolean;
  isLoading: boolean;
  onToggleView: () => void;
  onMobileView: () => void;
  onRefresh: () => void;
  onFullscreen: () => void;
}

export const PreviewToolbar = ({
  showCode,
  isLoading,
  onToggleView,
  onMobileView,
  onRefresh,
  onFullscreen,
}: PreviewToolbarProps) => {
  return (
    <div className="flex gap-2">
      <Button variant="ghost" size="icon" onClick={onToggleView}>
        {showCode ? <Eye className="h-4 w-4" /> : <Code className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={onMobileView}>
        <Smartphone className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onRefresh}>
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      </Button>
      <Button variant="ghost" size="icon" onClick={onFullscreen}>
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );
};