import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../config/supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const deploymentsDir = path.join(__dirname, '..', 'deployments');
const tempDir = path.join(__dirname, '..', 'temp');

// Функция для создания временных файлов
const createTempFiles = async (userId, files) => {
  try {
    console.log('Создание временных файлов:', {
      userId,
      filesCount: files?.length
    });

    // Создаем временную директорию для пользователя
    const userTempDir = path.join(tempDir, userId);
    await fs.mkdir(userTempDir, { recursive: true });

    const tempFiles = [];
    for (const file of files) {
      const filePath = path.join(userTempDir, file.path);
      const dirPath = path.dirname(filePath);
      
      console.log('Сохранение временного файла:', {
        path: file.path,
        dirPath,
        filePath
      });

      // Создаем поддиректории если нужно
      await fs.mkdir(dirPath, { recursive: true });
      
      // Записываем содержимое файла
      await fs.writeFile(filePath, file.content);
      
      tempFiles.push({
        originalPath: file.path,
        tempPath: filePath
      });
    }

    return tempFiles;
  } catch (error) {
    console.error('Ошибка при создании временных файлов:', error);
    throw error;
  }
};

// Функция очистки временных файлов
const cleanupTempFiles = async (userId) => {
  try {
    const userTempDir = path.join(tempDir, userId);
    await fs.rm(userTempDir, { recursive: true, force: true });
    console.log('Временные файлы очищены:', userTempDir);
  } catch (error) {
    console.error('Ошибка при очистке временных файлов:', error);
  }
};

export const deployFiles = async (userId, files, framework) => {
  try {
    console.log('Начало развертывания файлов:', {
      userId,
      filesCount: files?.length,
      framework,
      files: files.map(f => ({ path: f.path }))
    });

    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new Error('Файлы для развертывания не предоставлены');
    }

    // Проверяем каждый файл
    files.forEach((file, index) => {
      if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') {
        console.error('Некорректный файл:', { index, file });
        throw new Error(`Некорректные данные файла ${index}: ${file?.path || 'путь не указан'}`);
      }
    });

    // Сначала создаем временные файлы
    const tempFiles = await createTempFiles(userId, files);
    console.log('Временные файлы созданы:', tempFiles);

    // Создаем директорию для проекта
    const projectDir = path.join(deploymentsDir, userId, framework);
    await fs.mkdir(projectDir, { recursive: true });

    // Копируем файлы из временной директории в директорию проекта
    for (const file of files) {
      const filePath = path.join(projectDir, file.path);
      const dirPath = path.dirname(filePath);
      
      console.log('Копирование файла в проект:', {
        path: file.path,
        dirPath,
        filePath
      });

      // Создаем поддиректории если нужно
      await fs.mkdir(dirPath, { recursive: true });
      
      // Записываем содержимое файла
      await fs.writeFile(filePath, file.content);
      
      console.log(`Файл ${file.path} успешно скопирован в проект`);
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

    // Очищаем временные файлы после успешного развертывания
    await cleanupTempFiles(userId);

    return {
      success: true,
      deploymentUrl,
      deploymentId: deployment.id
    };

  } catch (error) {
    console.error('Ошибка при развертывании:', error);
    // Пытаемся очистить временные файлы даже в случае ошибки
    await cleanupTempFiles(userId);
    throw error;
  }
};