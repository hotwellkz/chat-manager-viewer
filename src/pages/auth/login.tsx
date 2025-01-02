import { useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";

const LoginPage = () => {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen bg-editor-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-foreground">
          Вход в систему
        </h1>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'rgb(var(--primary))',
                  brandAccent: 'rgb(var(--primary))',
                }
              }
            },
          }}
          localization={{
            variables: {
              sign_in: {
                email_label: "Email адрес",
                password_label: "Пароль",
                button_label: "Войти",
                loading_button_label: "Вход...",
                social_provider_text: "Войти через {{provider}}",
                link_text: "Уже есть аккаунт? Войти",
              },
              sign_up: {
                email_label: "Email адрес",
                password_label: "Пароль",
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