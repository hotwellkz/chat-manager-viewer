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
    const { prompt, userId } = req.body;

    // Сохраняем промт в историю чата
    const { error: chatError } = await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        prompt: prompt,
        is_ai: false
      });

    if (chatError) throw chatError;

    // Получаем ответ от OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates structured responses for code generation. Always return response in JSON format with fields: files (array of file objects with path and content), description (string with explanation)."
        },
        { role: "user", content: prompt }
      ],
    });

    const response = JSON.parse(completion.choices[0].message.content);

    // Сохраняем файлы в Storage
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