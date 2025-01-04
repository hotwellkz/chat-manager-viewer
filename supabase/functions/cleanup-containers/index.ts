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

    // Получаем все контейнеры, которые не обновлялись более 24 часов
    const { data: inactiveContainers, error: fetchError } = await supabase
      .from('docker_containers')
      .select('*')
      .eq('status', 'running')
      .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (fetchError) {
      throw fetchError
    }

    console.log(`Found ${inactiveContainers?.length || 0} inactive containers`)

    if (!inactiveContainers || inactiveContainers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No inactive containers found' 
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      )
    }

    // Обновляем статус контейнеров на 'stopped'
    const { error: updateError } = await supabase
      .from('docker_containers')
      .update({ 
        status: 'stopped',
        container_logs: 'Container stopped due to inactivity'
      })
      .in('id', inactiveContainers.map(c => c.id))

    if (updateError) {
      throw updateError
    }

    // В реальном приложении здесь будет код для остановки Docker контейнеров
    // через Docker API или другой механизм управления контейнерами

    console.log(`Successfully stopped ${inactiveContainers.length} containers`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Stopped ${inactiveContainers.length} inactive containers`,
        containers: inactiveContainers
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
        status: 400
      }
    )
  }
})