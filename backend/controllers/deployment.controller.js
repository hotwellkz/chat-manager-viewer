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
          last_deployment: new Date().toISOString()
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
          status: 'preparing'
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
          last_deployment: new Date().toISOString()
        })
        .eq('id', deployment.id);

      res.status(408).json({ 
        success: false, 
        error: 'Превышено время ожидания сборки (5 минут)'
      });
    }, BUILD_TIMEOUT);

    // Имитация процесса упаковки файлов с более частыми обновлениями
    await supabase
      .from('deployed_projects')
      .update({ 
        status: 'packaging',
      })
      .eq('id', deployment.id);

    console.log('Packaging files...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Имитация процесса сборки с промежуточными обновлениями
    await supabase
      .from('deployed_projects')
      .update({ 
        status: 'building',
      })
      .eq('id', deployment.id);

    console.log('Building project...');
    
    // Добавляем промежуточные статусы сборки
    const buildSteps = [
      'Инициализация сборки...',
      'Установка зависимостей...',
      'Компиляция проекта...',
      'Оптимизация сборки...',
      'Подготовка Docker образа...'
    ];

    for (const step of buildSteps) {
      await supabase
        .from('deployed_projects')
        .update({ 
          status: 'building',
          container_logs: step
        })
        .eq('id', deployment.id);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Имитация процесса развертывания
    await supabase
      .from('deployed_projects')
      .update({ 
        status: 'deploying',
      })
      .eq('id', deployment.id);

    console.log('Deploying project...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Очищаем таймаут, так как процесс успешно завершен
    clearTimeout(timeoutId);

    // Генерируем URL для демонстрации
    const deploymentUrl = `https://lovable${deployment.id.slice(0, 6)}.netlify.app`;

    // Обновляем статус и URL проекта
    const { error: updateError } = await supabase
      .from('deployed_projects')
      .update({ 
        status: 'deployed',
        project_url: deploymentUrl,
        last_deployment: new Date().toISOString(),
        container_logs: 'Развертывание успешно завершено'
      })
      .eq('id', deployment.id);

    if (updateError) {
      console.error('Error updating deployment status:', updateError);
      throw updateError;
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