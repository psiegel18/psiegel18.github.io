import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const GITHUB_API_BASE = 'https://api.github.com'

type GitHubResponse<T> = T & {
  message?: string
  documentation_url?: string
}

async function githubFetch<T>(
  endpoint: string,
  token: string
): Promise<GitHubResponse<T>> {
  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  return response.json()
}

export async function GET() {
  try {
    // Check admin access
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if credentials are configured
    if (!process.env.GITHUB_ACCESS_TOKEN) {
      return NextResponse.json({
        configured: false,
        message: 'GitHub API not configured. Add GITHUB_ACCESS_TOKEN environment variable.',
      })
    }

    const token = process.env.GITHUB_ACCESS_TOKEN
    const username = process.env.GITHUB_USERNAME

    // Get authenticated user
    const userResponse = await githubFetch<{
      login: string
      name: string
      email: string
      avatar_url: string
      public_repos: number
      private_repos?: number
      followers: number
      following: number
      created_at: string
    }>('/user', token)

    if (userResponse.message) {
      return NextResponse.json({
        configured: false,
        error: 'Invalid GitHub token',
        details: userResponse.message,
      }, { status: 401 })
    }

    // Get repositories (owned by user, sorted by recent activity)
    const reposResponse = await githubFetch<Array<{
      id: number
      name: string
      full_name: string
      private: boolean
      html_url: string
      description: string | null
      fork: boolean
      language: string | null
      stargazers_count: number
      watchers_count: number
      forks_count: number
      open_issues_count: number
      default_branch: string
      pushed_at: string
      updated_at: string
      created_at: string
    }>>(`/user/repos?sort=pushed&per_page=20&affiliation=owner`, token)

    const repos = Array.isArray(reposResponse) ? reposResponse.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      url: repo.html_url,
      description: repo.description,
      fork: repo.fork,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      defaultBranch: repo.default_branch,
      pushedAt: repo.pushed_at,
      updatedAt: repo.updated_at,
    })) : []

    // Get recent events (activity feed)
    const targetUser = username || userResponse.login
    const eventsResponse = await githubFetch<Array<{
      id: string
      type: string
      repo: { name: string }
      created_at: string
      payload: {
        action?: string
        ref?: string
        ref_type?: string
        commits?: Array<{ sha: string; message: string }>
        pull_request?: { title: string; number: number }
        issue?: { title: string; number: number }
      }
    }>>(`/users/${targetUser}/events?per_page=15`, token)

    const events = Array.isArray(eventsResponse) ? eventsResponse.map(event => ({
      id: event.id,
      type: event.type,
      repo: event.repo.name,
      createdAt: event.created_at,
      action: event.payload.action,
      ref: event.payload.ref,
      refType: event.payload.ref_type,
      commits: event.payload.commits?.slice(0, 3).map(c => ({
        sha: c.sha.slice(0, 7),
        message: c.message.split('\n')[0].slice(0, 60),
      })),
      pullRequest: event.payload.pull_request ? {
        title: event.payload.pull_request.title,
        number: event.payload.pull_request.number,
      } : undefined,
      issue: event.payload.issue ? {
        title: event.payload.issue.title,
        number: event.payload.issue.number,
      } : undefined,
    })) : []

    // Get open issues assigned to user
    const issuesResponse = await githubFetch<Array<{
      id: number
      title: string
      number: number
      state: string
      html_url: string
      repository: { full_name: string }
      created_at: string
      updated_at: string
      labels: Array<{ name: string; color: string }>
    }>>(`/issues?filter=assigned&state=open&per_page=10`, token)

    const issues = Array.isArray(issuesResponse) ? issuesResponse.map(issue => ({
      id: issue.id,
      title: issue.title,
      number: issue.number,
      state: issue.state,
      url: issue.html_url,
      repo: issue.repository?.full_name,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      labels: issue.labels.map(l => ({ name: l.name, color: l.color })),
    })) : []

    // Get open pull requests created by user
    const prsResponse = await githubFetch<{
      items: Array<{
        id: number
        title: string
        number: number
        state: string
        html_url: string
        repository_url: string
        created_at: string
        updated_at: string
        draft: boolean
      }>
    }>(`/search/issues?q=author:${targetUser}+type:pr+state:open&per_page=10`, token)

    const pullRequests = prsResponse.items?.map(pr => ({
      id: pr.id,
      title: pr.title,
      number: pr.number,
      state: pr.state,
      url: pr.html_url,
      repo: pr.repository_url.replace('https://api.github.com/repos/', ''),
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      draft: pr.draft,
    })) || []

    // Get recent workflow runs (if any repos have actions)
    let workflowRuns: Array<{
      id: number
      name: string
      status: string
      conclusion: string | null
      repo: string
      branch: string
      event: string
      createdAt: string
      url: string
    }> = []

    // Check top 3 repos for workflow runs
    for (const repo of repos.slice(0, 3)) {
      try {
        const runsResponse = await githubFetch<{
          workflow_runs: Array<{
            id: number
            name: string
            status: string
            conclusion: string | null
            head_branch: string
            event: string
            created_at: string
            html_url: string
          }>
        }>(`/repos/${repo.fullName}/actions/runs?per_page=5`, token)

        if (runsResponse.workflow_runs) {
          workflowRuns.push(...runsResponse.workflow_runs.map(run => ({
            id: run.id,
            name: run.name,
            status: run.status,
            conclusion: run.conclusion,
            repo: repo.name,
            branch: run.head_branch,
            event: run.event,
            createdAt: run.created_at,
            url: run.html_url,
          })))
        }
      } catch {
        // Repo may not have actions enabled
      }
    }

    // Sort workflow runs by date and limit
    workflowRuns.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    workflowRuns = workflowRuns.slice(0, 10)

    // Calculate stats
    const totalStars = repos.reduce((sum, r) => sum + r.stars, 0)
    const totalForks = repos.reduce((sum, r) => sum + r.forks, 0)
    const privateRepos = repos.filter(r => r.private).length
    const publicRepos = repos.filter(r => !r.private).length
    const languages = Array.from(new Set(repos.map(r => r.language).filter(Boolean)))

    return NextResponse.json({
      configured: true,
      user: {
        login: userResponse.login,
        name: userResponse.name,
        email: userResponse.email,
        avatarUrl: userResponse.avatar_url,
        followers: userResponse.followers,
        following: userResponse.following,
      },
      summary: {
        totalRepos: repos.length,
        publicRepos,
        privateRepos,
        totalStars,
        totalForks,
        openIssues: issues.length,
        openPRs: pullRequests.length,
        languages: languages.slice(0, 5),
      },
      repos,
      events,
      issues,
      pullRequests,
      workflowRuns,
    })
  } catch (error) {
    console.error('GitHub API error:', error)
    return NextResponse.json(
      {
        configured: false,
        error: 'Failed to fetch GitHub data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
