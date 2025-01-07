import { supabase } from "@/integrations/supabase/client";

export const saveFilesToDatabase = async (files: any[], userId: string) => {
  console.log('Сохранение файлов в базу данных:', {
    filesCount: files.length,
    userId
  });

  const savedFiles = [];
  
  for (const file of files) {
    try {
      // Используем TextEncoder вместо Buffer
      const encoder = new TextEncoder();
      const contentSize = encoder.encode(file.content).length;

      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .insert({
          user_id: userId,
          filename: file.name || file.path,
          file_path: file.path,
          content: file.content,
          content_type: 'text/plain',
          size: contentSize,
          version: 1
        })
        .select()
        .single();

      if (fileError) {
        console.error('Ошибка сохранения файла:', fileError);
        throw fileError;
      }

      console.log('Файл успешно сохранен:', fileData);
      savedFiles.push(fileData);
    } catch (error) {
      console.error('Ошибка при сохранении файла:', error);
      throw error;
    }
  }

  return savedFiles;
};

// Функция для создания файлов из ответа OpenAI
export const createFilesFromAIResponse = async (response: string) => {
  try {
    console.log('Создание файлов из ответа AI:', { responseLength: response.length });
    
    // Ищем блоки кода в формате ```filename\n content ```
    const fileRegex = /```(?:.*?)\n([\s\S]*?)```/g;
    const files = [];
    let match;

    while ((match = fileRegex.exec(response)) !== null) {
      const fileContent = match[1];
      const pathMatch = response.slice(match.index - 100, match.index).match(/(?:file|path):\s*([^\n]+)/i);
      
      if (pathMatch) {
        files.push({
          path: pathMatch[1].trim(),
          content: fileContent.trim(),
          name: pathMatch[1].trim().split('/').pop()
        });
      }
    }

    console.log('Извлечено файлов:', files.length);
    return files;
  } catch (error) {
    console.error('Ошибка при создании файлов из ответа AI:', error);
    throw error;
  }
};