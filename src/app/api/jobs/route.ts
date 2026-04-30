import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 0  // disable Next.js cache — we handle caching in Supabase

const CACHE_TTL_MS = 55 * 60 * 1000  // 55 minutes

async function getCachedJobs() {
  try {
    const { data } = await supabase
      .from('live_jobs')
      .select('*')
      .order('fetched_at', { ascending: false })
      .limit(30)
    if (!data || data.length === 0) return null
    const lastFetch = new Date(data[0].fetched_at).getTime()
    if (Date.now() - lastFetch < CACHE_TTL_MS) return { jobs: data, lastUpdated: data[0].fetched_at, source: 'cache' }
    return null  // stale
  } catch {
    return null
  }
}

async function saveCachedJobs(jobs: any[]) {
  try {
    const now = new Date().toISOString()
    await supabase.from('live_jobs').delete().neq('id', '')
    await supabase.from('live_jobs').insert(jobs.map(j => ({ ...j, fetched_at: now })))
  } catch {
    // ignore
  }
}

async function fetchLiveJobs() {
  const apiKey = process.env.JSEARCH_API_KEY
  if (!apiKey) return null

  try {
    const queries = [
      'trust safety analyst Dublin',
      'AI analyst Dublin Ireland',
      'data analyst Dublin Ireland',
    ]
    const allJobs: any[] = []
    for (const query of queries) {
      const res = await fetch(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=1&date_posted=week`,
        { headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'jsearch.p.rapidapi.com' } }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (data.data) allJobs.push(...data.data.slice(0, 5))
    }
    if (allJobs.length === 0) return null
    return allJobs.map((j: any) => ({
      id: j.job_id,
      title: j.job_title,
      company: j.employer_name,
      location: j.job_city || 'Dublin',
      salary: j.job_min_salary ? `EUR${Math.round(j.job_min_salary / 1000)}k-${Math.round(j.job_max_salary / 1000)}k` : 'Competitive',
      posted: j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc).toLocaleDateString('en-IE') : 'Recent',
      url: j.job_apply_link || j.job_google_link,
      desc: (j.job_description?.slice(0, 160) + '...') || '',
      source: j.job_publisher || 'Live',
    }))
  } catch {
    return null
  }
}

export async function GET() {
  // 1. Try Supabase cache first
  const cached = await getCachedJobs()
  if (cached) {
    return NextResponse.json(cached)
  }

  // 2. Fetch fresh from JSearch API
  const freshJobs = await fetchLiveJobs()

  if (freshJobs && freshJobs.length > 0) {
    // Save to Supabase cache
    await saveCachedJobs(freshJobs)
    return NextResponse.json({
      jobs: freshJobs,
      lastUpdated: new Date().toISOString(),
      source: 'live',
    })
  }

  // 3. Fallback: return stale cache if any
  try {
    const { data } = await supabase
      .from('live_jobs')
      .select('*')
      .order('fetched_at', { ascending: false })
      .limit(30)
    if (data && data.length > 0) {
      return NextResponse.json({
        jobs: data,
        lastUpdated: data[0].fetched_at,
        source: 'stale-cache',
      })
    }
  } catch { /* ignore */ }

  return NextResponse.json({ jobs: null, lastUpdated: new Date().toISOString(), source: 'none' })
}
