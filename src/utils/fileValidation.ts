interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    syntaxValid: boolean;
    structureValid: boolean;
    securityValid: boolean;
    sizeValid: boolean;
  };
}

interface FileMetadata {
  name: string;
  path: string;
  content: string;
  size: number;
}

// Проверка синтаксиса кода
const validateSyntax = (content: string, filename: string): string[] => {
  const errors: string[] = [];
  
  try {
    if (filename.endsWith('.ts') || filename.endsWith('.tsx') || filename.endsWith('.js') || filename.endsWith('.jsx')) {
      new Function(content);
    } else if (filename.endsWith('.json')) {
      JSON.parse(content);
    }
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`Синтаксическая ошибка: ${error.message}`);
    }
  }

  // Дополнительные проверки для TypeScript
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) {
    if (!content.includes('interface') && !content.includes('type') && content.includes('function')) {
      errors.push('Рекомендуется добавить типизацию для функций');
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

// Проверка безопасности
const validateSecurity = (content: string): string[] => {
  const errors: string[] = [];
  
  const sensitivePatterns = [
    { pattern: /api[_-]?key/i, message: 'Обнаружен API ключ' },
    { pattern: /auth[_-]?token/i, message: 'Обнаружен токен авторизации' },
    { pattern: /password/i, message: 'Обнаружен пароль' },
    { pattern: /secret/i, message: 'Обнаружены секретные данные' },
    { pattern: /private[_-]?key/i, message: 'Обнаружен приватный ключ' },
    { pattern: /(\b|\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b)/, message: 'Обнаружен номер карты' },
  ];

  for (const { pattern, message } of sensitivePatterns) {
    if (pattern.test(content)) {
      errors.push(`Предупреждение безопасности: ${message}`);
    }
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
  if (!file.content.trim()) {
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

  return errors;
};

export const validateFile = (file: FileMetadata): ValidationResult => {
  console.log('Начало валидации файла:', file.path);
  
  const syntaxErrors = validateSyntax(file.content, file.name);
  const structureErrors = validateStructure(file);
  const securityErrors = validateSecurity(file.content);
  const metadataErrors = validateMetadata(file);

  const allErrors = [...structureErrors, ...syntaxErrors, ...metadataErrors];
  const warnings = [...securityErrors];

  console.log('Результаты валидации:', {
    syntaxErrors,
    structureErrors,
    securityErrors,
    metadataErrors
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings,
    details: {
      syntaxValid: syntaxErrors.length === 0,
      structureValid: structureErrors.length === 0,
      securityValid: securityErrors.length === 0,
      sizeValid: !structureErrors.some(error => error.includes('размер файла'))
    }
  };
};