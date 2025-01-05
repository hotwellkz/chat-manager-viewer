import { ModeToggle } from "./ModeToggle";
import { UserNav } from "./UserNav";
import { GitHubConnect } from "./GitHubConnect";
import { Button } from "./ui/button";
import { Settings, LogIn, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

export const Header = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/auth/login");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось выйти из системы",
      });
    }
  };

  const handleSignIn = () => {
    navigate("/auth/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/favicon.ico" alt="Logo" className="w-6 h-6" />
          <span className="font-bold">Lovable</span>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-accent"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <GitHubConnect />
              <ModeToggle />
              <UserNav />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="hover:bg-accent"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignIn}
              className="hover:bg-accent"
            >
              <LogIn className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};