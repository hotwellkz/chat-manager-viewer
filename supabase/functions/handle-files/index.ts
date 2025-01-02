import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем пользователя из токена
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { files } = await req.json()

    const results = []

    for (const file of files) {
      const filePath = `${user.id}/${crypto.randomUUID()}-${file.path.split('/').pop()}`
      
      // Сохраняем содержимое файла
      const { error: uploadError } = await supabaseClient.storage
        .from('project_files')
        .upload(filePath, new Blob([file.content]), {
          contentType: 'text/plain',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Получаем публичную ссылку на файл
      const { data: { publicUrl }, error: urlError } = supabaseClient.storage
        .from('project_files')
        .getPublicUrl(filePath)

      if (urlError) throw urlError

      // Сохраняем метаданные файла
      const { error: dbError } = await supabaseClient
        .from('files')
        .insert({
          user_id: user.id,
          filename: file.path.split('/').pop(),
          file_path: filePath,
          content_type: 'text/plain',
          size: file.content.length
        })

      if (dbError) throw dbError

      results.push({
        path: file.path,
        url: publicUrl
      })
    }

    return new Response(
      JSON.stringify({ files: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})