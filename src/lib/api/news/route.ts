import { NextResponse } from 'next/server'

export const revalidate = 1800

async function fetchRSSFeed(url: string, source: string) {
  try {
    const res = await fetch(url, {
      next: { revalidate: 1800 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const text = await res.text()
    const items: any[] = []

    // Use exec() loop instead of matchAll() to avoid iterator issues
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    while ((match = itemRegex.exec(text)) !== null) {
      const item = match[1]
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) 
        || item.match(/<title>(.*?)<\/title>/)
      const linkMatch = item.match(/<link>(.*?)<\/link>/) 
        || item.match(/<guid>(.*?)<\/guid>/)
      const pubMatch = item.match(/<pubDate>(.*?)<\/pubDate>/)
      const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)
        || item.match(/<description>(.*?)<\/description>/)

      const title = titleMatch?.[1] || ''
      const link = linkMatch?.[1] || ''
      const pubDate = pubMatch?.[1] || ''
      const description = descMatch?.[1] || ''

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

function tagItem(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('trust') || t.includes('safety') || t.includes('content mod')) return 'T&S'
  if (t.includes('ai act') || t.includes('regulation') || t.includes('policy') || t.includes('gdpr')) return 'Policy'
  if (t.includes('job') || t.includes('hiring') || t.includes('recruit')) return 'Jobs'
  if (t.includes('openai') || t.includes('anthropic') || t.includes('llm') || t.includes('gpt')) return 'AI'
  if (t.includes('dublin') || t.includes('ireland')) return 'Ireland'
  return 'AI'
}

export async function GET() {
  const results = await Promise.allSettled([
    fetchRSSFeed('https://techcrunch.com/category/artificial-intelligence/feed/', 'TechCrunch AI'),
    fetchRSSFeed('https://www.siliconrepublic.com/feed', 'Silicon Republic'),
    fetchRSSFeed('https://venturebeat.com/category/ai/feed/', 'VentureBeat'),
  ])

  const allNews: any[] = []
  results.forEach(r => {
    if (r.status === 'fulfilled') allNews.push(...r.value)
  })

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
