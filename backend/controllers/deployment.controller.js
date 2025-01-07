import { deployFiles } from '../services/deploymentService.js';
import { supabase } from '../config/supabase.js';

export const handleDeployment = async (req, res) => {
  try {
    const { userId, files, framework, platform } = req.body;

    console.log('Получены данные для развертывания:', {
      userId,
      filesCount: files?.length,
      framework,
      platform,
      files: files?.map(f => ({ path: f.path }))
    });

    if (!userId) {
      console.error('Отсутствует userId');
      return res.status(400).json({
        success: false,
        error: 'Отсутствует идентификатор пользователя'
      });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      console.error('Некорректные данные файлов:', { files });
      return res.status(400).json({
        success: false,
        error: 'Необходимо предоставить хотя бы один файл'
      });
    }

    // Проверяем каждый файл перед развертыванием
    const validFiles = files.every(file => 
      file && 
      typeof file.path === 'string' && 
      typeof file.content === 'string'
    );

    if (!validFiles) {
      console.error('Обнаружены некорректные файлы:', files);
      return res.status(400).json({
        success: false,
        error: 'Некоторые файлы имеют некорректный формат'
      });
    }

    let result;
    
    if (platform === 'vercel') {
      // Вызываем Edge Function для деплоя на Vercel
      const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/vercel-deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ userId, files, platform })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка при деплое на Vercel');
      }

      result = await response.json();
    } else {
      // Стандартный деплой
      result = await deployFiles(userId, files, framework);
    }

    console.log('Результат развертывания:', result);
    res.json(result);

  } catch (error) {
    console.error('Ошибка развертывания:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Не удалось развернуть проект'
    });
  }
};