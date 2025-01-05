import { useEffect, useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const LoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Ошибка при проверке сессии:", error);
          toast({
            title: "Ошибка",
            description: "Произошла ошибка при проверке сессии",
            variant: "destructive",
          });
          return;
        }

        if (session) {
          navigate("/");
        }
      } catch (error) {
        console.error("Ошибка:", error);
        toast({
          title: "Ошибка",
          description: "Произошла ошибка при проверке авторизации",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] to-[#6E59A5] flex items-center justify-center">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] to-[#6E59A5] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#2A2F3C]/80 backdrop-blur-sm rounded-xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] bg-clip-text text-transparent">
          Вход в систему
        </h1>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#9b87f5',
                  brandAccent: '#7E69AB',
                  brandButtonText: 'white',
                  defaultButtonBackground: '#2A2F3C',
                  defaultButtonBackgroundHover: '#1A1F2C',
                  inputBackground: '#1A1F2C',
                  inputBorder: '#6E59A5',
                  inputBorderHover: '#9b87f5',
                  inputBorderFocus: '#D6BCFA',
                  inputText: 'white',
                },
                borderWidths: {
                  buttonBorderWidth: '0px',
                  inputBorderWidth: '1px',
                },
                radii: {
                  borderRadiusButton: '8px',
                  buttonBorderRadius: '8px',
                  inputBorderRadius: '8px',
                },
              },
            },
            className: {
              container: 'space-y-4',
              button: 'w-full px-4 py-2.5 rounded-lg font-medium transition-colors duration-200',
              input: 'w-full px-4 py-2.5 rounded-lg bg-[#1A1F2C] border border-[#6E59A5] focus:border-[#9b87f5] focus:ring-2 focus:ring-[#D6BCFA]/20 transition-colors duration-200 text-white placeholder:text-gray-400',
              label: 'text-sm font-medium text-[#D6BCFA]',
              anchor: 'text-[#9b87f5] hover:text-[#D6BCFA] transition-colors duration-200',
              message: 'text-sm text-red-500',
            },
          }}
          localization={{
            variables: {
              sign_in: {
                email_label: "Email адрес",
                password_label: "Пароль (минимум 6 символов)",
                button_label: "Войти",
                loading_button_label: "Вход...",
                social_provider_text: "Войти через {{provider}}",
                link_text: "Уже есть аккаунт? Войти",
              },
              sign_up: {
                email_label: "Email адрес",
                password_label: "Пароль (минимум 6 символов)",
                button_label: "Зарегистрироваться",
                loading_button_label: "Регистрация...",
                social_provider_text: "Зарегистрироваться через {{provider}}",
                link_text: "Нет аккаунта? Зарегистрироваться",
              },
              forgotten_password: {
                email_label: "Email адрес",
                button_label: "Отправить инструкции",
                loading_button_label: "Отправка инструкций...",
                link_text: "Забыли пароль?",
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default LoginPage;