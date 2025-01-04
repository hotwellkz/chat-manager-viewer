import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const upgrade = req.headers.get('upgrade') || ''
  
  if (upgrade.toLowerCase() != 'websocket') {
    return new Response('Expected WebSocket connection', { 
      status: 400,
      headers: corsHeaders 
    })
  }

  // Получаем JWT из URL параметров
  const url = new URL(req.url)
  const jwt = url.searchParams.get('jwt')
  if (!jwt) {
    return new Response('Auth token not provided', { 
      status: 403,
      headers: corsHeaders 
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Проверяем токен
  const { error: authError, data: { user } } = await supabase.auth.getUser(jwt)
  if (authError || !user) {
    console.error('Auth error:', authError)
    return new Response('Invalid token', { 
      status: 403,
      headers: corsHeaders 
    })
  }

  const { socket, response } = Deno.upgradeWebSocket(req)

  socket.onopen = async () => {
    console.log('Client connected')

    // Подписываемся на изменения в таблице docker_containers
    const channel = supabase.channel('container-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'docker_containers',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Container update:', payload)
          socket.send(JSON.stringify(payload))
        }
      )
      .subscribe()

    socket.onclose = () => {
      console.log('Client disconnected')
      supabase.removeChannel(channel)
    }
  }

  socket.onerror = (e) => {
    console.error('WebSocket error:', e)
  }

  return response
})