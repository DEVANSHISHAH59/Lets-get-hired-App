import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Application = {
  id: string
  title: string
  company: string
  role_type: string
  source: string
  status: string
  date_applied: string
  posted_date: string
  salary: string
  job_url: string
  contact_name: string
  notes: string
  created_at: string
}

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
  fetched_at: string
}

export type CVData = {
  full_name: string
  contact_line: string
  summary: string
  skills: string
  exp1_title: string
  exp1_company: string
  exp1_dates: string
  exp1_bullets: string
  exp2_title: string
  exp2_company: string
  exp2_dates: string
  exp2_bullets: string
  education: string
}

export const db = {
  async getApplications(): Promise<Application[]> {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) return []
      return (data || []) as Application[]
    } catch {
      return []
    }
  },

  async addApplication(app: Omit<Application, 'id' | 'created_at'>): Promise<void> {
    try {
      await supabase.from('applications').insert([{ ...app, user_id: 'devanshi' }])
    } catch {
      // ignore
    }
  },

  async updateApplicationStatus(id: string, status: string): Promise<void> {
    try {
      await supabase.from('applications').update({ status }).eq('id', id)
    } catch {
      // ignore
    }
  },

  async deleteApplication(id: string): Promise<void> {
    try {
      await supabase.from('applications').delete().eq('id', id)
    } catch {
      // ignore
    }
  },

  async getCV(): Promise<CVData | null> {
    try {
      const { data, error } = await supabase
        .from('cv_data')
        .select('*')
        .eq('user_id', 'devanshi')
        .single()
      if (error) return null
      return data as CVData
    } catch {
      return null
    }
  },

  async saveCV(cv: CVData): Promise<void> {
    try {
      await supabase.from('cv_data').upsert({ ...cv, user_id: 'devanshi' })
    } catch {
      // ignore
    }
  },

  async getLiveJobs(): Promise<LiveJob[]> {
    try {
      const { data, error } = await supabase
        .from('live_jobs')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(30)
      if (error) return []
      return (data || []) as LiveJob[]
    } catch {
      return []
    }
  },

  async saveLiveJobs(jobs: Omit<LiveJob, 'fetched_at'>[]): Promise<void> {
    try {
      const now = new Date().toISOString()
      await supabase.from('live_jobs').delete().neq('id', '')
      await supabase.from('live_jobs').insert(
        jobs.map(j => ({ ...j, fetched_at: now }))
      )
    } catch {
      // ignore
    }
  },

  async getLiveJobsLastFetch(): Promise<string | null> {
    try {
      const { data } = await supabase
        .from('live_jobs')
        .select('fetched_at')
        .order('fetched_at', { ascending: false })
        .limit(1)
      return data?.[0]?.fetched_at || null
    } catch {
      return null
    }
  },
}
