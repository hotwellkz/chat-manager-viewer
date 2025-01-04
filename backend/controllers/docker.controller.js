import { supabase } from '../config/supabase.js';

export const createContainer = async (req, res) => {
  try {
    console.log('Создание нового контейнера:', req.body);
    const { userId, projectId, framework } = req.body;

    if (!userId || !projectId || !framework) {
      console.error('Отсутствуют обязательные параметры:', { userId, projectId, framework });
      return res.status(400).json({ 
        error: 'Отсутствуют обязательные параметры',
        details: { userId, projectId, framework }
      });
    }

    // Создаем запись о контейнере
    const { data: container, error: createError } = await supabase
      .from('docker_containers')
      .insert({
        user_id: userId,
        project_id: projectId,
        framework,
        status: 'initializing',
        container_logs: 'Инициализация контейнера...'
      })
      .select()
      .single();

    if (createError) {
      console.error('Ошибка при создании контейнера в БД:', createError);
      throw createError;
    }

    console.log('Контейнер успешно создан в БД:', container);

    // Имитируем процесс создания и запуска
    setTimeout(async () => {
      try {
        // Обновляем статус на 'creating'
        const { error: updateError1 } = await supabase
          .from('docker_containers')
          .update({ 
            status: 'creating',
            container_logs: 'Создание окружения контейнера...'
          })
          .eq('id', container.id);

        if (updateError1) {
          console.error('Ошибка при обновлении статуса на creating:', updateError1);
          throw updateError1;
        }

        // Имитируем процесс настройки
        setTimeout(async () => {
          try {
            // Обновляем статус на 'starting'
            const { error: updateError2 } = await supabase
              .from('docker_containers')
              .update({ 
                status: 'starting',
                container_id: `container_${container.id.slice(0, 8)}`,
                container_logs: 'Запуск сервисов контейнера...'
              })
              .eq('id', container.id);

            if (updateError2) {
              console.error('Ошибка при обновлении статуса на starting:', updateError2);
              throw updateError2;
            }

            // Финальное обновление - контейнер запущен
            setTimeout(async () => {
              try {
                const { error: updateError3 } = await supabase
                  .from('docker_containers')
                  .update({ 
                    status: 'running',
                    container_url: `https://container-${container.id.slice(0, 8)}.lovable.dev`,
                    port: 3000,
                    container_logs: 'Контейнер успешно запущен'
                  })
                  .eq('id', container.id);

                if (updateError3) {
                  console.error('Ошибка при финальном обновлении статуса:', updateError3);
                  throw updateError3;
                }

                console.log('Контейнер успешно запущен:', container.id);
              } catch (error) {
                console.error('Ошибка при финальном обновлении:', error);
                await handleContainerError(container.id, error);
              }
            }, 2000);
          } catch (error) {
            console.error('Ошибка при запуске контейнера:', error);
            await handleContainerError(container.id, error);
          }
        }, 2000);
      } catch (error) {
        console.error('Ошибка при создании окружения:', error);
        await handleContainerError(container.id, error);
      }
    }, 2000);

    res.json({ 
      success: true, 
      containerId: container.id,
      message: 'Контейнер создается' 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Ошибка при создании контейнера',
      details: error.message 
    });
  }
};

// Вспомогательная функция для обработки ошибок контейнера
async function handleContainerError(containerId, error) {
  try {
    const { error: updateError } = await supabase
      .from('docker_containers')
      .update({ 
        status: 'error',
        container_logs: `Ошибка: ${error.message}`
      })
      .eq('id', containerId);

    if (updateError) {
      console.error('Ошибка при обновлении статуса ошибки:', updateError);
    }
  } catch (e) {
    console.error('Ошибка при обработке ошибки контейнера:', e);
  }
}

export const getContainerStatus = async (req, res) => {
  try {
    const { containerId } = req.params;
    console.log('Получение статуса контейнера:', containerId);

    const { data: container, error } = await supabase
      .from('docker_containers')
      .select('*')
      .eq('id', containerId)
      .single();

    if (error) {
      console.error('Ошибка при получении статуса:', error);
      throw error;
    }

    res.json({ 
      success: true, 
      status: container.status,
      url: container.container_url,
      logs: container.container_logs
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Ошибка при получении статуса контейнера',
      details: error.message 
    });
  }
};

export const deleteContainer = async (req, res) => {
  try {
    const { containerId } = req.params;
    console.log('Удаление контейнера:', containerId);

    // Сначала получаем информацию о контейнере
    const { data: container, error: fetchError } = await supabase
      .from('docker_containers')
      .select('*')
      .eq('id', containerId)
      .single();

    if (fetchError) {
      console.error('Ошибка при получении информации о контейнере:', fetchError);
      throw fetchError;
    }

    // Проверяем, что контейнер существует
    if (!container) {
      return res.status(404).json({ 
        error: 'Контейнер не найден' 
      });
    }

    // Обновляем статус на 'stopping'
    const { error: updateError } = await supabase
      .from('docker_containers')
      .update({ 
        status: 'stopping',
        container_logs: 'Остановка сервисов контейнера...'
      })
      .eq('id', containerId);

    if (updateError) {
      console.error('Ошибка при обновлении статуса на stopping:', updateError);
      throw updateError;
    }

    // Имитируем процесс остановки
    setTimeout(async () => {
      try {
        const { error: deleteError } = await supabase
          .from('docker_containers')
          .delete()
          .eq('id', containerId);

        if (deleteError) {
          console.error('Ошибка при удалении контейнера:', deleteError);
          throw deleteError;
        }

        console.log('Контейнер успешно удален:', containerId);
      } catch (error) {
        console.error('Ошибка при удалении контейнера:', error);
        await handleContainerError(containerId, error);
      }
    }, 2000);

    res.json({ 
      success: true, 
      message: 'Контейнер останавливается и будет удален' 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Ошибка при удалении контейнера',
      details: error.message 
    });
  }
};