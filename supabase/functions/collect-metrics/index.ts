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
    const { containerId, metrics } = await req.json()
    console.log('Получены метрики:', { containerId, metrics })
    
    if (!containerId || !metrics) {
      throw new Error('Container ID and metrics are required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Сохраняем метрики
    const { error: metricsError } = await supabase
      .from('container_metrics')
      .insert({
        container_id: containerId,
        cpu_usage: metrics.cpu,
        memory_usage: metrics.memory,
        memory_limit: metrics.memoryLimit,
        error_count: metrics.errors || 0
      })

    if (metricsError) {
      console.error('Ошибка сохранения метрик:', metricsError)
      throw metricsError
    }

    // Проверяем превышение лимитов
    if (metrics.cpu > 80 || metrics.memory > metrics.memoryLimit * 0.9) {
      console.warn(`Высокая нагрузка на контейнер ${containerId}`)
      
      const { error: updateError } = await supabase
        .from('docker_containers')
        .update({ 
          status: 'warning',
          container_logs: `Высокая нагрузка: CPU ${metrics.cpu}%, Память ${metrics.memory}MB`
        })
        .eq('id', containerId)

      if (updateError) {
        console.error('Ошибка обновления статуса:', updateError)
        throw updateError
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Метрики успешно сохранены'
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
        status: 400
      }
    )
  }
})