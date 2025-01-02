import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Eye, RotateCcw } from "lucide-react";

interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  isAI: boolean;
}

const mockMessages: ChatMessage[] = [
  {
    id: "1",
    content: "Hello! How can I help you today?",
    timestamp: "2024-01-20 10:00",
    isAI: true,
  },
  {
    id: "2",
    content: "I need help with React components",
    timestamp: "2024-01-20 10:01",
    isAI: false,
  },
];

export const ChatHistory = () => {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {mockMessages.map((message) => (
          <div
            key={message.id}
            className={`flex flex-col ${
              message.isAI ? "items-start" : "items-end"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.isAI
                  ? "bg-accent text-accent-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <p>{message.content}</p>
              <div className="text-xs mt-2 opacity-70">{message.timestamp}</div>
            </div>
            {message.isAI && (
              <div className="flex gap-2 mt-1">
                <Button size="icon" variant="ghost">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};