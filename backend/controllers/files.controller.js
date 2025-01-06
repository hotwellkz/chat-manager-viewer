import { openaiQueue, fileQueue, dockerQueue } from '../queues/index.js';
import { supabase } from '../config/supabase.js';

export const handleFiles = async (req, res) => {
  try {
    const { files, userId } = req.body;
    console.log('Получен запрос на сохранение файлов:', { 
      files: files,
      filesCount: files?.length,
      userId,
      body: req.body
    });

    if (!files || !Array.isArray(files)) {
      console.error('Ошибка: files не является массивом или отсутствует', {
        files: files,
        type: typeof files,
        body: req.body
      });
      return res.status(400).json({ 
        error: 'Invalid files data',
        details: 'Files must be an array'
      });
    }

    if (!userId) {
      console.error('Ошибка: отсутствует userId');
      return res.status(400).json({ 
        error: 'Invalid request',
        details: 'userId is required'
      });
    }

    // Проверяем структуру каждого файла
    for (const file of files) {
      if (!file.path || !file.content) {
        console.error('Ошибка: некорректная структура файла:', file);
        return res.status(400).json({
          error: 'Invalid file structure',
          details: 'Each file must have path and content properties',
          invalidFile: file
        });
      }
    }

    // Добавляем задачу в очередь обработки файлов
    const fileJob = await fileQueue.add({
      files,
      userId
    });

    console.log('Задача обработки файлов добавлена в очередь:', {
      jobId: fileJob.id,
      filesCount: files.length
    });

    // Ожидаем завершения обработки
    const results = await fileJob.finished();

    console.log('Обработка файлов завершена:', {
      results: results,
      filesCount: results.length
    });

    res.json({ 
      success: true,
      files: results 
    });

  } catch (error) {
    console.error('Критическая ошибка при обработке файлов:', error);
    res.status(500).json({ 
      error: 'Failed to save files',
      details: error.message 
    });
  }
};

export const handleUpdateFiles = async (req, res) => {
  try {
    const { prompt, userId } = req.body;
    console.log('Получен запрос на обновление файлов:', { 
      userId,
      promptLength: prompt?.length 
    });

    if (!prompt || !userId) {
      console.error('Ошибка: отсутствует prompt или userId');
      return res.status(400).json({
        error: 'Invalid request',
        details: 'prompt and userId are required'
      });
    }

    // Добавляем задачу в очередь OpenAI
    const openaiJob = await openaiQueue.add({
      prompt,
      userId
    });

    console.log('Задача OpenAI добавлена в очередь:', {
      jobId: openaiJob.id
    });

    // Ожидаем ответ от OpenAI
    const response = JSON.parse(await openaiJob.finished());

    // Добавляем задачу в очередь обработки файлов
    const fileJob = await fileQueue.add({
      files: response.files,
      userId
    });

    console.log('Задача обработки файлов добавлена в очередь:', {
      jobId: fileJob.id,
      filesCount: response.files?.length
    });

    // Ожидаем завершения обработки файлов
    await fileJob.finished();

    res.json({
      success: true,
      message: 'Files updated successfully',
      description: response.description
    });
  } catch (error) {
    console.error('Критическая ошибка при обновлении файлов:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update files',
      details: error.message 
    });
  }
};