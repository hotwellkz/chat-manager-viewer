import { useState } from "react";
import { Header } from "@/components/Header";
import { ChatHistory } from "@/components/ChatHistory";
import { PromptInput } from "@/components/PromptInput";
import { FileManager } from "@/components/FileManager";
import { Preview } from "@/components/Preview";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

const Index = () => {
  const [showPreview, setShowPreview] = useState(true);

  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col bg-editor-background text-editor-foreground">
        <Header />
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Левая панель с чатом */}
            <ResizablePanel 
              defaultSize={25} 
              minSize={20} 
              maxSize={40}
              className="hidden md:flex flex-col"
            >
              <div className="flex-1 overflow-y-auto">
                <ChatHistory />
              </div>
              <div className="flex-shrink-0">
                <PromptInput />
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* Средняя панель с файлами */}
            <ResizablePanel 
              defaultSize={25} 
              minSize={15} 
              maxSize={30}
              className="hidden sm:block"
            >
              <FileManager />
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* Правая панель с превью */}
            <ResizablePanel defaultSize={50}>
              <Preview />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        
        {/* Мобильная версия чата */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t">
          <PromptInput />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Index;