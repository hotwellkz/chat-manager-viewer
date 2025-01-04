import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FileWarning } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "./ui/alert";
import { Progress } from "./ui/progress";
import { validateFile } from "@/utils/fileValidation";

interface FileValidatorProps {
  file: {
    name: string;
    path: string;
    content: string;
    size: number;
  };
  onValidationComplete: (isValid: boolean) => void;
}

export const FileValidator = ({ file, onValidationComplete }: FileValidatorProps) => {
  const [isValid, setIsValid] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [validationProgress, setValidationProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const runValidation = async () => {
      setValidationProgress(0);
      const result = validateFile(file);
      
      // Имитируем процесс валидации для лучшего UX
      const steps = [30, 60, 90, 100];
      for (const progress of steps) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setValidationProgress(progress);
      }

      setIsValid(result.isValid);
      setErrors(result.errors);
      onValidationComplete(result.isValid);

      if (result.errors.length > 0) {
        toast({
          variant: "destructive",
          title: "Ошибки валидации",
          description: `Найдено ${result.errors.length} проблем`,
        });
      }
    };

    runValidation();
  }, [file, onValidationComplete, toast]);

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-background/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isValid ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <FileWarning className="h-5 w-5 text-yellow-500" />
          )}
          <span className="font-medium truncate">{file.path}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {(file.size / 1024).toFixed(1)} KB
        </span>
      </div>

      {validationProgress < 100 && (
        <div className="space-y-2">
          <Progress value={validationProgress} className="h-2" />
          <p className="text-sm text-muted-foreground">
            Проверка файла... {validationProgress}%
          </p>
        </div>
      )}

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-sm">
                  {error}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};