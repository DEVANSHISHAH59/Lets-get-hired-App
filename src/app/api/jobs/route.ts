import { NextResponse } from 'next/server'

export const revalidate = 3600

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
        {
          headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'jsearch.p.rapidapi.com' },
          next: { revalidate: 3600 },
        }
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
      live: true,
    }))
  } catch {
    return null
  }
}

export async function GET() {
  const liveJobs = await fetchLiveJobs()
  return NextResponse.json({
    jobs: liveJobs,
    lastUpdated: new Date().toISOString(),
    source: liveJobs ? 'live' : 'static',
  })
}
