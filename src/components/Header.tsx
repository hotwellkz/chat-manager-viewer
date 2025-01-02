import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { 
  PanelLeftClose, 
  MessageSquare, 
  History, 
  LogIn,
  LogOut
} from "lucide-react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";

export const Header = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isChatView, setIsChatView] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
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
      router.push("/auth/login");
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
          <PanelLeftClose className={`h-5 w-5 transition-transform ${isPanelOpen ? '' : 'rotate-180'}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={isChatView ? 'bg-accent' : ''}
          onClick={() => setIsChatView(true)}
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={!isChatView ? 'bg-accent' : ''}
          onClick={() => setIsChatView(false)}
        >
          <History className="h-5 w-5" />
        </Button>
      </div>
      
      <h1 className="text-lg font-semibold text-foreground">Project Name</h1>
      
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
    </header>
  );
};