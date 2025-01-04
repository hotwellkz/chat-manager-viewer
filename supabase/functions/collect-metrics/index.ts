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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем все активные контейнеры
    const { data: containers, error: containersError } = await supabase
      .from('docker_containers')
      .select('*')
      .eq('status', 'running')

    if (containersError) {
      console.error('Error fetching containers:', containersError)
      throw containersError
    }

    // Для каждого контейнера собираем метрики
    for (const container of containers || []) {
      // В реальном приложении здесь будет логика получения реальных метрик
      // Сейчас генерируем тестовые данные
      const metrics = {
        container_id: container.id,
        cpu_usage: Math.random() * 100, // CPU usage в процентах
        memory_usage: Math.random() * 512, // Memory usage в МБ
        memory_limit: 512, // Memory limit в МБ
        error_count: Math.floor(Math.random() * 5), // Случайное количество ошибок
      }

      const { error: metricsError } = await supabase
        .from('container_metrics')
        .insert(metrics)

      if (metricsError) {
        console.error('Error inserting metrics:', metricsError)
        throw metricsError
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})