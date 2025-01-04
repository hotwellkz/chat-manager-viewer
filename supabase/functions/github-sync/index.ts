import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Octokit } from "https://esm.sh/octokit@4.0.3"

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

    // Получаем информацию о контейнере и метрики
    const { data: containers, error: containerError } = await supabase
      .from('docker_containers')
      .select(`
        *,
        container_metrics(
          cpu_usage,
          memory_usage,
          error_count
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (containerError) {
      console.error('Error fetching container info:', containerError)
    }

    // Получаем GitHub токен пользователя
    const { data: integration, error: integrationError } = await supabase
      .from('github_integrations')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (integrationError || !integration) {
      throw new Error('GitHub integration not found')
    }

    const octokit = new Octokit({
      auth: integration.access_token
    })

    const [owner, repo] = integration.repository_name.split('/')
    
    try {
      const timestamp = new Date().getTime()
      const branchName = `update-${timestamp}`
      
      // Получаем SHA последнего коммита в main
      const { data: ref } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: 'heads/main',
      })
      
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha,
      })

      // Формируем расширенное сообщение коммита с метаданными
      const containerInfo = containers ? {
        id: containers.container_id,
        status: containers.status,
        url: containers.container_url,
        framework: containers.framework,
        port: containers.port,
        metrics: containers.container_metrics?.[0] ? {
          cpu: `${Math.round(containers.container_metrics[0].cpu_usage * 100)}%`,
          memory: `${Math.round(containers.container_metrics[0].memory_usage / 1024 / 1024)}MB`,
          errors: containers.container_metrics[0].error_count
        } : null,
        created: containers.created_at,
        lastUpdated: containers.updated_at
      } : null;

      const extendedMessage = `${commitMessage || 'Update from Lovable'}

Container Information:
${containerInfo ? `
🔧 Container ID: ${containerInfo.id}
📊 Status: ${containerInfo.status}
🌐 URL: ${containerInfo.url || 'N/A'}
⚙️ Framework: ${containerInfo.framework}
🔌 Port: ${containerInfo.port}

Performance Metrics:
${containerInfo.metrics ? `
CPU Usage: ${containerInfo.metrics.cpu}
Memory Usage: ${containerInfo.metrics.memory}
Error Count: ${containerInfo.metrics.errors}` : 'No metrics available'}

📅 Created: ${containerInfo.created}
🔄 Last Updated: ${containerInfo.lastUpdated}
` : 'No container information available'}

Files Changed:
${files.map(f => `- ${f.path}`).join('\n')}

🕒 Timestamp: ${new Date().toISOString()}
`

      // Создаем коммит с изменениями
      for (const file of files) {
        try {
          await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: file.path,
            message: extendedMessage,
            content: btoa(file.content),
            branch: branchName,
          })
          console.log(`Successfully updated file: ${file.path}`)
        } catch (error) {
          console.error(`Error updating file ${file.path}:`, error)
          throw error
        }
      }

      // Создаем Pull Request с детальным описанием
      const { data: pr } = await octokit.rest.pulls.create({
        owner,
        repo,
        title: commitMessage || 'Update from Lovable',
        head: branchName,
        base: 'main',
        body: extendedMessage,
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
          prUrl: pr.html_url,
          branch: branchName
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
        error: error.message,
        details: error.stack
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