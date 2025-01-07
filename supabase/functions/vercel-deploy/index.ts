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
    const { userId, files, platform } = await req.json()

    if (!userId || !files || !Array.isArray(files)) {
      throw new Error('Некорректные данные для деплоя')
    }

    console.log('Подготовка к деплою на Vercel:', {
      userId,
      filesCount: files.length,
      platform
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
      .eq('framework', 'vercel')
      .single()

    if (projectError && projectError.code !== 'PGRST116') {
      console.error('Ошибка при проверке проекта:', projectError)
      throw projectError
    }

    // Создаем или обновляем запись о деплое
    const { data: deployment, error: deployError } = await supabase
      .from('deployed_projects')
      .upsert({
        user_id: userId,
        framework: 'vercel',
        status: 'deploying',
        last_deployment: new Date().toISOString()
      })
      .select()
      .single()

    if (deployError) {
      console.error('Ошибка при создании записи о деплое:', deployError)
      throw deployError
    }

    // Здесь будет интеграция с Vercel API
    const vercelToken = Deno.env.get('VERCEL_TOKEN')
    const vercelTeamId = Deno.env.get('VERCEL_TEAM_ID')

    if (!vercelToken) {
      throw new Error('Отсутствует токен Vercel')
    }

    // Создаем проект в Vercel
    const createProjectResponse = await fetch('https://api.vercel.com/v9/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `lovable-project-${userId}`,
        framework: 'react', // или другой фреймворк
        teamId: vercelTeamId
      })
    })

    if (!createProjectResponse.ok) {
      const error = await createProjectResponse.json()
      throw new Error(`Ошибка создания проекта в Vercel: ${error.message}`)
    }

    const project = await createProjectResponse.json()

    // Создаем деплой
    const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `lovable-deployment-${Date.now()}`,
        projectId: project.id,
        files: files.map(file => ({
          file: file.path,
          data: file.content
        })),
        teamId: vercelTeamId
      })
    })

    if (!deployResponse.ok) {
      const error = await deployResponse.json()
      throw new Error(`Ошибка деплоя в Vercel: ${error.message}`)
    }

    const deployResult = await deployResponse.json()

    // Обновляем статус деплоя
    const { error: updateError } = await supabase
      .from('deployed_projects')
      .update({
        status: 'deployed',
        project_url: deployResult.url
      })
      .eq('id', deployment.id)

    if (updateError) {
      console.error('Ошибка при обновлении статуса:', updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({
        success: true,
        deploymentUrl: deployResult.url,
        deploymentId: deployment.id
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