import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DeploymentLinkProps {
  url: string | null;
}

export const DeploymentLink = ({ url }: DeploymentLinkProps) => {
  if (!url) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => window.open(url, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Открыть проект</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};