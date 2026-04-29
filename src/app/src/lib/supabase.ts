import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Types ──────────────────────────────────────────────────────────────────
export type Application = {
  id:           string
  title:        string
  company:      string
  role_type:    string
  source:       string
  status:       string
  date_applied: string
  posted_date:  string
  salary:       string
  job_url:      string
  contact_name: string
  notes:        string
  created_at:   string
}

export type AgencyContact = {
  id:           string
  agency_name:  string
  contact_name: string
  contacted_at: string
  notes:        string
}

export type CVData = {
  full_name:    string
  contact_line: string
  summary:      string
  skills:       string
  exp1_title:   string
  exp1_company: string
  exp1_dates:   string
  exp1_bullets: string
  exp2_title:   string
  exp2_company: string
  exp2_dates:   string
  exp2_bullets: string
  education:    string
}

// ── DB helpers ─────────────────────────────────────────────────────────────
export const db = {
  async getApplications() {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Application[]
  },

  async addApplication(app: Omit<Application, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('applications')
      .insert([{ ...app, user_id: 'devanshi' }])
      .select()
      .single()
    if (error) throw error
    return data as Application
  },

  async updateApplicationStatus(id: string, status: string) {
    const { error } = await supabase
      .from('applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async deleteApplication(id: string) {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async getCV() {
    const { data, error } = await supabase
      .from('cv_data')
      .select('*')
      .eq('user_id', 'devanshi')
      .single()
    if (error) throw error
    return data as CVData
  },

  async saveCV(cv: CVData) {
    const { error } = await supabase
      .from('cv_data')
      .upsert({ ...cv, user_id: 'devanshi', updated_at: new Date().toISOString() })
    if (error) throw error
  },

  async getAgencyContacts() {
    const { data, error } = await supabase
      .from('agency_contacts')
      .select('*')
      .order('contacted_at', { ascending: false })
    if (error) throw error
    return data as AgencyContact[]
  },

  async addAgencyContact(contact: Omit<AgencyContact, 'id'>) {
    const { data, error } = await supabase
      .from('agency_contacts')
      .insert([{ ...contact, user_id: 'devanshi' }])
      .select()
      .single()
    if (error) throw error
    return data as AgencyContact
  },
}
