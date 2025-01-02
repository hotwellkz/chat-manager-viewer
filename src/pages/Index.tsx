import { useState } from "react";
import { Header } from "@/components/Header";
import { ChatHistory } from "@/components/ChatHistory";
import { PromptInput } from "@/components/PromptInput";
import { FileManager } from "@/components/FileManager";
import { Preview } from "@/components/Preview";

const Index = () => {
  const [showPreview, setShowPreview] = useState(true);

  return (
    <div className="h-screen flex flex-col bg-editor-background text-editor-foreground">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="w-[300px] flex flex-col">
          <ChatHistory />
          <PromptInput />
        </div>
        
        {/* Middle panel */}
        <div className="w-[250px]">
          <FileManager />
        </div>
        
        {/* Right panel */}
        <div className="flex-1">
          <Preview />
        </div>
      </div>
    </div>
  );
};

export default Index;