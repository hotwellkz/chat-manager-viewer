import { createClient } from '@supabase/supabase-js';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handleUpdateFiles = async (req, res) => {
  try {
    const { files, userId } = req.body;
    const results = [];

    for (const file of files) {
      const filePath = `${userId}/${file.path}`;
      
      // Загружаем файл в Storage
      const { error: uploadError } = await supabase.storage
        .from('project_files')
        .upload(filePath, file.content, {
          contentType: 'text/plain',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Сохраняем метаданные
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: userId,
          filename: path.basename(file.path),
          file_path: filePath,
          content_type: 'text/plain',
          size: Buffer.byteLength(file.content, 'utf8'),
          content: file.content
        });

      if (dbError) throw dbError;
      
      results.push({
        path: file.path,
        url: `/uploads/${file.path}`
      });
    }

    res.json({ files: results });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to save files' });
  }
};