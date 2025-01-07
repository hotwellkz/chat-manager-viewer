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
    const { userId, files, framework } = await req.json()

    // Проверяем наличие всех необходимых полей
    if (!userId || !files || !Array.isArray(files) || !framework) {
      console.error('Некорректные данные:', { userId, filesCount: files?.length, framework })
      throw new Error('Отсутствуют обязательные поля: userId, files или framework')
    }

    console.log('Подготовка к деплою на Vercel:', {
      userId,
      filesCount: files.length,
      framework
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Проверяем существование проекта
    const { data: existingProject, error: projectError } = await supabase
      .from('deployed_projects')
      .select('*')
      .eq('user_id', userId)
      .eq('framework', framework)
      .maybeSingle()

    if (projectError) {
      console.error('Ошибка при проверке проекта:', projectError)
      throw projectError
    }

    const vercelToken = Deno.env.get('VERCEL_TOKEN')
    if (!vercelToken) {
      throw new Error('Отсутствует токен Vercel')
    }

    let vercelProjectId = existingProject?.project_url?.split('/').pop()
    let deploymentUrl

    if (!vercelProjectId) {
      // Создаем новый проект в Vercel
      console.log('Создание нового проекта в Vercel')
      const createProjectResponse = await fetch('https://api.vercel.com/v9/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `lovable-project-${userId}-${framework}`,
          framework: framework.toLowerCase()
        })
      })

      if (!createProjectResponse.ok) {
        const error = await createProjectResponse.json()
        console.error('Ошибка создания проекта:', error)
        throw new Error(`Ошибка создания проекта в Vercel: ${error.message}`)
      }

      const project = await createProjectResponse.json()
      vercelProjectId = project.id
    }

    // Создаем деплой
    console.log('Отправка файлов на деплой:', { projectId: vercelProjectId })
    const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `lovable-deployment-${Date.now()}`,
        projectId: vercelProjectId,
        files: files.map(file => ({
          file: file.path,
          data: file.content
        }))
      })
    })

    if (!deployResponse.ok) {
      const error = await deployResponse.json()
      console.error('Ошибка деплоя:', error)
      throw new Error(`Ошибка деплоя в Vercel: ${error.message}`)
    }

    const deployResult = await deployResponse.json()
    deploymentUrl = deployResult.url

    // Обновляем или создаем запись о проекте
    const { error: upsertError } = await supabase
      .from('deployed_projects')
      .upsert({
        user_id: userId,
        framework: framework,
        project_url: deploymentUrl,
        status: 'deployed',
        last_deployment: new Date().toISOString()
      })

    if (upsertError) {
      console.error('Ошибка при обновлении статуса:', upsertError)
      throw upsertError
    }

    console.log('Деплой успешно завершен:', { deploymentUrl })

    return new Response(
      JSON.stringify({
        success: true,
        deploymentUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Ошибка:', error)
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