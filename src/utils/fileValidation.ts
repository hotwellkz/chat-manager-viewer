interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface FileMetadata {
  name: string;
  path: string;
  content: string;
  size: number;
}

// Проверка синтаксиса JavaScript/TypeScript
const validateSyntax = (content: string, filename: string): string[] => {
  const errors: string[] = [];
  try {
    // Базовая проверка синтаксиса через eval
    new Function(content);
  } catch (error) {
    errors.push(`Синтаксическая ошибка в файле ${filename}: ${error.message}`);
  }
  return errors;
};

// Проверка структуры файла
const validateStructure = (file: FileMetadata): string[] => {
  const errors: string[] = [];
  
  // Проверка имени файла
  if (!file.name) {
    errors.push('Отсутствует имя файла');
  }

  // Проверка пути
  if (!file.path) {
    errors.push('Отсутствует путь к файлу');
  }

  // Проверка размера файла (максимум 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    errors.push(`Размер файла превышает 5MB: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  return errors;
};

// Проверка метаданных
const validateMetadata = (file: FileMetadata): string[] => {
  const errors: string[] = [];

  // Проверка расширения файла
  const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.html'];
  const hasValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  
  if (!hasValidExtension) {
    errors.push(`Неподдерживаемое расширение файла. Разрешены: ${allowedExtensions.join(', ')}`);
  }

  // Проверка наличия содержимого
  if (!file.content) {
    errors.push('Файл пуст');
  }

  return errors;
};

export const validateFile = (file: FileMetadata): ValidationResult => {
  const structureErrors = validateStructure(file);
  const metadataErrors = validateMetadata(file);
  
  // Проверяем синтаксис только для JavaScript/TypeScript файлов
  const syntaxErrors = file.name.match(/\.(js|jsx|ts|tsx)$/) 
    ? validateSyntax(file.content, file.name)
    : [];

  const allErrors = [...structureErrors, ...metadataErrors, ...syntaxErrors];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};