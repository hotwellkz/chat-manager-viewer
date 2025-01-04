import { ScrollArea } from "../ui/scroll-area";
import { FileNode } from "./FileNode";

interface FileTreeProps {
  files: any[];
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onDownload: (path: string) => void;
  onDelete: (id: string, path: string) => void;
}

export const FileTree = ({ 
  files, 
  expanded, 
  onToggle, 
  onDownload, 
  onDelete 
}: FileTreeProps) => {
  return (
    <ScrollArea className="flex-1">
      {files.map((node) => (
        <FileNode
          key={node.id}
          node={node}
          expanded={expanded}
          onToggle={onToggle}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      ))}
    </ScrollArea>
  );
};