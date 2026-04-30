'use client'
import { useState, useEffect } from 'react'

export type LiveJob = {
  id: string
  title: string
  company: string
  location: string
  salary: string
  posted: string
  url: string
  desc: string
  source: string
  logo: string | null
  live: boolean
}

export type NewsItem = {
  title: string
  url: string
  pubDate: string
  source: string
  desc: string
  tag: string
}

export function useLiveJobs() {
  const [jobs, setJobs] = useState<LiveJob[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/jobs')
      .then(r => r.json())
      .then(data => {
        setJobs(data.jobs)
        setLastUpdated(data.lastUpdated)
      })
      .catch(() => setJobs(null))
      .finally(() => setLoading(false))
  }, [])

  return { jobs, loading, lastUpdated }
}

export function useLiveNews() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/news')
      .then(r => r.json())
      .then(data => {
        setNews(data.news || [])
        setLastUpdated(data.lastUpdated)
      })
      .catch(() => setNews([]))
      .finally(() => setLoading(false))
  }, [])

  return { news, loading, lastUpdated }
}
