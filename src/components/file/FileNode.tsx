import { ChevronRight, ChevronDown, File, Folder, Download, Trash } from "lucide-react";
import { Button } from "../ui/button";

interface FileNodeProps {
  node: {
    id: string;
    name: string;
    type: "file" | "folder";
    path?: string;
    children?: any[];
  };
  level?: number;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onDownload: (path: string) => void;
  onDelete: (id: string, path: string) => void;
}

export const FileNode = ({ 
  node, 
  level = 0, 
  expanded, 
  onToggle, 
  onDownload, 
  onDelete 
}: FileNodeProps) => {
  const isExpanded = expanded[node.id];
  const paddingLeft = level * 16;

  return (
    <div key={node.id}>
      <div
        className="flex items-center hover:bg-accent/50 py-1 px-2"
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {node.type === "folder" ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4"
            onClick={() => onToggle(node.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <span className="w-4" />
        )}
        {node.type === "folder" ? (
          <Folder className="h-4 w-4 mr-2" />
        ) : (
          <File className="h-4 w-4 mr-2" />
        )}
        <span className="flex-1">{node.name}</span>
        {node.type === "file" && node.path && (
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => onDownload(node.path!)}
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => onDelete(node.id, node.path!)}
            >
              <Trash className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      {node.type === "folder" && isExpanded && node.children?.map((child) => (
        <FileNode
          key={child.id}
          node={child}
          level={level + 1}
          expanded={expanded}
          onToggle={onToggle}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};