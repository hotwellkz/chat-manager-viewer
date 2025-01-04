import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Запуск очистки неактивных контейнеров')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем список неактивных контейнеров (не использовались более 24 часов)
    const { data: inactiveContainers, error: fetchError } = await supabase
      .from('docker_containers')
      .select('*')
      .eq('status', 'running')
      .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (fetchError) {
      throw fetchError
    }

    console.log(`Найдено ${inactiveContainers?.length || 0} неактивных контейнеров`)

    const results = []
    
    // Обрабатываем каждый неактивный контейнер
    for (const container of inactiveContainers || []) {
      try {
        // Обновляем статус на stopping
        const { error: updateError } = await supabase
          .from('docker_containers')
          .update({ 
            status: 'stopping',
            container_logs: 'Автоматическая остановка неактивного контейнера...'
          })
          .eq('id', container.id)

        if (updateError) throw updateError

        // Удаляем контейнер после небольшой задержки
        setTimeout(async () => {
          const { error: deleteError } = await supabase
            .from('docker_containers')
            .delete()
            .eq('id', container.id)

          if (deleteError) {
            console.error(`Ошибка при удалении контейнера ${container.id}:`, deleteError)
          } else {
            console.log(`Контейнер ${container.id} успешно удален`)
          }
        }, 2000)

        results.push({
          containerId: container.id,
          status: 'scheduled_for_deletion'
        })
      } catch (error) {
        console.error(`Ошибка при обработке контейнера ${container.id}:`, error)
        results.push({
          containerId: container.id,
          status: 'error',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Обработано ${results.length} неактивных контейнеров`,
        results 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    )
  }
})