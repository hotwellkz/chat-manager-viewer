import { useState } from "react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  Download,
  Edit,
  Trash,
  Plus,
} from "lucide-react";

interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
}

const mockFiles: FileNode[] = [
  {
    id: "1",
    name: "src",
    type: "folder",
    children: [
      { id: "2", name: "App.tsx", type: "file" },
      { id: "3", name: "index.tsx", type: "file" },
    ],
  },
  {
    id: "4",
    name: "public",
    type: "folder",
    children: [
      { id: "5", name: "index.html", type: "file" },
    ],
  },
];

export const FileManager = () => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleFolder = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (node: FileNode, level = 0) => {
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
              onClick={() => toggleFolder(node.id)}
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
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Download className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Edit className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Trash className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {node.type === "folder" && isExpanded && node.children?.map((child) => renderNode(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col border-l border-border">
      <div className="p-2 border-b border-border flex justify-between items-center">
        <h2 className="font-semibold">Files</h2>
        <Button size="icon" variant="ghost">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {mockFiles.map((node) => renderNode(node))}
      </ScrollArea>
    </div>
  );
};