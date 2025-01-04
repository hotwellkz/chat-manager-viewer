import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const GitHubConnect = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('github-integration', {
        body: { action: 'get-client-id' }
      });

      if (error || !data?.clientId) {
        throw new Error('Failed to get GitHub client ID');
      }

      // Генерируем случайное состояние для безопасности
      const state = Math.random().toString(36).substring(7);
      sessionStorage.setItem('github_oauth_state', state);

      // Формируем URL для авторизации GitHub
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${data.clientId}&scope=repo&state=${state}`;
      
      // Перенаправляем на GitHub
      window.location.href = githubAuthUrl;

    } catch (error) {
      console.error('GitHub connect error:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось подключиться к GitHub",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      className="flex items-center gap-2"
    >
      <Github className="h-4 w-4" />
      {isConnecting ? 'Подключение...' : 'Подключить GitHub'}
    </Button>
  );
};