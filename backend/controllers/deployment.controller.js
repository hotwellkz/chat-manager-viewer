import { deployFiles } from '../services/deploymentService.js';
import { supabase } from '../config/supabase.js';

export const handleDeployment = async (req, res) => {
  try {
    const { userId, files, framework } = req.body;

    // Добавляем валидацию входных данных
    if (!userId || !files || !framework) {
      console.error('Missing required fields:', { userId, filesCount: files?.length, framework });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, files, or framework'
      });
    }

    if (!Array.isArray(files) || files.length === 0) {
      console.error('Files must be a non-empty array');
      return res.status(400).json({
        success: false,
        error: 'Files must be a non-empty array'
      });
    }

    console.log('Starting deployment process for user:', userId, 'framework:', framework);

    // Разворачиваем файлы
    const result = await deployFiles(userId, files, framework);

    res.json(result);

  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to deploy project'
    });
  }
};