import { Button } from "./ui/button";
import { Github } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const GitHubConnect = () => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkGitHubConnection();
  }, []);

  const checkGitHubConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('github_integrations')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setIsConnected(!!data);
    } catch (error) {
      console.error('Error checking GitHub connection:', error);
    }
  };

  const handleConnect = async () => {
    try {
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
      
      // Сохраняем состояние в localStorage для проверки после редиректа
      localStorage.setItem('github_oauth_state', state);
      
      // Формируем URL для авторизации GitHub
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${data.clientId}&scope=repo&state=${state}`;
      
      // Перенаправляем на GitHub для авторизации
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error connecting to GitHub:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось подключиться к GitHub",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('github_integrations')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setIsConnected(false);
      toast({
        title: "GitHub отключен",
        description: "Ваш GitHub аккаунт успешно отключен",
      });
    } catch (error) {
      console.error('Error disconnecting GitHub:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отключить GitHub аккаунт",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isConnected ? "destructive" : "default"}
        onClick={isConnected ? handleDisconnect : handleConnect}
        className="flex items-center gap-2"
      >
        <Github className="h-4 w-4" />
        {isConnected ? "Отключить GitHub" : "Подключить GitHub"}
      </Button>
    </div>
  );
};