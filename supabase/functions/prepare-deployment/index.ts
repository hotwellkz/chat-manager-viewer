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

    // Создаем структуру проекта в памяти
    const encoder = new TextEncoder()
    const projectStructure = {
      files: [],
      metadata: {
        filename: "project.zip",
        version: "1.0.2",
        containerId: "abc123",
        lastModified: new Date().toISOString()
      }
    }

    // Добавляем каждый файл в структуру проекта
    for (const file of files) {
      const fileContent = encoder.encode(file.content)
      projectStructure.files.push({
        name: file.file_path,
        content: Array.from(fileContent), // Конвертируем в обычный массив для JSON
        size: file.size,
        type: file.content_type
      })
    }

    // Создаем JSON представление проекта
    const projectJson = JSON.stringify(projectStructure, null, 2)
    const projectData = encoder.encode(projectJson)

    // Сохраняем проект в storage
    const timestamp = new Date().toISOString()
    const projectPath = `${userId}/deployments/${timestamp}/project.json`

    const { error: uploadError } = await supabase.storage
      .from('project_files')
      .upload(projectPath, projectData, {
        contentType: 'application/json',
        upsert: true
      })

    if (uploadError) {
      throw uploadError
    }

    // Получаем публичную ссылку на проект
    const { data: { publicUrl }, error: urlError } = await supabase.storage
      .from('project_files')
      .getPublicUrl(projectPath)

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

    console.log('Project packaged successfully:', projectPath)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Project packaged successfully',
        projectUrl: publicUrl,
        metadata: projectStructure.metadata
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