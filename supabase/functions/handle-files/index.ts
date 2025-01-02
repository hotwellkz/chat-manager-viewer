import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { files, userId } = await req.json()

    const results = []
    for (const file of files) {
      const { path, content } = file
      
      // Конвертируем содержимое в Uint8Array
      const contentBytes = new TextEncoder().encode(content)
      
      // Загружаем файл в storage
      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from('project_files')
        .upload(`${userId}/${path}`, contentBytes, {
          contentType: 'text/plain',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Получаем публичную ссылку
      const { data: urlData } = await supabaseClient
        .storage
        .from('project_files')
        .getPublicUrl(`${userId}/${path}`)

      // Сохраняем метаданные в базу данных
      const { data: fileData, error: dbError } = await supabaseClient
        .from('files')
        .upsert({
          user_id: userId,
          filename: path.split('/').pop(),
          file_path: `${userId}/${path}`,
          content_type: 'text/plain',
          size: contentBytes.length
        })
        .select()
        .single()

      if (dbError) throw dbError

      results.push({
        path,
        url: urlData.publicUrl,
        id: fileData.id
      })
    }

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})