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
      console.error('No user ID provided')
      throw new Error('User ID is required')
    }

    console.log('Preparing deployment for user:', userId)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем все файлы пользователя с подробным логированием
    console.log('Fetching files for user:', userId)
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)

    if (filesError) {
      console.error('Error fetching files:', filesError)
      throw filesError
    }

    console.log('Found files:', files?.length || 0)

    if (!files || files.length === 0) {
      // Проверяем наличие файлов в storage
      console.log('Checking storage for files...')
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('project_files')
        .list(`${userId}/`)

      if (storageError) {
        console.error('Error checking storage:', storageError)
        throw storageError
      }

      if (!storageFiles || storageFiles.length === 0) {
        console.error('No files found in storage for user:', userId)
        throw new Error('No files found for deployment')
      }

      // Если файлы есть в storage, но нет в БД - создаем записи
      console.log('Found files in storage, creating DB records...')
      for (const file of storageFiles) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('project_files')
          .download(`${userId}/${file.name}`)

        if (downloadError) {
          console.error('Error downloading file:', downloadError)
          continue
        }

        const content = await fileData.text()

        const { error: insertError } = await supabase
          .from('files')
          .insert({
            user_id: userId,
            filename: file.name,
            file_path: `${userId}/${file.name}`,
            content: content,
            content_type: 'text/plain',
            size: file.metadata?.size || 0,
            version: 1
          })

        if (insertError) {
          console.error('Error inserting file record:', insertError)
        }
      }

      // Получаем обновленный список файлов
      const { data: updatedFiles, error: updateError } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error fetching updated files:', updateError)
        throw updateError
      }

      files = updatedFiles
    }

    console.log('Processing files for deployment...')

    // Создаем структуру проекта
    const projectStructure = {
      files: files.map(file => ({
        name: file.filename,
        path: file.file_path,
        content: file.content,
        size: file.size,
        type: file.content_type
      })),
      metadata: {
        version: "1.0.0",
        timestamp: new Date().toISOString()
      }
    }

    // Сохраняем проект в storage
    const projectPath = `${userId}/deployments/${projectStructure.metadata.timestamp}/project.json`
    const projectData = new TextEncoder().encode(JSON.stringify(projectStructure))

    console.log('Saving project structure to storage...')
    const { error: uploadError } = await supabase.storage
      .from('project_files')
      .upload(projectPath, projectData, {
        contentType: 'application/json',
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading project:', uploadError)
      throw uploadError
    }

    // Создаем запись о деплойменте
    console.log('Creating deployment record...')
    const { error: deployError } = await supabase
      .from('deployed_projects')
      .insert({
        user_id: userId,
        status: 'preparing',
        framework: files.find(f => f.file_path.includes('package.json'))?.content?.includes('react') ? 'react' : 'node'
      })

    if (deployError) {
      console.error('Error creating deployment record:', deployError)
      throw deployError
    }

    console.log('Deployment preparation completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Project prepared for deployment',
        metadata: projectStructure.metadata,
        fileCount: files.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})