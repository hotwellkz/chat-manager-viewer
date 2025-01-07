import { useEffect, useState, useCallback, memo } from "react";
import { AlertCircle, CheckCircle2, FileWarning, Shield, Code, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "./ui/alert";
import { Progress } from "./ui/progress";
import { validateFile } from "@/utils/fileValidation";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface FileValidatorProps {
  file: {
    name: string;
    path: string;
    content: string;
    size: number;
  };
  onValidationComplete: (isValid: boolean) => void;
}

export const FileValidator = memo(({ file, onValidationComplete }: FileValidatorProps) => {
  const [validationState, setValidationState] = useState({
    isValid: false,
    errors: [] as string[],
    warnings: [] as string[],
    details: {
      syntaxValid: false,
      structureValid: false,
      securityValid: false,
      sizeValid: false
    }
  });
  const [validationProgress, setValidationProgress] = useState(0);
  const { toast } = useToast();

  const runValidation = useCallback(async () => {
    setValidationProgress(0);
    
    const steps = [25, 50, 75, 100];
    for (const progress of steps) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setValidationProgress(progress);
    }

    const result = validateFile(file);
    
    setValidationState({
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
      details: result.details
    });
    
    onValidationComplete(result.isValid);

    if (result.errors.length > 0) {
      toast({
        variant: "destructive",
        title: "Ошибки валидации",
        description: `Найдено ${result.errors.length} проблем`,
      });
    }

    if (result.warnings.length > 0) {
      toast({
        variant: "default",
        title: "Предупреждения",
        description: `Найдено ${result.warnings.length} предупреждений`,
      });
    }
  }, [file, onValidationComplete, toast]);

  useEffect(() => {
    runValidation();
  }, [runValidation]);

  const getValidationColor = (isValid: boolean) => 
    isValid ? "text-green-500" : "text-red-500";

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {validationState.isValid ? (
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

      {validationProgress === 100 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Code className={getValidationColor(validationState.details.syntaxValid)} />
              <span>Синтаксис</span>
              <Badge variant={validationState.details.syntaxValid ? "default" : "destructive"}>
                {validationState.details.syntaxValid ? "OK" : "Ошибка"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <FileText className={getValidationColor(validationState.details.structureValid)} />
              <span>Структура</span>
              <Badge variant={validationState.details.structureValid ? "default" : "destructive"}>
                {validationState.details.structureValid ? "OK" : "Ошибка"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Shield className={getValidationColor(validationState.details.securityValid)} />
              <span>Безопасность</span>
              <Badge variant={validationState.details.securityValid ? "default" : "destructive"}>
                {validationState.details.securityValid ? "OK" : "Внимание"}
              </Badge>
            </div>
          </div>

          {validationState.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  {validationState.errors.map((error, index) => (
                    <li key={index} className="text-sm">
                      {error}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {validationState.warnings.length > 0 && (
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  {validationState.warnings.map((warning, index) => (
                    <li key={index} className="text-sm">
                      {warning}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </Card>
  );
});

FileValidator.displayName = 'FileValidator';