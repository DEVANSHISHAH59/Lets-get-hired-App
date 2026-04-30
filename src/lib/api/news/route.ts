import { NextResponse } from 'next/server'

export const revalidate = 1800 // refresh every 30 mins

async function fetchRSSFeed(url: string, source: string) {
  try {
    const res = await fetch(url, {
      next: { revalidate: 1800 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const text = await res.text()

    // Parse RSS items
    const items: any[] = []
    const itemMatches = text.matchAll(/<item>([\s\S]*?)<\/item>/g)

    for (const match of itemMatches) {
      const item = match[1]
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        || item.match(/<title>(.*?)<\/title>/)?.[1]
        || ''
      const link = item.match(/<link>(.*?)<\/link>/)?.[1]
        || item.match(/<guid>(.*?)<\/guid>/)?.[1]
        || ''
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
      const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
        || item.match(/<description>(.*?)<\/description>/)?.[1]
        || ''

      if (title && link) {
        items.push({
          title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(),
          url: link.trim(),
          pubDate: pubDate.trim(),
          source,
          desc: description.replace(/<[^>]*>/g, '').slice(0, 200).trim(),
        })
      }
      if (items.length >= 5) break
    }
    return items
  } catch {
    return []
  }
}

// Tag news items by topic
function tagItem(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('trust') || t.includes('safety') || t.includes('content mod')) return 'T&S'
  if (t.includes('ai act') || t.includes('regulation') || t.includes('policy') || t.includes('gdpr') || t.includes('dsa')) return 'Policy'
  if (t.includes('job') || t.includes('hiring') || t.includes('recruit') || t.includes('layoff')) return 'Jobs'
  if (t.includes('openai') || t.includes('anthropic') || t.includes('gemini') || t.includes('llm') || t.includes('gpt')) return 'AI'
  if (t.includes('dublin') || t.includes('ireland') || t.includes('tech') ) return 'Ireland'
  return 'AI'
}

export async function GET() {
  // Fetch from multiple live RSS feeds simultaneously
  const feeds = await Promise.allSettled([
    fetchRSSFeed('https://feeds.feedburner.com/techcrunch/startups', 'TechCrunch'),
    fetchRSSFeed('https://techcrunch.com/category/artificial-intelligence/feed/', 'TechCrunch AI'),
    fetchRSSFeed('https://www.siliconrepublic.com/feed', 'Silicon Republic'),
    fetchRSSFeed('https://venturebeat.com/category/ai/feed/', 'VentureBeat'),
    fetchRSSFeed('https://feeds.feedburner.com/oreilly/radar/atom', "O'Reilly"),
  ])

  const allNews: any[] = []

  feeds.forEach(result => {
    if (result.status === 'fulfilled') {
      allNews.push(...result.value)
    }
  })

  // Sort by date, deduplicate, tag
  const seen = new Set<string>()
  const deduped = allNews
    .filter(item => {
      if (seen.has(item.title)) return false
      seen.add(item.title)
      return true
    })
    .map(item => ({ ...item, tag: tagItem(item.title) }))
    .sort((a, b) => {
      const da = new Date(a.pubDate).getTime() || 0
      const db = new Date(b.pubDate).getTime() || 0
      return db - da
    })
    .slice(0, 20)

  return NextResponse.json({
    news: deduped,
    lastUpdated: new Date().toISOString(),
    count: deduped.length,
  })
}
