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
        setIsLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session && location.pathname !== "/auth/login") {
        navigate("/auth/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location, toast]);

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return <>{children}</>;
};