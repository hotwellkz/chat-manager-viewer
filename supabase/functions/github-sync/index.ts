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
    const { userId, files, commitMessage } = await req.json()

    if (!userId || !files) {
      throw new Error('User ID and files are required')
    }

    console.log('Starting GitHub sync for user:', userId)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем GitHub токен пользователя
    const { data: integration, error: integrationError } = await supabase
      .from('github_integrations')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (integrationError || !integration) {
      throw new Error('GitHub integration not found')
    }

    // Создаем или обновляем файлы в GitHub
    const octokit = new Octokit({
      auth: integration.access_token
    })

    // Получаем текущее содержимое репозитория
    const [owner, repo] = integration.repository_name.split('/')
    
    try {
      // Создаем новую ветку для изменений
      const branchName = `update-${new Date().getTime()}`
      
      // Получаем SHA последнего коммита в main
      const { data: ref } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: 'heads/main',
      })
      
      // Создаем новую ветку
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha,
      })

      // Создаем коммит с изменениями
      for (const file of files) {
        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: file.path,
          message: commitMessage || 'Update from Lovable',
          content: btoa(file.content),
          branch: branchName,
        })
      }

      // Создаем Pull Request
      const { data: pr } = await octokit.rest.pulls.create({
        owner,
        repo,
        title: commitMessage || 'Update from Lovable',
        head: branchName,
        base: 'main',
        body: 'Автоматическое обновление из Lovable',
      })

      // Обновляем статус синхронизации
      await supabase
        .from('github_integrations')
        .update({
          last_sync: new Date().toISOString(),
        })
        .eq('user_id', userId)

      console.log('Successfully created PR:', pr.html_url)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Changes synced to GitHub',
          prUrl: pr.html_url
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    } catch (error) {
      console.error('GitHub API error:', error)
      throw error
    }
  } catch (error) {
    console.error('Error during GitHub sync:', error)
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