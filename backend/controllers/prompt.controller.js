import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handlePrompt = async (req, res) => {
  try {
    const { prompt, framework, userId } = req.body;

    // Сохраняем промпт в историю чата
    const { error: chatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt: prompt,
        is_ai: false
      });

    if (chatError) throw chatError;

    // Формируем системный промт в зависимости от фреймворка
    let systemPrompt = "You are a helpful assistant that generates structured responses for code generation. ";
    
    switch (framework) {
      case "react":
        systemPrompt += "You specialize in creating React applications with TypeScript, React Router, and Tailwind CSS. Create all necessary files for a complete deployable application.";
        break;
      case "node":
        systemPrompt += "You specialize in creating Node.js applications with Express.js, MongoDB/Mongoose, and JWT authentication. Create all necessary files for a complete deployable application.";
        break;
      case "vue":
        systemPrompt += "You specialize in creating Vue.js applications with TypeScript, Vue Router, and Vuex. Create all necessary files for a complete deployable application.";
        break;
    }
    
    systemPrompt += " Always return response in JSON format with fields: files (array of file objects with path and content), description (string with explanation).";

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

    const response = JSON.parse(completion.choices[0].message.content);

    // Сохраняем файлы и запускаем развертывание
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

        if (uploadError) throw uploadError;

        // Сохраняем метаданные файла
        const { error: fileError } = await supabase
          .from('files')
          .insert({
            user_id: userId,
            filename: file.path.split('/').pop(),
            file_path: filePath,
            content_type: 'text/plain',
            size: Buffer.byteLength(file.content, 'utf8'),
            content: file.content
          });

        if (fileError) throw fileError;
      }

      // Запускаем процесс развертывания
      await fetch(`${process.env.BACKEND_URL}/api/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          files: response.files,
          framework
        })
      });
    }

    // Сохраняем ответ ИИ в историю чата
    const { error: aiChatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt: response.description,
        is_ai: true
      });

    if (aiChatError) throw aiChatError;

    res.json(response);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process prompt' });
  }
};