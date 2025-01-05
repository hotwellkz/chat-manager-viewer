import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Ошибка при проверке сессии:", error);
          throw error;
        }

        if (!session && location.pathname !== "/auth/login") {
          toast({
            title: "Требуется авторизация",
            description: "Пожалуйста, войдите в систему",
            variant: "destructive",
          });
          navigate("/auth/login");
        }
      } catch (error) {
        console.error("Ошибка:", error);
        toast({
          title: "Ошибка",
          description: "Произошла ошибка при проверке авторизации",
          variant: "destructive",
        });
        navigate("/auth/login");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        navigate("/auth/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location, toast]);

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return <>{children}</>;
};