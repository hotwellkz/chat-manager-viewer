import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { FilePackager } from "../FilePackager";
import { DockerBuildManager } from "../docker/DockerBuildManager";
import { SaveToStorageButton } from "./SaveToStorageButton";

export const FileToolbar = () => {
  return (
    <div className="p-2 border-b border-border flex justify-between items-center">
      <h2 className="font-semibold">Файлы</h2>
      <div className="flex gap-2">
        <DockerBuildManager />
        <SaveToStorageButton />
        <FilePackager />
        <Button size="icon" variant="ghost">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};