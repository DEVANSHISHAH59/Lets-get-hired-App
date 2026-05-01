import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 0

// Cache 28 min — RSS feeds update every few hours, polling every 30 min is ideal
const CACHE_TTL_MS = 28 * 60 * 1000

// Indeed Ireland RSS feeds — no API key needed, server-side fetch bypasses CORS
// These search Dublin jobs by role type, sorted by date
const RSS_FEEDS = [
  { url: 'https://ie.indeed.com/rss?q=trust+and+safety+analyst&l=Dublin&sort=date&fromage=14', role: 'Trust & Safety' },
  { url: 'https://ie.indeed.com/rss?q=AI+analyst+LLM+evaluation&l=Dublin&sort=date&fromage=14', role: 'AI Analyst' },
  { url: 'https://ie.indeed.com/rss?q=content+policy+safety+analyst&l=Dublin&sort=date&fromage=14', role: 'Trust & Safety' },
  { url: 'https://ie.indeed.com/rss?q=data+analyst+technology&l=Dublin&sort=date&fromage=7', role: 'Data Analyst' },
  { url: 'https://ie.indeed.com/rss?q=business+analyst+technology&l=Dublin&sort=date&fromage=7', role: 'Business Analyst' },
  { url: 'https://ie.indeed.com/rss?q=product+owner+agile+Dublin&l=Dublin&sort=date&fromage=7', role: 'Product Owner' },
  { url: 'https://ie.indeed.com/rss?q=risk+analyst+technology&l=Dublin&sort=date&fromage=14', role: 'Data Analyst' },
  { url: 'https://ie.indeed.com/rss?q=machine+learning+analyst&l=Dublin&sort=date&fromage=14', role: 'AI Analyst' },
]

function parseRSS(xml: string, role: string) {
  const jobs: any[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = itemRegex.exec(xml)) !== null) {
    const raw = m[1]
    const get = (tag: string) => {
      const r = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
      const match = r.exec(raw)
      return (match?.[1] || match?.[2] || '').trim()
    }
    const title   = get('title')
    const link    = get('link') || get('guid')
    const desc    = get('description').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    const pubDate = get('pubDate')
    const source  = get('source')

    if (!title || !link) continue

    // Parse "Job Title - Company" or "Job Title at Company"
    const parts   = title.split(/\s+-\s+/)
    const jobTitle = parts[0]?.trim() || title
    const company  = parts[1]?.trim() || source || 'Dublin Company'

    // Determine contract type from title/description
    const isContract = /contract|temp|interim|fixed.term/i.test(title + desc)
    const isPermanent = /permanent|perm|full.time|full time/i.test(title + desc)

    jobs.push({
      id: link.split('jk=')[1]?.split('&')[0] || link.slice(-16),
      title: jobTitle,
      company,
      location: 'Dublin, Ireland',
      salary: 'Competitive',
      posted: pubDate ? new Date(pubDate).toLocaleDateString('en-IE') : 'Recent',
      url: link,
      desc: desc.slice(0, 200) + (desc.length > 200 ? '...' : ''),
      source: 'Indeed Ireland',
      role,
      contractType: isContract ? 'Contract' : isPermanent ? 'Permanent' : 'Not specified',
    })
  }
  return jobs
}

async function fetchRSSJobs() {
  const allJobs: any[] = []
  const seenIds = new Set<string>()

  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobFeedBot/1.0; +https://lets-get-hired-app.vercel.app)' },
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok) continue
      const xml = await res.text()
      const items = parseRSS(xml, feed.role)
      for (const item of items) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id)
          allJobs.push(item)
        }
      }
    } catch { continue }
  }

  return allJobs.length > 0 ? allJobs : null
}

async function getCached() {
  try {
    const { data } = await supabase.from('live_jobs').select('*').order('fetched_at', { ascending: false }).limit(60)
    if (!data?.length) return null
    if (Date.now() - new Date(data[0].fetched_at).getTime() < CACHE_TTL_MS)
      return { jobs: data, lastUpdated: data[0].fetched_at, source: 'cache' }
    return null
  } catch { return null }
}

async function saveCache(jobs: any[]) {
  try {
    const now = new Date().toISOString()
    await supabase.from('live_jobs').delete().neq('id', '')
    if (jobs.length) await supabase.from('live_jobs').insert(jobs.map(j => ({ ...j, fetched_at: now })))
  } catch {}
}

export async function GET() {
  // 1. Try fresh Supabase cache
  const cached = await getCached()
  if (cached) return NextResponse.json(cached)

  // 2. Fetch from Indeed RSS
  const fresh = await fetchRSSJobs()
  if (fresh?.length) {
    await saveCache(fresh)
    return NextResponse.json({ jobs: fresh, lastUpdated: new Date().toISOString(), source: 'rss' })
  }

  // 3. Return stale cache as fallback
  try {
    const { data } = await supabase.from('live_jobs').select('*').order('fetched_at', { ascending: false }).limit(60)
    if (data?.length) return NextResponse.json({ jobs: data, lastUpdated: data[0].fetched_at, source: 'stale' })
  } catch {}

  return NextResponse.json({ jobs: [], lastUpdated: new Date().toISOString(), source: 'none' })
}
