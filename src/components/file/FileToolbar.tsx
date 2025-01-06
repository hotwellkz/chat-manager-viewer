import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { FilePackager } from "../FilePackager";
import { DockerBuildManager } from "../docker/DockerBuildManager";
import { SaveToStorageButton } from "./SaveToStorageButton";

export const FileToolbar = () => {
  return (
    <div className="flex flex-col border-b border-border">
      <div className="p-2 flex justify-between items-center">
        <h2 className="font-semibold">Файлы</h2>
        <div className="flex gap-2">
          <SaveToStorageButton />
          <FilePackager />
          <Button size="icon" variant="ghost">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Отдельная строка для кнопки сборки */}
      <div className="px-2 py-1.5 border-t border-border bg-muted/40">
        <DockerBuildManager />
      </div>
    </div>
  );
};