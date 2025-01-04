import { useState } from "react";
import { validateFile } from "@/utils/fileValidation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

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
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const validate = () => {
    const result = validateFile(file);
    setErrors(result.errors);
    onValidationComplete(result.isValid);

    if (!result.isValid) {
      toast({
        title: "Ошибка валидации",
        description: "Файл содержит ошибки. Проверьте детали ниже.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc pl-4">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};