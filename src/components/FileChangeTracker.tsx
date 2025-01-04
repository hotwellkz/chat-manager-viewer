import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { GitBranch } from "lucide-react";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types/common";
import { FileValidator } from "./FileValidator";

interface FileChange {
  path: string;
  content: string;
}

type FilesRow = Database['public']['Tables']['files']['Row'];

export const FileChangeTracker = () => {
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [validationResults, setValidationResults] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    const channel = supabase
      .channel('file-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files'
        },
        (payload: RealtimePostgresChangesPayload<FilesRow>) => {
          const newData = payload.new as FilesRow;
          if (newData && newData.file_path) {
            setChanges(prev => [...prev, {
              path: newData.file_path,
              content: newData.content || ''
            }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleValidationComplete = (path: string, isValid: boolean) => {
    setValidationResults(prev => ({
      ...prev,
      [path]: isValid
    }));
  };

  const areAllFilesValid = () => {
    return changes.every(change => validationResults[change.path]);
  };

  const syncWithGitHub = async () => {
    if (!areAllFilesValid()) {
      toast({
        title: "Ошибка",
        description: "Некоторые файлы содержат ошибки. Исправьте их перед отправкой.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSyncing(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await supabase.functions.invoke('github-sync', {
        body: {
          userId: user.id,
          files: changes,
          commitMessage: 'Автоматическое обновление из Lovable'
        }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Ошибка синхронизации');
      }

      toast({
        title: "Успешно",
        description: "Изменения отправлены в GitHub",
      });

      setChanges([]);
      setValidationResults({});
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось синхронизировать изменения с GitHub",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (changes.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-background border rounded-lg shadow-lg">
      <div className="space-y-4">
        {changes.map((change) => (
          <FileValidator
            key={change.path}
            file={{
              name: change.path.split('/').pop() || '',
              path: change.path,
              content: change.content,
              size: new Blob([change.content]).size
            }}
            onValidationComplete={(isValid) => handleValidationComplete(change.path, isValid)}
          />
        ))}
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {changes.length} неотправленных изменений
          </span>
          <Button
            onClick={syncWithGitHub}
            disabled={isSyncing || !areAllFilesValid()}
            className="flex items-center gap-2"
          >
            <GitBranch className="h-4 w-4" />
            {isSyncing ? 'Синхронизация...' : 'Отправить в GitHub'}
          </Button>
        </div>
      </div>
    </div>
  );
};