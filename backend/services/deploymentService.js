import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../config/supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const deploymentsDir = path.join(__dirname, '..', 'deployments');

export const deployFiles = async (userId, files, framework) => {
  try {
    console.log('Начало развертывания файлов:', {
      userId,
      filesCount: files?.length,
      framework
    });

    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new Error('Файлы для развертывания не предоставлены');
    }

    // Проверяем каждый файл
    files.forEach(file => {
      if (!file || !file.path || !file.content) {
        console.error('Некорректный файл:', file);
        throw new Error(`Некорректные данные файла: ${file?.path || 'путь не указан'}`);
      }
    });

    // Создаем директорию для проекта
    const projectDir = path.join(deploymentsDir, userId, framework);
    await fs.mkdir(projectDir, { recursive: true });

    // Записываем файлы
    for (const file of files) {
      const filePath = path.join(projectDir, file.path);
      const dirPath = path.dirname(filePath);
      
      // Создаем поддиректории если нужно
      await fs.mkdir(dirPath, { recursive: true });
      
      // Записываем содержимое файла
      await fs.writeFile(filePath, file.content);
      
      console.log(`Файл ${file.path} успешно сохранен`);
    }

    // Формируем URL для доступа к приложению
    const deploymentUrl = `/deployments/${userId}/${framework}`;

    // Обновляем запись в базе данных
    const { data: deployment, error } = await supabase
      .from('deployed_projects')
      .upsert({
        user_id: userId,
        framework,
        project_url: deploymentUrl,
        status: 'deployed',
        last_deployment: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка при обновлении статуса развертывания:', error);
      throw error;
    }

    console.log('Развертывание завершено успешно:', {
      deploymentUrl,
      projectId: deployment.id
    });

    return {
      success: true,
      deploymentUrl,
      deploymentId: deployment.id
    };

  } catch (error) {
    console.error('Ошибка при развертывании:', error);
    throw error;
  }
};