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

    // Получаем неактивные контейнеры (не обновлялись более 24 часов)
    const { data: containers, error: fetchError } = await supabase
      .from('docker_containers')
      .select('*')
      .eq('status', 'running')
      .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (fetchError) {
      throw fetchError
    }

    if (!containers || containers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Неактивные контейнеры не найдены' 
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      )
    }

    // Обновляем статус контейнеров
    const { error: updateError } = await supabase
      .from('docker_containers')
      .update({ 
        status: 'stopped',
        container_logs: 'Контейнер остановлен из-за неактивности'
      })
      .in('id', containers.map(c => c.id))

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Остановлено ${containers.length} неактивных контейнеров`,
        containers: containers
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