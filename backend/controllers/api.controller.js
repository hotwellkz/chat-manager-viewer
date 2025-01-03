import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Функция для получения API ключа из Supabase
const getOpenAIKey = async () => {
  const { data, error } = await supabase
    .from('secrets')
    .select('value')
    .eq('name', 'OPENAI_API_KEY')
    .single();

  if (error) throw new Error('Не удалось получить API ключ OpenAI');
  return data.value;
};

// Инициализация OpenAI с ключом из Supabase
let openai = null;
const initOpenAI = async () => {
  const apiKey = await getOpenAIKey();
  openai = new OpenAI({ apiKey });
};

export const handlePrompt = async (req, res) => {
  try {
    if (!openai) await initOpenAI();
    
    const { prompt, framework, userId } = req.body;

    if (!prompt || !framework || !userId) {
      return res.status(400).json({ error: 'Отсутствуют обязательные параметры' });
    }

    // Сохраняем промпт в историю чата
    const { error: chatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt: prompt,
        is_ai: false
      });

    if (chatError) {
      console.error('Ошибка при сохранении в chat_history:', chatError);
      throw chatError;
    }

    // Формируем системный промт в зависимости от фреймворка
    let systemPrompt = "You are a helpful assistant that generates structured responses for code generation. ";
    
    switch (framework) {
      case "react":
        systemPrompt += "You specialize in creating React applications with TypeScript, React Router, and Tailwind CSS. ";
        break;
      case "node":
        systemPrompt += "You specialize in creating Node.js applications with Express.js, MongoDB/Mongoose, and JWT authentication. ";
        break;
      case "vue":
        systemPrompt += "You specialize in creating Vue.js applications with TypeScript, Vue Router, and Vuex. ";
        break;
    }
    
    systemPrompt += "Always return response in JSON format with fields: files (array of file objects with path and content), description (string with explanation).";

    // Получаем ответ от OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        { role: "user", content: prompt }
      ],
    });

    if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
      throw new Error('Некорректный ответ от OpenAI API');
    }

    const response = JSON.parse(completion.choices[0].message.content);

    // Сохраняем файлы в Storage и метаданные в базу данных
    if (response.files && response.files.length > 0) {
      for (const file of response.files) {
        const filePath = `${userId}/${file.path}`;
        
        // Загружаем файл в Storage
        const { error: uploadError } = await supabase.storage
          .from('project_files')
          .upload(filePath, file.content, {
            contentType: 'text/plain',
            upsert: true
          });

        if (uploadError) {
          console.error('Ошибка при загрузке файла в Storage:', uploadError);
          throw uploadError;
        }

        // Сохраняем метаданные файла
        const { error: fileError } = await supabase
          .from('files')
          .insert({
            user_id: userId,
            filename: path.basename(file.path),
            file_path: filePath,
            content_type: 'text/plain',
            size: Buffer.byteLength(file.content, 'utf8'),
            content: file.content
          });

        if (fileError) {
          console.error('Ошибка при сохранении метаданных файла:', fileError);
          throw fileError;
        }
      }
    }

    // Сохраняем ответ ИИ в историю чата
    const { error: aiChatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt: response.description,
        is_ai: true
      });

    if (aiChatError) {
      console.error('Ошибка при сохранении ответа ИИ в chat_history:', aiChatError);
      throw aiChatError;
    }

    res.json(response);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Ошибка при обработке запроса',
      details: error.message 
    });
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

    // Сохраняем ответ в историю чата
    const { error: chatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt: response.description,
        is_ai: true
      });

    if (chatError) throw chatError;

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
