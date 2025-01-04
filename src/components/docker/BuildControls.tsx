import { Button } from "@/components/ui/button";
import { Loader2, PlayCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BuildControlsProps {
  isBuilding: boolean;
  onBuild: () => void;
  metadata?: {
    version: string;
  };
}

export const BuildControls = ({ isBuilding, onBuild, metadata }: BuildControlsProps) => {
  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onBuild}
              disabled={isBuilding}
              size="icon"
              className="h-9 w-9"
            >
              {isBuilding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isBuilding ? 'Идет сборка...' : 'Запустить сборку'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {metadata && (
        <span className="text-sm text-muted-foreground">
          Версия: {metadata.version}
        </span>
      )}
    </div>
  );
};