import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    if (action === 'auth') {
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

      const data: GitHubAuthResponse = await response.json()

      if (data.access_token) {
        // Получаем информацию о пользователе GitHub
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        })
        const userData = await userResponse.json()

        // Получаем текущего пользователя Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
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

    throw new Error('Invalid action')
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