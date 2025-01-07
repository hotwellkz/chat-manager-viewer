import { supabase } from "@/integrations/supabase/client";

export const saveFilesToDatabase = async (files: any[], userId: string) => {
  console.log('Сохранение файлов в базу данных:', {
    filesCount: files.length,
    userId
  });

  const savedFiles = [];
  
  for (const file of files) {
    try {
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .insert({
          user_id: userId,
          filename: file.name || file.path,
          file_path: file.path,
          content: file.content,
          content_type: 'text/plain',
          size: Buffer.byteLength(file.content, 'utf8'),
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