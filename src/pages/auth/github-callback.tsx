import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const GitHubCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const state = params.get('state');
        
        // Проверяем состояние из localStorage
        const savedState = localStorage.getItem('github_oauth_state');
        if (state !== savedState) {
          throw new Error('Invalid state parameter');
        }
        
        // Очищаем сохраненное состояние
        localStorage.removeItem('github_oauth_state');

        if (!code) {
          throw new Error('No code parameter');
        }

        // Получаем текущую сессию
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No active session');
        }

        // Вызываем Edge Function для обмена кода на токен
        const { error } = await supabase.functions.invoke('github-integration', {
          body: { 
            code, 
            action: 'auth',
            accessToken: session.access_token 
          }
        });

        if (error) throw error;

        toast({
          title: "GitHub подключен",
          description: "Ваш GitHub аккаунт успешно подключен",
        });

        // Перенаправляем на главную страницу
        navigate('/');
      } catch (error) {
        console.error('Error in GitHub callback:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось подключить GitHub аккаунт",
          variant: "destructive",
        });
        navigate('/');
      }
    };

    handleCallback();
  }, [location, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] to-[#6E59A5] flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Подключение к GitHub...</p>
      </div>
    </div>
  );
};