import { createClient } from '@supabase/supabase-js';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handleFiles = async (req, res) => {
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

export const handleUpdateFiles = async (req, res) => {
  try {
    const { prompt, userId } = req.body;

    // Получаем список файлов пользователя
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId);

    if (filesError) throw filesError;

    const openai = await initOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that analyzes and modifies code files. Return response in JSON format with fields: files (array of file objects with action, path and content), description (string with explanation)."
        },
        {
          role: "user",
          content: `
Current project files:
${files.map(file => `File: ${file.file_path}\nContent:\n${file.content}`).join('\n\n')}

User request:
${prompt}

Please analyze these files and provide necessary updates.`
        }
      ],
    });

    const response = JSON.parse(completion.choices[0].message.content);

    for (const file of response.files) {
      const filePath = `${userId}/${file.path}`;
      
      if (file.action === 'delete') {
        // Удаляем файл из Storage
        const { error: deleteError } = await supabase.storage
          .from('project_files')
          .remove([filePath]);

        if (deleteError) throw deleteError;

        // Удаляем метаданные
        const { error: dbError } = await supabase
          .from('files')
          .delete()
          .eq('file_path', filePath);

        if (dbError) throw dbError;
      } else if (file.action === 'add' || file.action === 'update') {
        // Загружаем файл в Storage
        const { error: uploadError } = await supabase.storage
          .from('project_files')
          .upload(filePath, file.content, {
            contentType: 'text/plain',
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Обновляем или добавляем метаданные
        const { error: dbError } = await supabase
          .from('files')
          .upsert({
            user_id: userId,
            filename: path.basename(file.path),
            file_path: filePath,
            content_type: 'text/plain',
            size: Buffer.byteLength(file.content, 'utf8'),
            content: file.content
          });

        if (dbError) throw dbError;
      }
    }

    res.json({
      success: true,
      message: 'Files updated successfully',
      description: response.description
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update files',
      details: error.message 
    });
  }
};