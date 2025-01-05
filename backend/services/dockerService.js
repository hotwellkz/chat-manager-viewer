import { docker } from '../config/docker.js';
import { supabase } from '../config/supabase.js';

export const createAndStartContainer = async (userId, projectId, framework, files) => {
  try {
    console.log('Starting container creation for user:', userId);

    // Создаем временную директорию для файлов проекта
    const containerName = `app-${projectId.slice(0, 8)}`;
    
    // Подготавливаем конфигурацию контейнера
    const containerConfig = {
      Image: framework === 'react' ? 'node:18' : 'node:18',
      name: containerName,
      ExposedPorts: {
        '3000/tcp': {}
      },
      HostConfig: {
        PortBindings: {
          '3000/tcp': [{ HostPort: '3000' }]
        }
      },
      Env: [
        `PROJECT_ID=${projectId}`,
        `USER_ID=${userId}`
      ]
    };

    // Проверяем подключение к Docker
    await docker.ping();
    console.log('Docker connection verified');

    // Создаем контейнер
    console.log('Creating container with config:', containerConfig);
    const container = await docker.createContainer(containerConfig);
    
    // Обновляем статус в базе данных
    await supabase
      .from('docker_containers')
      .update({ 
        container_id: container.id,
        status: 'created',
        container_logs: 'Container created successfully'
      })
      .eq('project_id', projectId);

    // Запускаем контейнер
    console.log('Starting container:', container.id);
    await container.start();

    // Получаем информацию о контейнере
    const containerInfo = await container.inspect();
    const containerUrl = `http://${containerInfo.NetworkSettings.IPAddress}:3000`;

    // Обновляем статус после запуска
    await supabase
      .from('docker_containers')
      .update({ 
        status: 'running',
        container_url: containerUrl,
        container_logs: 'Container started successfully'
      })
      .eq('project_id', projectId);

    return {
      containerId: container.id,
      containerName,
      containerUrl,
      status: 'running'
    };

  } catch (error) {
    console.error('Error in createAndStartContainer:', error);
    
    // Обновляем статус с ошибкой
    await supabase
      .from('docker_containers')
      .update({ 
        status: 'error',
        container_logs: `Error: ${error.message}`
      })
      .eq('project_id', projectId);

    throw error;
  }
};

export const stopAndRemoveContainer = async (containerId) => {
  try {
    const container = docker.getContainer(containerId);
    
    // Останавливаем контейнер
    await container.stop();
    console.log('Container stopped:', containerId);
    
    // Удаляем контейнер
    await container.remove();
    console.log('Container removed:', containerId);
    
    return true;
  } catch (error) {
    console.error('Error in stopAndRemoveContainer:', error);
    throw error;
  }
};

export const getContainerLogs = async (containerId) => {
  try {
    const container = docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 100,
      follow: false
    });
    
    return logs.toString('utf8');
  } catch (error) {
    console.error('Error getting container logs:', error);
    throw error;
  }
};