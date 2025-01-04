import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { zip } from "https://deno.land/x/zipjs/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { userId } = await req.json()

    if (!userId) {
      throw new Error('User ID is required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем все файлы пользователя
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)

    if (filesError) {
      throw filesError
    }

    if (!files || files.length === 0) {
      throw new Error('No files found for deployment')
    }

    // Создаем ZIP архив
    const zipWriter = new zip.ZipWriter()
    
    for (const file of files) {
      await zipWriter.add(file.file_path, new TextEncoder().encode(file.content))
    }

    const zipBlob = await zipWriter.close()
    const zipBuffer = await zipBlob.arrayBuffer()

    // Сохраняем ZIP в storage
    const timestamp = new Date().toISOString()
    const zipPath = `${userId}/deployments/${timestamp}.zip`

    const { error: uploadError } = await supabase.storage
      .from('project_files')
      .upload(zipPath, zipBuffer, {
        contentType: 'application/zip',
        upsert: true
      })

    if (uploadError) {
      throw uploadError
    }

    // Получаем публичную ссылку на ZIP
    const { data: { publicUrl }, error: urlError } = await supabase.storage
      .from('project_files')
      .getPublicUrl(zipPath)

    if (urlError) {
      throw urlError
    }

    // Обновляем статус проекта
    const { error: updateError } = await supabase
      .from('deployed_projects')
      .upsert({
        user_id: userId,
        status: 'packaging',
        last_deployment: timestamp
      })

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Files packaged successfully',
        zipUrl: publicUrl
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