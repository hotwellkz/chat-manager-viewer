import { Rocket } from "lucide-react";

interface DeploymentUrlProps {
  url: string | null;
}

export const DeploymentUrl = ({ url }: DeploymentUrlProps) => {
  if (!url) return null;

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
    >
      <Rocket className="h-4 w-4" />
      {url}
    </a>
  );
};