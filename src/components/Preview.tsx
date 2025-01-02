import { Button } from "./ui/button";
import { 
  Maximize2, 
  Smartphone, 
  RefreshCw 
} from "lucide-react";

export const Preview = () => {
  return (
    <div className="h-full flex flex-col border-l border-border">
      <div className="p-2 border-b border-border flex justify-between items-center">
        <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
          preview-url.example.com
        </a>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon">
            <Smartphone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-background">
        {/* Preview content will go here */}
      </div>
    </div>
  );
};