import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GitHubAuthResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Создаем клиент Supabase с сервисной ролью
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { code, action } = await req.json()

    if (action === 'get-client-id') {
      return new Response(
        JSON.stringify({ 
          clientId: Deno.env.get('GITHUB_CLIENT_ID') 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (action === 'auth' && code) {
      console.log('Получен код авторизации:', code)
      
      // Обмен кода на токен доступа
      const params = new URLSearchParams({
        client_id: Deno.env.get('GITHUB_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('GITHUB_CLIENT_SECRET') ?? '',
        code: code,
      })

      const response = await fetch(
        `https://github.com/login/oauth/access_token?${params}`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
          },
        }
      )

      console.log('Ответ от GitHub:', response.status)
      const data: GitHubAuthResponse = await response.json()
      console.log('Данные токена:', data)

      if (data.access_token) {
        // Получаем информацию о пользователе GitHub
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        })
        const userData = await userResponse.json()
        console.log('Данные пользователя GitHub:', userData)

        // Получаем текущего пользователя Supabase из токена
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
          throw new Error('No authorization header')
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        )
        
        if (authError || !user) {
          console.error('Ошибка получения пользователя:', authError)
          throw new Error('Unauthorized')
        }

        // Сохраняем токен в базе данных
        const { error: dbError } = await supabase
          .from('github_integrations')
          .upsert({
            user_id: user.id,
            access_token: data.access_token,
            repository_name: userData.login + '/lovable-project',
            repository_url: `https://github.com/${userData.login}/lovable-project`,
            updated_at: new Date().toISOString(),
          })

        if (dbError) {
          console.error('Ошибка сохранения в БД:', dbError)
          throw dbError
        }

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    throw new Error('Invalid action or missing code')
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})