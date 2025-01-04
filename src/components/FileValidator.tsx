import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
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
  const [isValid, setIsValid] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    validateFile();
  }, [file]);

  const validateFile = async () => {
    const newErrors: string[] = [];

    // Проверка размера файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      newErrors.push("Файл слишком большой (максимум 5MB)");
    }

    // Проверка имени файла
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      newErrors.push("Недопустимые символы в имени файла");
    }

    // Проверка расширения файла
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['js', 'jsx', 'ts', 'tsx', 'json', 'md', 'css', 'html'];
    if (!extension || !allowedExtensions.includes(extension)) {
      newErrors.push("Неподдерживаемый тип файла");
    }

    // Проверка синтаксиса для JavaScript/TypeScript файлов
    if (['js', 'jsx', 'ts', 'tsx'].includes(extension || '')) {
      try {
        // Используем Function для базовой проверки синтаксиса
        new Function(file.content);
      } catch (error) {
        if (error instanceof Error) {
          newErrors.push(`Ошибка синтаксиса: ${error.message}`);
        }
      }
    }

    // Проверка метаданных
    if (!file.path.startsWith('src/') && !file.path.startsWith('public/')) {
      newErrors.push("Файл должен находиться в директории src/ или public/");
    }

    // Проверка наличия обязательных полей в package.json
    if (file.name === 'package.json') {
      try {
        const packageJson = JSON.parse(file.content);
        if (!packageJson.name || !packageJson.version) {
          newErrors.push("В package.json отсутствуют обязательные поля name или version");
        }
      } catch {
        newErrors.push("Некорректный формат package.json");
      }
    }

    // Обновляем состояние
    setErrors(newErrors);
    const fileIsValid = newErrors.length === 0;
    setIsValid(fileIsValid);
    onValidationComplete(fileIsValid);

    // Показываем уведомление при наличии ошибок
    if (newErrors.length > 0) {
      toast({
        variant: "destructive",
        title: "Ошибки валидации",
        description: newErrors[0],
      });
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-background/50">
      <div className="flex-shrink-0">
        {isValid ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.path}</p>
        {errors.length > 0 && (
          <ul className="mt-1 text-xs text-red-500 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};