import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { 
  PanelLeftClose, 
  MessageSquare, 
  History, 
  LogIn,
  LogOut,
  Settings
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Header = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isChatView, setIsChatView] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();
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
      navigate("/auth/login");
    }
  };

  const handleDeleteProject = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Удаление файлов из storage
      const { data: files } = await supabase
        .from('files')
        .select('file_path')
        .eq('user_id', user.id);

      if (files && files.length > 0) {
        const filePaths = files.map(file => file.file_path);
        await supabase.storage
          .from('project_files')
          .remove(filePaths);
      }

      // Удаление всех записей из таблиц
      await Promise.all([
        // Удаление файлов
        supabase
          .from('files')
          .delete()
          .eq('user_id', user.id),
        
        // Удаление истории чата
        supabase
          .from('chat_history')
          .delete()
          .eq('user_id', user.id),
        
        // Удаление развернутых проектов
        supabase
          .from('deployed_projects')
          .delete()
          .eq('user_id', user.id)
      ]);

      toast({
        title: "Проект удален",
        description: "Все данные проекта были успешно удалены",
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить проект",
        variant: "destructive",
      });
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
      
      <div className="flex items-center space-x-2">
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

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px]">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Настройки проекта</h2>
              <div className="space-y-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      Удалить проект
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Это действие нельзя отменить. Все данные проекта будут удалены безвозвратно.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteProject}>
                        Удалить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};