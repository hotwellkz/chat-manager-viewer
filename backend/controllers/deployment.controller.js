import { deployFiles } from '../services/deploymentService.js';
import { supabase } from '../config/supabase.js';

export const handleDeployment = async (req, res) => {
  try {
    const { userId, files, framework } = req.body;

    // Улучшенная валидация входных данных
    if (!userId) {
      console.error('Отсутствует userId');
      return res.status(400).json({
        success: false,
        error: 'Отсутствует идентификатор пользователя'
      });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      console.error('Некорректные данные файлов:', { filesCount: files?.length });
      return res.status(400).json({
        success: false,
        error: 'Необходимо предоставить хотя бы один файл'
      });
    }

    if (!framework) {
      console.error('Не указан фреймворк');
      return res.status(400).json({
        success: false,
        error: 'Необходимо указать фреймворк'
      });
    }

    console.log('Начало процесса развертывания:', {
      userId,
      filesCount: files.length,
      framework
    });

    // Проверяем каждый файл перед развертыванием
    const validFiles = files.every(file => 
      file && 
      typeof file.path === 'string' && 
      typeof file.content === 'string'
    );

    if (!validFiles) {
      console.error('Обнаружены некорректные файлы');
      return res.status(400).json({
        success: false,
        error: 'Некоторые файлы имеют некорректный формат'
      });
    }

    // Разворачиваем файлы
    const result = await deployFiles(userId, files, framework);

    res.json(result);

  } catch (error) {
    console.error('Ошибка развертывания:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Не удалось развернуть проект'
    });
  }
};