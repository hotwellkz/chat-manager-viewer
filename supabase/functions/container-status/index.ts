import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400'
}

const PING_INTERVAL = 30000; // 30 seconds
const PONG_TIMEOUT = 10000; // 10 seconds

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const upgrade = req.headers.get('upgrade') || ''
  if (upgrade.toLowerCase() != 'websocket') {
    return new Response('Expected WebSocket connection', { 
      status: 400,
      headers: corsHeaders 
    })
  }

  const url = new URL(req.url)
  const jwt = url.searchParams.get('jwt')
  const containerId = url.searchParams.get('containerId')
  
  if (!jwt || !containerId) {
    return new Response('Auth token and container ID required', { 
      status: 403,
      headers: corsHeaders 
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { error: authError, data: { user } } = await supabase.auth.getUser(jwt)
  if (authError || !user) {
    console.error('Auth error:', authError)
    return new Response('Invalid token', { 
      status: 403,
      headers: corsHeaders 
    })
  }

  const { socket, response } = Deno.upgradeWebSocket(req)
  let pingTimeout: number | undefined;
  let pingInterval: number | undefined;

  const heartbeat = () => {
    if (pingTimeout) clearTimeout(pingTimeout);
    
    pingTimeout = setTimeout(() => {
      console.log('Client connection timed out');
      socket.close();
    }, PONG_TIMEOUT);
  };

  const startPingInterval = () => {
    pingInterval = setInterval(() => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
        heartbeat();
      }
    }, PING_INTERVAL);
  };

  socket.onopen = async () => {
    console.log('Client connected');
    
    // Получаем текущее состояние контейнера
    const { data: container, error: containerError } = await supabase
      .from('docker_containers')
      .select('*')
      .eq('id', containerId)
      .eq('user_id', user.id)
      .single();

    if (containerError) {
      console.error('Error fetching container:', containerError);
      socket.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to fetch container state' 
      }));
    } else if (container) {
      socket.send(JSON.stringify({ 
        type: 'state', 
        data: container 
      }));
    }

    // Подписываемся на изменения контейнера
    const channel = supabase.channel('container-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'docker_containers',
          filter: `id=eq.${containerId}`
        },
        (payload) => {
          if (socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify({ 
              type: 'update', 
              data: payload.new 
            }));
          }
        }
      )
      .subscribe();

    startPingInterval();
    heartbeat();

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'pong') {
        heartbeat();
      }
    };

    socket.onclose = () => {
      console.log('Client disconnected');
      if (pingInterval) clearInterval(pingInterval);
      if (pingTimeout) clearTimeout(pingTimeout);
      supabase.removeChannel(channel);
    };
  };

  socket.onerror = (e) => {
    console.error('WebSocket error:', e);
    if (pingInterval) clearInterval(pingInterval);
    if (pingTimeout) clearTimeout(pingTimeout);
  };

  return response;
});