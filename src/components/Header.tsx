import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { PanelLeftClose, MessageSquare, History, LogIn, LogOut, Settings2, Eye, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { ScrollArea } from "./ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  isAI: boolean;
}

export const Header = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isChatView, setIsChatView] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchChatHistory = async () => {
      const { data: chatHistory, error } = await supabase
        .from("chat_history")
        .select("*")
        .order("timestamp", { ascending: true });

      if (error) {
        console.error("Error fetching chat history:", error);
        return;
      }

      const formattedMessages = chatHistory.map((msg) => ({
        id: msg.id,
        content: msg.is_ai ? msg.response : msg.prompt,
        timestamp: new Date(msg.timestamp).toLocaleString(),
        isAI: msg.is_ai,
      }));

      setMessages(formattedMessages);
    };

    fetchChatHistory();

    const subscription = supabase
      .channel("chat_history_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_history",
        },
        () => {
          fetchChatHistory();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthClick = async () => {
    if (isLoggedIn) {
      try {
        await supabase.auth.signOut();
        toast({
          title: "Выход выполнен успешно",
          description: "Вы успешно вышли из системы",
        });
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось выйти из системы",
          variant: "destructive",
        });
      }
    } else {
      navigate("/auth/login");
    }
  };

  return (
    <header className="h-12 bg-editor-background border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
        >
          <PanelLeftClose className={`h-5 w-5 transition-transform ${isPanelOpen ? "" : "rotate-180"}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={isChatView ? "bg-accent" : ""}
          onClick={() => setIsChatView(true)}
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={!isChatView ? "bg-accent" : ""}
          onClick={() => setIsChatView(false)}
        >
          <History className="h-5 w-5" />
        </Button>
      </div>

      <h1 className="text-lg font-semibold text-foreground">Project Name</h1>

      <div className="flex items-center space-x-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              title="Настройки проекта"
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Настройки проекта</SheetTitle>
              <SheetDescription>
                Управление настройками вашего проекта
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
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
          </SheetContent>
        </Sheet>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleAuthClick}
          title={isLoggedIn ? "Выйти" : "Войти"}
        >
          {isLoggedIn ? (
            <LogOut className="h-5 w-5" />
          ) : (
            <LogIn className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
};
