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
    // Базовая проверка синтаксиса через Function
    new Function(content);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`Синтаксическая ошибка: ${error.message}`);
    }
  }

  // Дополнительные проверки для TypeScript
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) {
    // Проверяем наличие типов для параметров функций
    if (content.includes('function') && !content.includes(': ')) {
      errors.push('Отсутствует типизация параметров функций');
    }
  }

  return errors;
};

// Проверка структуры файла
const validateStructure = (file: FileMetadata): string[] => {
  const errors: string[] = [];
  
  // Проверка имени файла
  if (!file.name) {
    errors.push('Отсутствует имя файла');
  } else if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
    errors.push('Имя файла содержит недопустимые символы');
  }

  // Проверка пути
  if (!file.path) {
    errors.push('Отсутствует путь к файлу');
  } else if (!file.path.startsWith('src/') && !file.path.startsWith('public/')) {
    errors.push('Файл должен находиться в директории src/ или public/');
  }

  // Проверка размера файла (максимум 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`Размер файла превышает 5MB (текущий размер: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  }

  return errors;
};

// Проверка метаданных
const validateMetadata = (file: FileMetadata): string[] => {
  const errors: string[] = [];

  // Проверка расширения файла
  const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json', '.md'];
  const hasValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  
  if (!hasValidExtension) {
    errors.push(`Неподдерживаемое расширение файла. Разрешены: ${allowedExtensions.join(', ')}`);
  }

  // Проверка наличия содержимого
  if (!file.content) {
    errors.push('Файл пуст');
  }

  // Специальные проверки для package.json
  if (file.name === 'package.json') {
    try {
      const packageJson = JSON.parse(file.content);
      if (!packageJson.name || !packageJson.version) {
        errors.push('В package.json отсутствуют обязательные поля name или version');
      }
    } catch {
      errors.push('Некорректный формат package.json');
    }
  }

  // Проверка на наличие конфиденциальных данных
  const sensitivePatterns = [
    /api[_-]?key/i,
    /auth[_-]?token/i,
    /password/i,
    /secret/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(file.content)) {
      errors.push('Файл может содержать конфиденциальные данные');
      break;
    }
  }

  return errors;
};

export const validateFile = (file: FileMetadata): ValidationResult => {
  console.log('Начало валидации файла:', file.path);
  
  const structureErrors = validateStructure(file);
  const metadataErrors = validateMetadata(file);
  
  // Проверяем синтаксис только для JavaScript/TypeScript файлов
  const syntaxErrors = file.name.match(/\.(js|jsx|ts|tsx)$/) 
    ? validateSyntax(file.content, file.name)
    : [];

  const allErrors = [...structureErrors, ...metadataErrors, ...syntaxErrors];

  console.log('Результаты валидации:', {
    structureErrors,
    metadataErrors,
    syntaxErrors
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};