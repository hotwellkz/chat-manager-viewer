import { ModeToggle } from "./ModeToggle";
import { UserNav } from "./UserNav";
import { GitHubConnect } from "./GitHubConnect";
import { Button } from "./ui/button";
import { Settings, LogIn, LogOut, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Header = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

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

  const handleVercelDeploy = async () => {
    try {
      setIsDeploying(true);
      
      // Получаем текущего пользователя
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error(userError?.message || "Необходима авторизация");
      }

      console.log('Starting deployment for user:', user.id);

      // Получаем файлы пользователя
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id);

      if (filesError) {
        console.error('Error fetching files:', filesError);
        throw new Error(filesError.message || "Ошибка при получении файлов");
      }

      if (!files || files.length === 0) {
        throw new Error("Нет файлов для деплоя. Создайте хотя бы один файл.");
      }

      console.log('Files ready for deployment:', files.length);

      // Определяем фреймворк на основе package.json или используем react по умолчанию
      let framework = 'react';
      const packageJson = files.find(f => f.file_path.includes('package.json'));
      if (packageJson?.content) {
        try {
          const pkg = JSON.parse(packageJson.content);
          if (pkg.dependencies?.vue) framework = 'vue';
          else if (pkg.dependencies?.['@nestjs/core']) framework = 'node';
        } catch (e) {
          console.warn('Error parsing package.json:', e);
        }
      }

      console.log('Deploying with framework:', framework);

      // Отправляем запрос на деплой
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          files: files.map(f => ({
            path: f.file_path,
            content: f.content
          })),
          framework: framework,
          platform: 'vercel'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Ошибка при деплое');
      }

      const result = await response.json();

      toast({
        title: "Успешно",
        description: "Проект отправлен на деплой в Vercel",
      });

      // Открываем Vercel в новой вкладке если есть URL
      if (result.deploymentUrl) {
        window.open(result.deploymentUrl, '_blank');
      }

    } catch (error) {
      console.error('Deploy error:', error);
      toast({
        variant: "destructive",
        title: "Ошибка деплоя",
        description: error.message || "Не удалось выполнить деплой на Vercel",
      });
    } finally {
      setIsDeploying(false);
    }
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleVercelDeploy}
                      disabled={isDeploying}
                      className="hover:bg-accent"
                    >
                      <Rocket className={`h-5 w-5 ${isDeploying ? 'animate-pulse' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Деплой на Vercel</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
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