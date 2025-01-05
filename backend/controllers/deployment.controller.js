import { supabase } from '../config/supabase.js';

export const handleDeployment = async (req, res) => {
  try {
    const { userId, files, framework } = req.body;
    const BUILD_TIMEOUT = 300000; // 5 минут максимум на сборку
    let timeoutId;

    console.log('Starting deployment process for user:', userId);

    // Проверяем существующие проекты пользователя
    const { data: existingProjects, error: fetchError } = await supabase
      .from('deployed_projects')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'preparing')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching existing projects:', fetchError);
      throw fetchError;
    }

    let deployment;

    if (existingProjects && existingProjects.length > 0) {
      // Обновляем существующий проект
      const { data: updatedDeployment, error: updateError } = await supabase
        .from('deployed_projects')
        .update({
          framework: framework,
          status: 'preparing',
          last_deployment: new Date().toISOString(),
          container_logs: 'Инициализация процесса сборки...'
        })
        .eq('id', existingProjects[0].id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating existing deployment:', updateError);
        throw updateError;
      }

      deployment = updatedDeployment;
      console.log('Updated existing deployment:', deployment.id);
    } else {
      // Создаем новую запись о развертывании
      const { data: newDeployment, error: deploymentError } = await supabase
        .from('deployed_projects')
        .insert({
          user_id: userId,
          framework: framework,
          status: 'preparing',
          container_logs: 'Создание нового проекта...'
        })
        .select()
        .single();

      if (deploymentError) {
        console.error('Error creating deployment record:', deploymentError);
        throw deploymentError;
      }

      deployment = newDeployment;
      console.log('Created new deployment record:', deployment.id);
    }

    // Устанавливаем таймаут для всего процесса
    timeoutId = setTimeout(async () => {
      console.error('Deployment timeout reached for:', deployment.id);
      await supabase
        .from('deployed_projects')
        .update({ 
          status: 'error',
          last_deployment: new Date().toISOString(),
          container_logs: 'Превышено время ожидания сборки (5 минут)'
        })
        .eq('id', deployment.id);

      res.status(408).json({ 
        success: false, 
        error: 'Превышено время ожидания сборки (5 минут)'
      });
    }, BUILD_TIMEOUT);

    // Обновляем статус и логи для каждого этапа
    const updateStatus = async (status, logs) => {
      const { error } = await supabase
        .from('deployed_projects')
        .update({ 
          status,
          container_logs: logs,
          last_deployment: new Date().toISOString()
        })
        .eq('id', deployment.id);

      if (error) {
        console.error(`Error updating status to ${status}:`, error);
        throw error;
      }
      console.log(`Updated status to ${status} for deployment:`, deployment.id);
    };

    // Имитация процесса упаковки файлов с обновлением статуса
    await updateStatus('packaging', 'Упаковка файлов проекта...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Имитация процесса сборки с промежуточными обновлениями
    await updateStatus('building', 'Начало сборки Docker образа...');
    
    // Добавляем промежуточные статусы сборки
    const buildSteps = [
      'Инициализация сборки Docker образа...',
      'Установка зависимостей проекта...',
      'Компиляция исходного кода...',
      'Оптимизация сборки...',
      'Создание Docker образа...'
    ];

    for (const step of buildSteps) {
      await updateStatus('building', step);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Имитация процесса развертывания
    await updateStatus('deploying', 'Запуск Docker контейнера...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Очищаем таймаут, так как процесс успешно завершен
    clearTimeout(timeoutId);

    // Генерируем URL для демонстрации
    const deploymentUrl = `https://lovable${deployment.id.slice(0, 6)}.netlify.app`;

    // Обновляем статус и URL проекта
    const { error: finalUpdateError } = await supabase
      .from('deployed_projects')
      .update({ 
        status: 'deployed',
        project_url: deploymentUrl,
        last_deployment: new Date().toISOString(),
        container_logs: 'Развертывание успешно завершено'
      })
      .eq('id', deployment.id);

    if (finalUpdateError) {
      console.error('Error updating final deployment status:', finalUpdateError);
      throw finalUpdateError;
    }

    console.log('Deployment completed successfully:', deploymentUrl);

    res.json({ 
      success: true, 
      deploymentUrl,
      deploymentId: deployment.id
    });
  } catch (error) {
    console.error('Deployment error:', error);

    // Обновляем статус на ошибку, если есть ID развертывания
    if (error.deploymentId) {
      await supabase
        .from('deployed_projects')
        .update({ 
          status: 'error',
          last_deployment: new Date().toISOString(),
          container_logs: `Ошибка: ${error.message || 'Неизвестная ошибка'}`
        })
        .eq('id', error.deploymentId);
    }

    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to deploy project'
    });
  }
};