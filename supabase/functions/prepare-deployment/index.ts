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

    // Проверяем существующие проекты пользователя
    console.log('Checking existing projects for user:', userId)
    const { data: existingProjects, error: projectError } = await supabase
      .from('deployed_projects')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'preparing')
      .order('created_at', { ascending: false })
      .limit(1)

    if (projectError) {
      console.error('Error checking existing projects:', projectError)
      throw projectError
    }

    let projectId

    if (existingProjects && existingProjects.length > 0) {
      // Обновляем существующий проект
      console.log('Updating existing project:', existingProjects[0].id)
      const { data: updatedProject, error: updateError } = await supabase
        .from('deployed_projects')
        .update({
          status: 'preparing',
          last_deployment: new Date().toISOString()
        })
        .eq('id', existingProjects[0].id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating project:', updateError)
        throw updateError
      }

      projectId = updatedProject.id
    }

    // Получаем все файлы пользователя из базы данных
    console.log('Fetching files from database for user:', userId)
    const { data: dbFiles, error: dbError } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)

    if (dbError) {
      console.error('Error fetching files from database:', dbError)
      throw dbError
    }

    console.log('Found files in database:', dbFiles?.length || 0)

    // Проверяем storage, даже если файлы найдены в БД
    console.log('Checking storage for files...')
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('project_files')
      .list(`${userId}/`, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (storageError) {
      console.error('Error checking storage:', storageError)
      throw storageError
    }

    console.log('Found files in storage:', storageFiles?.length || 0)

    // Если нет файлов ни в БД, ни в storage
    if ((!dbFiles || dbFiles.length === 0) && (!storageFiles || storageFiles.length === 0)) {
      console.error('No files found in either database or storage for user:', userId)
      throw new Error('No files found for deployment. Please create some files first.')
    }

    let files = dbFiles || []

    // Если файлы есть только в storage, создаем записи в БД
    if (files.length === 0 && storageFiles && storageFiles.length > 0) {
      console.log('Creating DB records for storage files...')
      
      for (const file of storageFiles) {
        if (!file.name) continue

        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('project_files')
            .download(`${userId}/${file.name}`)

          if (downloadError) {
            console.error('Error downloading file:', file.name, downloadError)
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
              content_type: file.metadata?.mimetype || 'text/plain',
              size: file.metadata?.size || 0,
              version: 1
            })

          if (insertError) {
            console.error('Error inserting file record:', file.name, insertError)
          } else {
            console.log('Successfully created DB record for file:', file.name)
          }
        } catch (error) {
          console.error('Error processing storage file:', file.name, error)
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

      files = updatedFiles || []
    }

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
        timestamp: new Date().toISOString(),
        fileCount: files.length
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