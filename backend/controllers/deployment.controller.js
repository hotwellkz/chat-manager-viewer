import { supabase } from '../config/supabase.js';
import { createAndStartContainer, getContainerLogs } from '../services/dockerService.js';

export const handleDeployment = async (req, res) => {
  try {
    const { userId, files, framework } = req.body;
    const BUILD_TIMEOUT = 300000; // 5 минут максимум на сборку
    let timeoutId;

    console.log('Starting deployment process for user:', userId);

    // Создаем новую запись о развертывании сразу
    const { data: deployment, error: deploymentError } = await supabase
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

    console.log('Created new deployment record:', deployment.id);

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

    try {
      // Сразу запускаем создание и старт контейнера
      const containerResult = await createAndStartContainer(
        userId,
        deployment.id,
        framework,
        files
      );

      const deploymentUrl = `https://docker-jy4o.onrender.com/container/${deployment.id}`;

      // Обновляем финальный статус
      const { error: finalUpdateError } = await supabase
        .from('deployed_projects')
        .update({ 
          status: 'deployed',
          project_url: deploymentUrl,
          last_deployment: new Date().toISOString(),
          container_logs: await getContainerLogs(containerResult.containerId)
        })
        .eq('id', deployment.id);

      if (finalUpdateError) {
        console.error('Error updating final deployment status:', finalUpdateError);
        throw finalUpdateError;
      }

      clearTimeout(timeoutId);

      console.log('Deployment completed successfully:', deploymentUrl);

      res.json({ 
        success: true, 
        deploymentUrl,
        deploymentId: deployment.id,
        containerId: containerResult.containerId
      });

    } catch (error) {
      console.error('Error during container operations:', error);
      
      await supabase
        .from('deployed_projects')
        .update({ 
          status: 'error',
          last_deployment: new Date().toISOString(),
          container_logs: `Ошибка: ${error.message || 'Неизвестная ошибка'}`
        })
        .eq('id', deployment.id);

      throw error;
    }

  } catch (error) {
    console.error('Deployment error:', error);

    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to deploy project'
    });
  }
};