import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { JSZip } from 'https://deno.land/x/jszip@0.11.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { userId } = await req.json()

    if (!userId) {
      throw new Error('User ID is required')
    }

    console.log('Starting file packaging for user:', userId)

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
      console.error('Error fetching files:', filesError)
      throw filesError
    }

    if (!files || files.length === 0) {
      throw new Error('No files found for packaging')
    }

    console.log(`Found ${files.length} files to package`)

    // Создаем ZIP архив
    const zip = new JSZip()

    // Добавляем файлы в архив, используя только имя файла
    for (const file of files) {
      // Получаем только имя файла из полного пути
      const fileName = file.filename || file.file_path.split('/').pop()
      console.log(`Adding file to ZIP: ${fileName}`)
      
      if (file.content) {
        zip.file(fileName, file.content)
      } else {
        console.warn(`File ${fileName} has no content`)
      }
    }

    // Генерируем ZIP файл
    const zipContent = await zip.generateAsync({ type: "uint8array" })

    // Генерируем уникальное имя для ZIP файла
    const timestamp = new Date().toISOString()
    const zipFileName = `${userId}/packages/${timestamp}/project.zip`

    // Сохраняем ZIP в storage
    const { error: uploadError } = await supabase.storage
      .from('project_files')
      .upload(zipFileName, zipContent, {
        contentType: 'application/zip',
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading ZIP:', uploadError)
      throw uploadError
    }

    // Получаем публичную ссылку на ZIP
    const { data: { publicUrl }, error: urlError } = await supabase.storage
      .from('project_files')
      .getPublicUrl(zipFileName)

    if (urlError) {
      console.error('Error getting public URL:', urlError)
      throw urlError
    }

    console.log('Successfully created and uploaded ZIP package')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Files packaged successfully',
        downloadUrl: publicUrl,
        timestamp,
        fileCount: files.length
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error during packaging:', error)
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