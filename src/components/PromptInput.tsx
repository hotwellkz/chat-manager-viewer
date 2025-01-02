import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Send, Paperclip } from "lucide-react";

export const PromptInput = () => {
  const [prompt, setPrompt] = useState("");
  const [framework, setFramework] = useState<"nodejs" | "react" | "vue">("react");

  return (
    <div className="p-4 border-t border-border">
      <div className="flex gap-2 mb-2">
        {["nodejs", "react", "vue"].map((fw) => (
          <Button
            key={fw}
            variant={framework === fw ? "default" : "outline"}
            size="sm"
            onClick={() => setFramework(fw as typeof framework)}
          >
            {fw}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt..."
          className="min-h-[40px] resize-none"
        />
        <div className="flex flex-col gap-2">
          <Button size="icon" variant="ghost">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};