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
    console.log('Настройка расписания очистки контейнеров')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Создаем задачу в cron для запуска очистки каждые 12 часов
    const { data, error } = await supabase.rpc('create_cleanup_schedule', {
      schedule: '0 */12 * * *', // Каждые 12 часов
      function_name: 'cleanup-inactive-containers'
    })

    if (error) throw error

    // Добавляем запись в метрики для отслеживания
    const { error: metricsError } = await supabase
      .from('container_metrics')
      .insert({
        error_count: 0,
        container_logs: 'Настроено расписание автоматической очистки'
      })

    if (metricsError) {
      console.warn('Ошибка при сохранении метрик:', metricsError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Расписание очистки успешно настроено',
        schedule: '0 */12 * * *',
        data 
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