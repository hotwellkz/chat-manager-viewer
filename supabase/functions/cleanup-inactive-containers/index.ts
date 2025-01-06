import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting cleanup of inactive containers')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем все контейнеры, которые не использовались более 24 часов
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const { data: inactiveContainers, error: fetchError } = await supabase
      .from('docker_containers')
      .select('*')
      .lt('updated_at', twentyFourHoursAgo.toISOString())
      .neq('status', 'terminated')

    if (fetchError) {
      throw fetchError
    }

    console.log(`Found ${inactiveContainers?.length || 0} inactive containers`)

    // Обновляем статус каждого неактивного контейнера
    for (const container of inactiveContainers || []) {
      // Сначала останавливаем контейнер
      const { error: updateError } = await supabase
        .from('docker_containers')
        .update({
          status: 'stopping',
          container_logs: 'Container marked for cleanup due to inactivity',
          updated_at: new Date().toISOString()
        })
        .eq('id', container.id)

      if (updateError) {
        console.error(`Error updating container ${container.id}:`, updateError)
        continue
      }

      // Добавляем метрику о остановке
      await supabase
        .from('container_metrics')
        .insert({
          container_id: container.id,
          error_type: 'cleanup',
          error_severity: 'info',
          error_count: 0,
          container_logs: 'Container stopped due to inactivity'
        })

      // Даем небольшую задержку перед удалением
      await new Promise(resolve => setTimeout(resolve, 5000))

      // Удаляем контейнер
      const { error: deleteError } = await supabase
        .from('docker_containers')
        .update({
          status: 'terminated',
          container_logs: 'Container terminated due to inactivity',
          updated_at: new Date().toISOString()
        })
        .eq('id', container.id)

      if (deleteError) {
        console.error(`Error deleting container ${container.id}:`, deleteError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${inactiveContainers?.length || 0} inactive containers`,
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    console.error('Error during cleanup:', error)
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
