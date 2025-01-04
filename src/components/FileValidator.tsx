import { useEffect, useState } from "react";
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

export const FileValidator = ({ file, onValidationComplete }: FileValidatorProps) => {
  const [isValid, setIsValid] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [details, setDetails] = useState<{
    syntaxValid: boolean;
    structureValid: boolean;
    securityValid: boolean;
    sizeValid: boolean;
  }>({
    syntaxValid: false,
    structureValid: false,
    securityValid: false,
    sizeValid: false
  });
  const [validationProgress, setValidationProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const runValidation = async () => {
      setValidationProgress(0);
      
      // Имитируем процесс валидации для лучшего UX
      const steps = [25, 50, 75, 100];
      for (const progress of steps) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setValidationProgress(progress);
      }

      const result = validateFile(file);
      
      setIsValid(result.isValid);
      setErrors(result.errors);
      setWarnings(result.warnings);
      setDetails(result.details);
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
          variant: "warning",
          title: "Предупреждения",
          description: `Найдено ${result.warnings.length} предупреждений`,
        });
      }
    };

    runValidation();
  }, [file, onValidationComplete, toast]);

  const getValidationColor = (isValid: boolean) => 
    isValid ? "text-green-500" : "text-red-500";

  return (
    <Card className="space-y-4 p-4">
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

      {validationProgress === 100 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Code className={getValidationColor(details.syntaxValid)} />
              <span>Синтаксис</span>
              <Badge variant={details.syntaxValid ? "success" : "destructive"}>
                {details.syntaxValid ? "OK" : "Ошибка"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <FileText className={getValidationColor(details.structureValid)} />
              <span>Структура</span>
              <Badge variant={details.structureValid ? "success" : "destructive"}>
                {details.structureValid ? "OK" : "Ошибка"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Shield className={getValidationColor(details.securityValid)} />
              <span>Безопасность</span>
              <Badge variant={details.securityValid ? "success" : "destructive"}>
                {details.securityValid ? "OK" : "Внимание"}
              </Badge>
            </div>
          </div>

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

          {warnings.length > 0 && (
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4 space-y-1">
                  {warnings.map((warning, index) => (
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
};