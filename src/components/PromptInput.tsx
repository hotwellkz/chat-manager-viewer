import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, Send } from "lucide-react";

export const PromptInput = () => {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [framework, setFramework] = useState("react");
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast({
        title: "Файл выбран",
        description: `Выбран файл: ${file.name}`,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Пользователь не авторизован");

      console.log("Отправка запроса на:", "https://backendlovable006.onrender.com/api/prompt");
      
      const response = await fetch("https://backendlovable006.onrender.com/api/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt,
          framework,
          userId: user.id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Ошибка ответа:", errorData);
        throw new Error(`Ошибка при обработке запроса: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Ответ сервера:", data);

      toast({
        title: "Успешно!",
        description: "Запрос обработан",
      });

      setPrompt("");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Произошла ошибка при обработке запроса",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border-t">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 items-center mb-2">
          <Select value={framework} onValueChange={setFramework}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Выберите фреймворк" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nodejs">Node.js</SelectItem>
              <SelectItem value="react">React</SelectItem>
              <SelectItem value="vue">Vue</SelectItem>
            </SelectContent>
          </Select>
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
            <Paperclip className="h-5 w-5 text-gray-500 hover:text-gray-700" />
          </label>
        </div>
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Введите ваш запрос..."
            className="min-h-[100px] pr-12"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="absolute bottom-3 right-3 p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
