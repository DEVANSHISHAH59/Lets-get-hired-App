'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { db, Application, CVData } from '@/lib/supabase'
import { JOBS, COMPANIES, PORTALS, AGENCIES, QUOTES, TIPS, SV_NEWS } from '@/lib/data'
import {
  LayoutDashboard, Briefcase, Newspaper, Building2, Globe, Users,
  ClipboardList, FileText, Brain, TrendingUp, Calendar, ChevronRight,
  ExternalLink, Plus, Trash2, RefreshCw, Star, CheckCircle, Clock,
  XCircle, AlertCircle, Award, Target, Zap, Sparkles, Menu, X,
  Bell, Radio, ChevronDown,
} from 'lucide-react'

// ── colour maps ───────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  'Trust & Safety': 'chip-ts', 'AI Analyst': 'chip-ai',
  'Data Analyst': 'chip-da', 'Product Owner': 'chip-po', 'Business Analyst': 'chip-ba',
}
const STATUS_COLORS: Record<string, string> = {
  Saved: 'chip-saved', Applied: 'chip-applied', Interviewing: 'chip-interviewing',
  Offer: 'chip-offer', Rejected: 'chip-rejected', Ghosted: 'chip-ghosted',
}
const STATUS_ICONS: Record<string, React.ReactNode> = {
  Saved: <Clock size={11} />, Applied: <CheckCircle size={11} />, Interviewing: <Star size={11} />,
  Offer: <Award size={11} />, Rejected: <XCircle size={11} />, Ghosted: <AlertCircle size={11} />,
}
const CAT_COLORS: Record<string, string> = {
  'Big Tech': '#059669', AI: '#1d4ed8', Fintech: '#0369a1', SaaS: '#b45309',
  Security: '#b91c1c', Platforms: '#0f766e', Consulting: '#047857',
  Finance: '#1d4ed8', Startup: '#d97706',
}
const CAT_BG: Record<string, string> = {
  'Big Tech': '#ecfdf5', AI: '#dbeafe', Fintech: '#e0f2fe', SaaS: '#fef3c7',
  Security: '#fee2e2', Platforms: '#ccfbf1', Consulting: '#d1fae5',
  Finance: '#dbeafe', Startup: '#fef3c7',
}

function roleChip(role: string) {
  return <span className={`chip ${ROLE_COLORS[role] || 'chip-saved'}`}>{role}</span>
}
function statusChip(status: string) {
  return (
    <span className={`chip ${STATUS_COLORS[status] || 'chip-saved'} flex items-center gap-1`}>
      {STATUS_ICONS[status]}{status}
    </span>
  )
}
function ageBadge(age: number) {
  if (age <= 7) return <span className="badge-hot ml-1">HOT</span>
  if (age <= 14) return <span className="badge-new ml-1">NEW</span>
  return null
}

// ── nav config ────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'Dashboard',       icon: <LayoutDashboard size={18} /> },
  { id: 'jobs',      label: 'Live Jobs',        icon: <Briefcase size={18} /> },
  { id: 'silicon',   label: 'Silicon Republic', icon: <Newspaper size={18} /> },
  { id: 'svnews',    label: 'AI & Tech News',   icon: <TrendingUp size={18} /> },
  { id: 'companies', label: 'All Companies',    icon: <Building2 size={18} /> },
  { id: 'portals',   label: 'Job Portals',      icon: <Globe size={18} /> },
  { id: 'agencies',  label: 'Agencies',         icon: <Users size={18} /> },
  { id: 'tracker',   label: 'My Tracker',       icon: <ClipboardList size={18} /> },
  { id: 'cv',        label: 'CV Editor',        icon: <FileText size={18} /> },
  { id: 'interview', label: 'Interview Prep',   icon: <Brain size={18} /> },
  { id: 'plan',      label: '4-Week Plan',       icon: <Calendar size={18} /> },
  { id: 'salary',    label: 'Salary Guide',     icon: <Target size={18} /> },
]

// Bottom nav (mobile) — 5 most important
const BOTTOM_NAV = [
  { id: 'dashboard', label: 'Home',    icon: <LayoutDashboard size={20} /> },
  { id: 'jobs',      label: 'Jobs',    icon: <Briefcase size={20} /> },
  { id: 'svnews',    label: 'News',    icon: <TrendingUp size={20} /> },
  { id: 'tracker',   label: 'Tracker', icon: <ClipboardList size={20} /> },
  { id: 'plan',      label: 'Plan',    icon: <Calendar size={20} /> },
]

const STATUSES = ['Saved', 'Applied', 'Interviewing', 'Offer', 'Rejected', 'Ghosted']
const ROLES    = ['Trust & Safety', 'AI Analyst', 'Data Analyst', 'Product Owner', 'Business Analyst']

// ── auto-polling hooks ────────────────────────────────────────────────────────
const NEWS_INTERVAL = 30 * 60 * 1000   // 30 min
const JOBS_INTERVAL = 60 * 60 * 1000   // 60 min
const APPS_INTERVAL =  2 * 60 * 1000   //  2 min

/** returns seconds until next poll */
function useCountdown(intervalMs: number, lastUpdated: string | null) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    if (!lastUpdated) return
    function tick() {
      const elapsed = Date.now() - new Date(lastUpdated!).getTime()
      const remaining = Math.max(0, intervalMs - elapsed)
      setSecs(Math.ceil(remaining / 1000))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lastUpdated, intervalMs])
  return secs
}

function fmt(secs: number) {
  if (secs <= 0) return 'now'
  const m = Math.floor(secs / 60), s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function useLiveNews() {
  const [news, setNews]             = useState<any[]>([])
  const [loading, setLoading]       = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [newCount, setNewCount]     = useState(0)
  const prevTitles                  = useRef<Set<string>>(new Set())

  const fetch_ = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/news')
      if (!res.ok) return
      const data = await res.json()
      if (data.news?.length) {
        const fresh = data.news.filter((n: any) => !prevTitles.current.has(n.title))
        if (fresh.length && prevTitles.current.size > 0) setNewCount(c => c + fresh.length)
        data.news.forEach((n: any) => prevTitles.current.add(n.title))
        setNews(data.news)
        setLastUpdated(data.lastUpdated)
      }
    } catch { /* fallback to static */ } finally { if (!silent) setLoading(false) }
  }, [])

  useEffect(() => {
    fetch_()
    const id = setInterval(() => fetch_(true), NEWS_INTERVAL)
    // Also re-fetch when tab becomes visible
    const onVisible = () => { if (document.visibilityState === 'visible') fetch_(true) }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [fetch_])

  return { news, loading, lastUpdated, newCount, clearNew: () => setNewCount(0), refresh: fetch_ }
}

function useLiveJobs() {
  const [liveJobs, setLiveJobs]     = useState<any[]>([])
  const [loading, setLoading]       = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [newCount, setNewCount]     = useState(0)
  const prevIds                     = useRef<Set<string>>(new Set())

  const fetch_ = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/jobs')
      if (!res.ok) return
      const data = await res.json()
      if (data.jobs?.length) {
        const fresh = data.jobs.filter((j: any) => !prevIds.current.has(j.id))
        if (fresh.length && prevIds.current.size > 0) setNewCount(c => c + fresh.length)
        data.jobs.forEach((j: any) => prevIds.current.add(j.id))
        setLiveJobs(data.jobs)
        setLastUpdated(data.lastUpdated)
      }
    } catch { /* fallback */ } finally { if (!silent) setLoading(false) }
  }, [])

  useEffect(() => {
    fetch_()
    const id = setInterval(() => fetch_(true), JOBS_INTERVAL)
    const onVisible = () => { if (document.visibilityState === 'visible') fetch_(true) }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [fetch_])

  return { liveJobs, loading, lastUpdated, newCount, clearNew: () => setNewCount(0), refresh: fetch_ }
}

// ── toast notification ────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className="toast animate-slide-up">
      <Bell size={14} style={{ color: '#059669', flexShrink: 0 }} />
      <span>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6ee7b7', marginLeft: 'auto' }}>
        <X size={12} />
      </button>
    </div>
  )
}

// ── live pulse dot ────────────────────────────────────────────────────────────
function PulseDot({ color = '#15803d' }: { color?: string }) {
  return (
    <span className="relative inline-flex" style={{ width: 8, height: 8 }}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: color }} />
      <span className="relative inline-flex rounded-full" style={{ width: 8, height: 8, background: color }} />
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage]           = useState('dashboard')
  const [apps, setApps]           = useState<Application[]>([])
  const [cv, setCV]               = useState<CVData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [quote]                   = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])
  const [tip]                     = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)])
  const [sidebarOpen, setSidebar] = useState(true)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [toast, setToast]         = useState<string | null>(null)
  const appsLastUpdated           = useRef<string>(new Date().toISOString())

  // Initial load
  useEffect(() => {
    Promise.all([
      db.getApplications().then(setApps).catch(() => {}),
      db.getCV().then(setCV).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  // Auto-refresh applications every 2 min
  useEffect(() => {
    const id = setInterval(async () => {
      const fresh = await db.getApplications().catch(() => null)
      if (fresh) {
        if (fresh.length > apps.length) setToast(`${fresh.length - apps.length} new application(s) synced`)
        setApps(fresh)
        appsLastUpdated.current = new Date().toISOString()
      }
    }, APPS_INTERVAL)
    return () => clearInterval(id)
  }, [apps.length])

  // Live jobs — runs at root so Dashboard always stays fresh
  const { liveJobs, loading: liveLoading, lastUpdated: liveLastUpdated, newCount: liveNewCount, clearNew: liveClearNew, refresh: liveRefresh } = useLiveJobs()

  const refreshApps = useCallback(async () => {
    const fresh = await db.getApplications().catch(() => null)
    if (fresh) setApps(fresh)
  }, [])

  const stats = {
    total:      apps.length,
    applied:    apps.filter(a => a.status === 'Applied').length,
    interviews: apps.filter(a => a.status === 'Interviewing').length,
    offers:     apps.filter(a => a.status === 'Offer').length,
    rate:       apps.length ? Math.round(apps.filter(a => ['Interviewing', 'Offer'].includes(a.status)).length / apps.length * 100) : 0,
  }

  function nav(id: string) { setPage(id); setMobileMenu(false) }

  return (
    <div style={{ background: '#faf7ff', minHeight: '100vh' }}>

      {/* ── TOAST ──────────────────────────────────────────────────── */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* ── MOBILE OVERLAY SIDEBAR ─────────────────────────────────── */}
      {mobileMenu && (
        <div className="mobile-overlay" onClick={() => setMobileMenu(false)}>
          <div className="mobile-drawer" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#d1fae5' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg,#059669,#ec4899)', color: 'white' }}>LGH</div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: '#1e3a5f' }}>Let's Get Hired</div>
                  <div className="text-xs font-medium" style={{ color: '#059669' }}>Devanshi · Dublin</div>
                </div>
              </div>
              <button onClick={() => setMobileMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6ee7b7' }}>
                <X size={20} />
              </button>
            </div>
            <nav className="p-3 space-y-1 overflow-y-auto" style={{ flex: 1 }}>
              {NAV.map(n => (
                <button key={n.id} onClick={() => nav(n.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left"
                  style={{
                    background: page === n.id ? 'linear-gradient(135deg,#059669,#10b981)' : 'transparent',
                    color: page === n.id ? 'white' : '#064e3b',
                    border: 'none', cursor: 'pointer',
                    boxShadow: page === n.id ? '0 3px 10px rgba(5,150,105,0.25)' : 'none',
                  }}>
                  {n.icon}<span>{n.label}</span>
                  {page === n.id && <ChevronRight size={14} className="ml-auto" />}
                </button>
              ))}
            </nav>
            {/* Quick stats in drawer */}
            <div className="p-4 border-t grid grid-cols-4 gap-2" style={{ borderColor: '#d1fae5' }}>
              {[['Apps', stats.total, '#059669'], ['Applied', stats.applied, '#1d4ed8'], ['Interview', stats.interviews, '#b45309'], ['Offers', stats.offers, '#15803d']].map(([l, v, c]) => (
                <div key={l as string} className="text-center p-2 rounded-xl" style={{ background: '#f0fdf4' }}>
                  <div className="text-lg font-bold" style={{ color: c as string }}>{v as number}</div>
                  <div className="text-xs" style={{ color: '#64748b' }}>{l as string}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="app-layout">

        {/* ── DESKTOP SIDEBAR ──────────────────────────────────────── */}
        <aside className={`desktop-sidebar ${sidebarOpen ? 'sidebar-wide' : 'sidebar-slim'}`}>
          <div className="p-4">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#059669,#ec4899)', color: 'white', boxShadow: '0 4px 12px rgba(5,150,105,0.35)' }}>
                LGH
              </div>
              {sidebarOpen && (
                <div>
                  <div className="font-semibold text-sm" style={{ fontFamily: 'Sora,sans-serif', color: '#1e3a5f' }}>Let's Get Hired</div>
                  <div className="text-xs font-medium flex items-center gap-1" style={{ color: '#059669' }}>
                    <PulseDot color="#059669" />
                    <span>Devanshi · Dublin · Live</span>
                  </div>
                </div>
              )}
              <button onClick={() => setSidebar(!sidebarOpen)} className="ml-auto p-1 rounded-lg"
                style={{ color: '#6ee7b7', background: '#f0fdf4', border: '1px solid #d1fae5', cursor: 'pointer' }}>
                <ChevronRight size={12} style={{ transform: sidebarOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
              </button>
            </div>

            {sidebarOpen && (
              <>
                {/* Quote */}
                <div className="mb-4 p-3 rounded-xl text-xs italic leading-relaxed" style={{ background: '#f0fdf4', borderLeft: '3px solid #6ee7b7', color: '#064e3b' }}>
                  "{quote.text}"
                  <div className="mt-1 not-italic font-medium" style={{ color: '#059669' }}>— {quote.author}</div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {[['Tracked', stats.total, '#059669'], ['Applied', stats.applied, '#1d4ed8'], ['Interviews', stats.interviews, '#b45309'], ['Offers', stats.offers, '#15803d']].map(([l, v, c]) => (
                    <div key={l as string} className="p-2 rounded-xl text-center" style={{ background: '#faf7ff', border: '1px solid #d1fae5' }}>
                      <div className="text-lg font-bold" style={{ fontFamily: 'Sora', color: c as string }}>{v as number}</div>
                      <div className="text-xs" style={{ color: '#64748b' }}>{l as string}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Nav */}
            <nav className="space-y-1">
              {NAV.map(n => (
                <button key={n.id} onClick={() => nav(n.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    background: page === n.id ? 'linear-gradient(135deg,#059669,#10b981)' : 'transparent',
                    color: page === n.id ? 'white' : '#064e3b',
                    border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', textAlign: 'left',
                    boxShadow: page === n.id ? '0 3px 10px rgba(5,150,105,0.28)' : 'none',
                  }}>
                  <span className="flex-shrink-0">{n.icon}</span>
                  {sidebarOpen && <span className="font-medium">{n.label}</span>}
                  {sidebarOpen && page === n.id && <ChevronRight size={12} className="ml-auto" />}
                </button>
              ))}
            </nav>

            {sidebarOpen && (
              <div className="mt-6">
                <div className="text-xs font-bold mb-2 px-1 flex items-center gap-1 uppercase tracking-wider" style={{ color: '#059669' }}>
                  <Zap size={10} /> Quick links
                </div>
                {[
                  ['Silicon Republic', 'https://www.siliconrepublic.com'],
                  ['LinkedIn Jobs', 'https://www.linkedin.com/jobs/search/?keywords=trust+safety+analyst&location=Dublin'],
                  ['Indeed Ireland', 'https://ie.indeed.com/jobs?q=analyst&l=Dublin&fromage=1'],
                  ['IrishJobs.ie', 'https://www.irishjobs.ie'],
                  ['Otta Dublin', 'https://otta.com/jobs/search?location=Dublin'],
                ].map(([l, u]) => (
                  <a key={l} href={u} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-purple-50"
                    style={{ color: '#64748b', textDecoration: 'none' }}>
                    <ExternalLink size={10} style={{ color: '#6ee7b7', flexShrink: 0 }} />{l}
                  </a>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
        <div className="main-wrapper">
          {/* Mobile top bar */}
          <header className="mobile-topbar">
            <button onClick={() => setMobileMenu(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', padding: 8 }}>
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: 'linear-gradient(135deg,#059669,#ec4899)', color: 'white' }}>LGH</div>
              <span className="font-semibold text-sm" style={{ color: '#1e3a5f' }}>Let's Get Hired</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#059669' }}>
              <PulseDot color="#059669" />
              <span>Live</span>
            </div>
          </header>

          <main className="main-content">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#059669,#ec4899)' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ color: 'white' }} />
                </div>
                <div className="text-center">
                  <p className="font-semibold" style={{ color: '#059669' }}>Loading your job hunt HQ...</p>
                  <p className="text-xs mt-1" style={{ color: '#6ee7b7' }}>Connecting to Supabase & live feeds</p>
                </div>
              </div>
            ) : (
              <>
                {page === 'dashboard' && <Dashboard stats={stats} apps={apps} tip={tip} setPage={nav} liveJobs={liveJobs} liveLastUpdated={liveLastUpdated} liveLoading={liveLoading} />}
                {page === 'jobs'      && <LiveJobs apps={apps} onTrack={refreshApps} liveJobs={liveJobs} liveLoading={liveLoading} liveLastUpdated={liveLastUpdated} liveNewCount={liveNewCount} liveClearNew={liveClearNew} liveRefresh={liveRefresh} />}
                {page === 'silicon'   && <SiliconRepublic />}
                {page === 'svnews'    && <SVNews />}
                {page === 'companies' && <Companies />}
                {page === 'portals'   && <Portals />}
                {page === 'agencies'  && <Agencies />}
                {page === 'tracker'   && <Tracker apps={apps} onRefresh={refreshApps} />}
                {page === 'cv'        && <CVEditor cv={cv} onSave={setCV} />}
                {page === 'interview' && <InterviewPrep />}
                {page === 'plan'      && <WeeklyPlan />}
                {page === 'salary'    && <SalaryGuide />}
              </>
            )}
          </main>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ────────────────────────────────────────── */}
      <nav className="bottom-nav">
        {BOTTOM_NAV.map(n => (
          <button key={n.id} onClick={() => nav(n.id)}
            className="bottom-nav-item"
            style={{ color: page === n.id ? '#059669' : '#9ca3af' }}>
            <div className="relative">
              {n.icon}
            </div>
            <span>{n.label}</span>
            {page === n.id && <div className="bottom-nav-dot" />}
          </button>
        ))}
        <button onClick={() => setMobileMenu(true)} className="bottom-nav-item" style={{ color: '#9ca3af' }}>
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard({ stats, apps, tip, setPage, liveJobs, liveLastUpdated, liveLoading }: {
  stats: any; apps: Application[]; tip: string; setPage: (p: string) => void
  liveJobs: any[]; liveLastUpdated: string | null; liveLoading: boolean
}) {
  const countdown = useCountdown(JOBS_INTERVAL, liveLastUpdated)
  const hotJobs = liveJobs.length > 0 ? liveJobs.slice(0, 6) : JOBS.filter(j => j.age <= 7).slice(0, 6)
  const isLive  = liveJobs.length > 0
  const recent  = [...apps].sort((a, b) => b.created_at?.localeCompare(a.created_at || '') || 0).slice(0, 5)

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="rounded-2xl p-6 mb-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#059669 0%,#10b981 45%,#ec4899 100%)' }}>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} style={{ color: '#fde68a' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#fde68a' }}>Job Hunt Command Centre · Live</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Sora' }}>Let's Get Hired 🚀</h1>
          <p className="text-sm text-white/80">Dublin · Trust & Safety · AI Analyst · Data · PO · BA</p>
        </div>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
      </div>

      {/* Tip */}
      <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
        <Zap size={14} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: '#92400e' }}>Tip of the Day</div>
          <div className="text-sm" style={{ color: '#78350f' }}>{tip}</div>
        </div>
      </div>

      {/* Stats grid — 2 cols mobile, 5 desktop */}
      <div className="stats-grid mb-5">
        {[
          { l: 'Tracked',    v: stats.total,      color: '#059669', bg: '#ecfdf5' },
          { l: 'Applied',    v: stats.applied,    color: '#1d4ed8', bg: '#dbeafe' },
          { l: 'Interviews', v: stats.interviews, color: '#b45309', bg: '#fef3c7' },
          { l: 'Offers',     v: stats.offers,     color: '#15803d', bg: '#dcfce7' },
          { l: 'Response %', v: `${stats.rate}%`, color: '#059669', bg: '#f0fdf4' },
        ].map(s => (
          <div key={s.l} className="stat-card">
            <div className="text-2xl font-bold mb-1" style={{ fontFamily: 'Sora', color: s.color }}>{s.v}</div>
            <div className="text-xs font-medium" style={{ color: '#64748b' }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-cols">
        {/* Hot jobs */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#1e3a5f' }}>
              {isLive ? <><PulseDot /><span className="badge-live">LIVE</span></> : <span className="badge-hot">HOT</span>}
              Jobs right now
            </h2>
            <div className="flex items-center gap-2">
              {liveLoading && <RefreshCw size={11} className="animate-spin" style={{ color: '#6ee7b7' }} />}
              {liveLastUpdated && !liveLoading && (
                <span className="text-xs" style={{ color: '#6ee7b7' }}>
                  next in {fmt(countdown)}
                </span>
              )}
            </div>
          </div>
          {isLive && liveLastUpdated && (
            <div className="text-xs mb-2 flex items-center gap-1.5" style={{ color: '#15803d' }}>
              <PulseDot /><span>Updated {new Date(liveLastUpdated).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
          <div className="space-y-2">
            {hotJobs.map((j: any, i: number) => (
              <div key={j.id || i} className="card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: '#1e3a5f' }}>{j.title}</div>
                    <div className="text-xs mt-1 flex items-center gap-2 flex-wrap">
                      <span style={{ color: '#059669', fontWeight: 500 }}>{j.company}</span>
                      <span className="badge-sal">{j.salary}</span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#64748b' }}>{j.posted || j.source}</div>
                  </div>
                  <a href={j.url} target="_blank" rel="noreferrer"
                    className="btn-ghost text-xs py-1 px-2 flex-shrink-0 flex items-center gap-1">
                    <ExternalLink size={10} />Open
                  </a>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setPage('jobs')} className="btn-primary w-full mt-3 text-xs py-2 flex items-center justify-center gap-1">
            <Briefcase size={12} /> View all live jobs
          </button>
        </div>

        {/* Quick search + recent */}
        <div>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#1e3a5f' }}>
            <Radio size={13} style={{ color: '#059669' }} /> Search now
          </h2>
          <div className="space-y-1 mb-5">
            {[
              ['LinkedIn - T&S Dublin today', 'https://www.linkedin.com/jobs/search/?keywords=trust+safety+analyst&location=Dublin&f_TPR=r86400'],
              ['LinkedIn - AI Analyst Dublin', 'https://www.linkedin.com/jobs/search/?keywords=AI+analyst+LLM&location=Dublin&f_TPR=r86400'],
              ['Indeed - Business Analyst Dublin', 'https://ie.indeed.com/jobs?q=business+analyst&l=Dublin&fromage=1&sort=date'],
              ['Indeed - Product Owner Dublin', 'https://ie.indeed.com/jobs?q=product+owner&l=Dublin&fromage=1&sort=date'],
              ['IrishJobs - Analyst roles', 'https://www.irishjobs.ie/Jobs/analyst/in-Dublin'],
              ['Silicon Republic Jobs', 'https://www.siliconrepublic.com/jobs'],
              ['CPL - Analyst Dublin', 'https://www.cpl.com/jobs?searchType=keyword&keyword=analyst&location=Dublin'],
            ].map(([l, u]) => (
              <a key={l} href={u} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg transition-colors hover:bg-purple-50"
                style={{ color: '#1e3a5f', textDecoration: 'none' }}>
                <ExternalLink size={10} style={{ color: '#6ee7b7', flexShrink: 0 }} />{l}
              </a>
            ))}
          </div>

          {recent.length > 0 && (
            <>
              <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#1e3a5f' }}>
                <Clock size={13} style={{ color: '#059669' }} /> Recent applications
              </h2>
              <div className="space-y-2">
                {recent.map(a => (
                  <div key={a.id} className="card p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate" style={{ color: '#1e3a5f' }}>{a.title}</div>
                      <div className="text-xs mt-0.5 font-medium" style={{ color: '#059669' }}>{a.company} · {a.date_applied}</div>
                    </div>
                    {statusChip(a.status)}
                  </div>
                ))}
              </div>
              <button onClick={() => setPage('tracker')} className="btn-ghost w-full mt-3 text-xs py-2 flex items-center justify-center gap-1">
                <ClipboardList size={12} /> Open full tracker
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE JOBS — auto-polls every 60 min
// ═══════════════════════════════════════════════════════════════════════════════
function LiveJobs({ apps, onTrack, liveJobs, liveLoading, liveLastUpdated, liveNewCount, liveClearNew, liveRefresh }: {
  apps: Application[]; onTrack: () => void
  liveJobs: any[]; liveLoading: boolean; liveLastUpdated: string | null
  liveNewCount: number; liveClearNew: () => void; liveRefresh: () => void
}) {
  const [roleF, setRoleF]   = useState('All')
  const [sortF, setSortF]   = useState('newest')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  const lastUpdated = liveLastUpdated
  const newCount    = liveNewCount
  const clearNew    = liveClearNew
  const refresh     = liveRefresh
  const countdown   = useCountdown(JOBS_INTERVAL, lastUpdated)

  let jobs = JOBS.filter(j =>
    (roleF === 'All' || j.role === roleF) &&
    (!search || (j.title + j.company).toLowerCase().includes(search.toLowerCase()))
  )
  if (sortF === 'newest') jobs = [...jobs].sort((a, b) => a.age - b.age)
  else jobs = [...jobs].sort((a, b) => parseInt(b.salary) - parseInt(a.salary))

  const alreadyTracked = new Set(apps.map(a => a.title + a.company))

  async function trackJob(j: typeof JOBS[0]) {
    setAdding(j.title + j.company)
    try {
      await db.addApplication({
        title: j.title, company: j.company, role_type: j.role, source: j.source,
        status: 'Saved', date_applied: new Date().toISOString().slice(0, 10),
        posted_date: j.posted, salary: j.salary, job_url: j.url, contact_name: '', notes: '',
      })
      await onTrack()
    } finally { setAdding(null) }
  }

  async function trackLiveJob(j: any) {
    setAdding(j.id)
    try {
      await db.addApplication({
        title: j.title, company: j.company, role_type: 'Trust & Safety', source: j.source,
        status: 'Saved', date_applied: new Date().toISOString().slice(0, 10),
        posted_date: j.posted, salary: j.salary, job_url: j.url, contact_name: '',
        notes: 'Sourced via live feed',
      })
      await onTrack()
    } finally { setAdding(null) }
  }

  return (
    <div className="animate-fade-in">
      {/* Header + refresh status */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="section-header">Live Job Listings · Dublin 2026</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>Curated roles + live feed. HOT = posted this week.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={() => { clearNew(); refresh() }} disabled={liveLoading}
            className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5">
            <RefreshCw size={11} className={liveLoading ? 'animate-spin' : ''} />
            {liveLoading ? 'Fetching...' : newCount > 0 ? `${newCount} new! Refresh` : 'Refresh'}
          </button>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#6ee7b7' }}>
              <PulseDot color="#059669" />
              <span>Next update in {fmt(countdown)}</span>
            </div>
          )}
        </div>
      </div>

      {/* New jobs notification */}
      {newCount > 0 && (
        <div className="rounded-xl p-3 mb-4 flex items-center justify-between gap-3" style={{ background: '#ecfdf5', border: '1px solid #6ee7b7' }}>
          <div className="flex items-center gap-2">
            <Bell size={14} style={{ color: '#059669' }} />
            <span className="text-sm font-semibold" style={{ color: '#065f46' }}>{newCount} new jobs found since last check!</span>
          </div>
          <button onClick={() => { clearNew(); refresh() }} className="btn-primary text-xs py-1 px-3">View</button>
        </div>
      )}

      {/* Live jobs banner */}
      {liveJobs.length > 0 && (
        <div className="rounded-xl p-4 mb-4" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
          <div className="flex items-center gap-2 mb-3">
            <PulseDot />
            <span className="text-xs font-bold" style={{ color: '#15803d' }}>
              LIVE — {liveJobs.length} jobs from LinkedIn / Indeed / Glassdoor
            </span>
            {lastUpdated && (
              <span className="text-xs ml-auto" style={{ color: '#64748b' }}>
                {new Date(lastUpdated).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {liveJobs.slice(0, 6).map((j: any) => (
              <div key={j.id} className="card p-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: '#1e3a5f' }}>{j.title}</div>
                    <div className="text-xs mt-1" style={{ color: '#059669' }}>
                      {j.company} · {j.location} · via {j.source}
                      <span className="badge-sal ml-2">{j.salary}</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#64748b' }}>{j.desc}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <a href={j.url} target="_blank" rel="noreferrer" className="btn-ghost text-xs py-1 px-2 flex items-center gap-1">
                      <ExternalLink size={10} />Open
                    </a>
                    <button className="btn-primary text-xs py-1 px-2 flex items-center gap-1"
                      onClick={() => trackLiveJob(j)} disabled={adding === j.id}>
                      <Plus size={10} />{adding === j.id ? '...' : 'Track'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Prominent role type filter pills ─────────────── */}
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#064e3b' }}>Filter by role type</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All Roles',        value: 'All',             cls: 'role-pill-all',  icon: '🌟' },
            { label: 'Trust & Safety',   value: 'Trust & Safety',  cls: 'role-pill-ts',   icon: '🛡️' },
            { label: 'AI Analyst',       value: 'AI Analyst',      cls: 'role-pill-ai',   icon: '🤖' },
            { label: 'Data Analyst',     value: 'Data Analyst',    cls: 'role-pill-da',   icon: '📊' },
            { label: 'Product Owner',    value: 'Product Owner',   cls: 'role-pill-po',   icon: '🎯' },
            { label: 'Business Analyst', value: 'Business Analyst',cls: 'role-pill-ba',   icon: '💼' },
          ].map(r => (
            <button key={r.value} onClick={() => setRoleF(r.value)}
              className={`role-pill ${roleF === r.value ? r.cls : 'role-pill-inactive'}`}>
              <span>{r.icon}</span>{r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search + sort row */}
      <div className="filter-row mb-4">
        <input className="input flex-1 min-w-0" placeholder="Search any job title, company, or keyword..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input" style={{ width: 150 }} value={sortF} onChange={e => setSortF(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="salary">Salary (high)</option>
        </select>
      </div>

      <p className="text-xs mb-3 font-medium" style={{ color: '#059669' }}>{jobs.length} roles matching · {roleF}</p>

      <div className="space-y-3">
        {jobs.map((j, i) => {
          const tracked = alreadyTracked.has(j.title + j.company)
          return (
            <div key={i} className="card p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold" style={{ color: '#1e3a5f' }}>{j.title}</span>
                    {ageBadge(j.age)}
                  </div>
                  <div className="text-xs mb-2 flex items-center gap-2 flex-wrap">
                    <span style={{ color: '#059669', fontWeight: 500 }}>{j.company}</span>
                    <span style={{ color: '#64748b' }}>· Dublin · via {j.source}</span>
                    <span className="badge-sal">{j.salary}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{j.desc}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs font-medium" style={{ color: j.age <= 7 ? '#15803d' : '#1d4ed8' }}>{j.posted}</span>
                    {roleChip(j.role)}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  <a href={j.url} target="_blank" rel="noreferrer" className="btn-ghost text-xs py-1 px-3 flex items-center gap-1">
                    <ExternalLink size={11} />Open
                  </a>
                  <button className="btn-primary text-xs py-1 px-3 flex items-center gap-1"
                    onClick={() => !tracked && trackJob(j)}
                    disabled={tracked || adding === j.title + j.company}
                    style={{ opacity: tracked ? 0.5 : 1 }}>
                    <Plus size={11} />{tracked ? 'Tracked' : adding === j.title + j.company ? '...' : 'Track'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SILICON REPUBLIC
// ═══════════════════════════════════════════════════════════════════════════════
function SiliconRepublic() {
  const srJobs = [
    { title: 'Trust & Safety Operations Analyst - OpenAI Dublin', url: 'https://openai.com/careers/trust-and-safety-operations-analyst-2/', co: 'OpenAI', dt: 'Active' },
    { title: 'Reporting & Insights Analyst Youth Safety - TikTok Dublin', url: 'https://careers.tiktok.com/position?location=CT_211', co: 'TikTok', dt: '7 days ago' },
    { title: 'Engineering Analyst AI Safety - Google Dublin', url: 'https://careers.google.com/jobs/results/99432678838674118-engineering-analyst/', co: 'Google', dt: 'Feb 2026' },
    { title: 'GRO Intelligence Analyst - Meta Dublin', url: 'https://www.metacareers.com/jobs?offices=Dublin', co: 'Meta', dt: '10 days ago' },
    { title: 'Business Analyst Financial Services - EY Dublin', url: 'https://www.ey.com/en_ie/careers', co: 'EY', dt: 'Active' },
    { title: 'AI Governance Analyst - Irish Life Dublin', url: 'https://www.irishjobs.ie', co: 'Irish Life', dt: '6 days ago' },
    { title: 'Senior Manager Trust & Safety - Whatnot Dublin', url: 'https://www.whatnot.com/careers', co: 'Whatnot', dt: 'Active' },
    { title: 'Product Owner Localization AI - LILT Dublin', url: 'https://lilt.com/careers', co: 'LILT', dt: '3 days ago' },
  ]
  const srNews = [
    { title: 'Ireland ranked top European hub for trust & safety as Big Tech expands Dublin', url: 'https://www.siliconrepublic.com/companies', dt: 'This week' },
    { title: 'EU AI Act enforcement begins: what it means for Dublin tech workers in 2026', url: 'https://www.siliconrepublic.com/machines', dt: 'This week' },
    { title: 'OpenAI doubles Dublin Trust & Safety team for EMEA operations', url: 'https://www.siliconrepublic.com/companies', dt: 'Last week' },
    { title: 'TikTok Dublin to hire 200+ across Trust & Safety and Analytics in 2026', url: 'https://www.siliconrepublic.com/companies', dt: 'Last week' },
    { title: 'Data analyst roles surge 40% in Dublin as multinationals scale analytics', url: 'https://www.siliconrepublic.com/data-science', dt: '2 weeks ago' },
  ]
  const [tab, setTab] = useState<'jobs' | 'news' | 'links'>('jobs')

  return (
    <div className="animate-fade-in">
      <h1 className="section-header">Silicon Republic</h1>
      <p className="text-sm mb-4" style={{ color: '#64748b' }}>Irish tech news and Dublin jobs · your daily pulse.</p>
      <div className="flex gap-2 mb-5 flex-wrap">
        {(['jobs', 'news', 'links'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === t ? 'linear-gradient(135deg,#059669,#10b981)' : '#ffffff',
              color: tab === t ? 'white' : '#059669',
              border: `1px solid ${tab === t ? 'transparent' : '#a7f3d0'}`,
              cursor: 'pointer',
              boxShadow: tab === t ? '0 3px 10px rgba(5,150,105,0.25)' : 'none',
            }}>
            {t === 'links' ? 'Direct Links' : t === 'jobs' ? 'Dublin Jobs' : 'Tech News'}
          </button>
        ))}
      </div>
      {tab === 'jobs' && <div className="space-y-2">{srJobs.map((item, i) => (
        <div key={i} className="card p-4">
          <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:underline" style={{ color: '#1e3a5f', textDecoration: 'none' }}>{item.title}</a>
          <div className="text-xs mt-1 flex items-center gap-2"><span className="chip chip-ts">{item.co}</span><span style={{ color: '#64748b' }}>{item.dt}</span></div>
        </div>
      ))}</div>}
      {tab === 'news' && <div className="space-y-2">{srNews.map((item, i) => (
        <div key={i} className="card p-4">
          <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:underline" style={{ color: '#1e3a5f', textDecoration: 'none' }}>{item.title}</a>
          <div className="text-xs mt-1 font-medium" style={{ color: '#059669' }}>Silicon Republic · {item.dt}</div>
        </div>
      ))}</div>}
      {tab === 'links' && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[['AI & Machine Learning', 'https://www.siliconrepublic.com/machines'], ['Jobs in Ireland', 'https://www.siliconrepublic.com/jobs'],
          ['Dublin tech companies', 'https://www.siliconrepublic.com/companies'], ['Data & Analytics', 'https://www.siliconrepublic.com/data-science'],
          ['Cybersecurity', 'https://www.siliconrepublic.com/security'], ['Newsletter signup', 'https://www.siliconrepublic.com/newsletter'],
        ].map(([l, u]) => (
          <a key={l} href={u} target="_blank" rel="noreferrer" className="card p-3 flex items-center gap-2 text-sm font-medium" style={{ color: '#059669', textDecoration: 'none' }}>
            <ExternalLink size={13} style={{ flexShrink: 0 }} />{l}
          </a>
        ))}
      </div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SV & AI NEWS — auto-polls every 30 min
// ═══════════════════════════════════════════════════════════════════════════════
function SVNews() {
  const [tagF, setTagF] = useState('All')
  const { news: liveNews, loading, lastUpdated, newCount, clearNew, refresh } = useLiveNews()
  const countdown = useCountdown(NEWS_INTERVAL, lastUpdated)
  const tags = ['All', 'AI', 'T&S', 'Policy', 'Jobs', 'Ireland']
  const TAG_CLASS: Record<string, string> = {
    AI: 'tag-ai', Policy: 'tag-policy', Jobs: 'tag-jobs', 'T&S': 'tag-ts',
    Ireland: 'tag-ireland', Funding: 'tag-funding',
  }
  const displayNews = liveNews.length > 0 ? liveNews : SV_NEWS
  const isLive = liveNews.length > 0
  const filtered = displayNews.filter((n: any) => tagF === 'All' || n.tag === tagF)

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="section-header">AI & Tech News</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>Silicon Republic · TechCrunch · VentureBeat · live RSS</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={() => { clearNew(); refresh() }} disabled={loading}
            className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Fetching...' : newCount > 0 ? `${newCount} new stories!` : 'Refresh'}
          </button>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#6ee7b7' }}>
              <PulseDot color="#059669" />
              <span>Updates in {fmt(countdown)}</span>
            </div>
          )}
        </div>
      </div>

      {/* EU AI Act alert */}
      <div className="rounded-xl p-4 mb-4 flex items-start gap-3" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
        <AlertCircle size={14} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: '#92400e' }}>EU AI Act enforcement starts August 2, 2026</div>
          <div className="text-sm" style={{ color: '#78350f' }}>Your EU AI Act knowledge is urgently in demand. Companies are hiring AI governance and T&S analysts at unprecedented speed.</div>
        </div>
      </div>

      {/* New stories notification */}
      {newCount > 0 && (
        <div className="rounded-xl p-3 mb-4 flex items-center gap-3" style={{ background: '#ecfdf5', border: '1px solid #6ee7b7' }}>
          <Bell size={14} style={{ color: '#059669' }} />
          <span className="text-sm font-semibold" style={{ color: '#065f46' }}>{newCount} new stories since last visit!</span>
          <button onClick={clearNew} className="btn-primary text-xs py-1 px-2 ml-auto">Dismiss</button>
        </div>
      )}

      {/* Live status */}
      {isLive && lastUpdated && (
        <div className="flex items-center gap-2 mb-3">
          <PulseDot /><span className="badge-live">LIVE</span>
          <span className="text-xs" style={{ color: '#15803d' }}>{liveNews.length} stories · {new Date(lastUpdated).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}

      {/* Tag filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {tags.map(t => (
          <button key={t} onClick={() => setTagF(t)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
            style={{
              background: tagF === t ? '#059669' : '#ffffff',
              color: tagF === t ? 'white' : '#059669',
              border: `1px solid ${tagF === t ? 'transparent' : '#a7f3d0'}`,
              cursor: 'pointer',
            }}>
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((item: any, i: number) => (
          <div key={i} className="card p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <a href={item.url} target="_blank" rel="noreferrer"
                  className="text-sm font-semibold hover:underline leading-snug block mb-1"
                  style={{ color: '#1e3a5f', textDecoration: 'none' }}>{item.title}</a>
                <div className="text-xs flex items-center gap-2 flex-wrap" style={{ color: '#64748b' }}>
                  <span style={{ color: '#059669', fontWeight: 500 }}>{item.source}</span>
                  <span>·</span>
                  <span>{item.date || (item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-IE') : '')}</span>
                </div>
                {item.relevance && <div className="text-xs mt-1.5 italic" style={{ color: '#065f46' }}>Why it matters: {item.relevance}</div>}
                {item.desc && !item.relevance && <p className="text-xs mt-1.5" style={{ color: '#64748b' }}>{item.desc}</p>}
              </div>
              <span className={`${TAG_CLASS[item.tag] || 'tag-ai'} flex-shrink-0`}>{item.tag}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-bold mb-3" style={{ color: '#1e3a5f' }}>Follow these sources daily</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[['TechCrunch AI', 'https://techcrunch.com/category/artificial-intelligence/'], ['VentureBeat AI', 'https://venturebeat.com/category/ai'],
            ['Silicon Republic', 'https://www.siliconrepublic.com/machines'], ['Wired AI', 'https://www.wired.com/tag/artificial-intelligence/'],
            ['MIT Tech Review', 'https://www.technologyreview.com/topic/artificial-intelligence/'], ['EU AI Act tracker', 'https://artificialintelligenceact.eu/'],
          ].map(([l, u]) => (
            <a key={l} href={u} target="_blank" rel="noreferrer" className="card p-3 flex items-center gap-2 text-sm font-medium" style={{ color: '#059669', textDecoration: 'none' }}>
              <ExternalLink size={12} style={{ flexShrink: 0 }} />{l}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPANIES
// ═══════════════════════════════════════════════════════════════════════════════
function Companies() {
  const cats = ['All', ...Array.from(new Set(COMPANIES.map(c => c.cat)))]
  const [catF, setCatF]     = useState('All')
  const [search, setSearch] = useState('')
  const cos = COMPANIES.filter(c => (catF === 'All' || c.cat === catF) && (!search || c.name.toLowerCase().includes(search.toLowerCase())))
  const groups = cats.filter(c => c !== 'All').reduce((acc, cat) => {
    const items = cos.filter(c => c.cat === cat); if (items.length) acc[cat] = items; return acc
  }, {} as Record<string, typeof COMPANIES>)

  return (
    <div className="animate-fade-in">
      <h1 className="section-header">All Companies in Dublin</h1>
      <p className="text-sm mb-4" style={{ color: '#64748b' }}>{COMPANIES.length} companies with Dublin offices.</p>
      <div className="filter-row mb-4">
        <input className="input flex-1 min-w-0" placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input" style={{ width: 160 }} value={catF} onChange={e => setCatF(e.target.value)}>
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <p className="text-xs mb-4 font-medium" style={{ color: '#6ee7b7' }}>{cos.length} companies shown</p>
      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[cat] || '#059669' }} />
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: CAT_COLORS[cat] || '#059669' }}>{cat} ({items.length})</h2>
          </div>
          <div className="companies-grid">
            {items.map((co, i) => (
              <div key={i} className="card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: CAT_BG[co.cat] || '#f0fdf4', color: CAT_COLORS[co.cat] || '#059669' }}>{co.abbr}</div>
                  <div className="font-semibold text-sm truncate" style={{ color: '#1e3a5f' }}>{co.name}</div>
                </div>
                <p className="text-xs mb-2 leading-relaxed" style={{ color: '#64748b' }}>{co.desc}</p>
                <a href={co.url} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 font-medium hover:underline" style={{ color: '#059669', textDecoration: 'none' }}>
                  <ExternalLink size={10} />View jobs
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PORTALS
// ═══════════════════════════════════════════════════════════════════════════════
function Portals() {
  const cats = ['All', 'Irish', 'Global', 'Startup', 'Niche']
  const [catF, setCatF]     = useState('All')
  const [priOnly, setPriOnly] = useState(false)
  const portals = PORTALS.filter(p => (catF === 'All' || p.cat === catF) && (!priOnly || p.priority))
  const groups: Record<string, typeof PORTALS> = {}
  portals.forEach(p => { if (!groups[p.cat]) groups[p.cat] = []; groups[p.cat].push(p) })

  return (
    <div className="animate-fade-in">
      <h1 className="section-header">All Job Portals</h1>
      <p className="text-sm mb-4" style={{ color: '#64748b' }}>{PORTALS.length} portals — Irish, global, startup and niche boards.</p>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex gap-2 flex-wrap">
          {cats.map(c => (
            <button key={c} onClick={() => setCatF(c)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{ background: catF === c ? '#059669' : '#ffffff', color: catF === c ? 'white' : '#059669', border: `1px solid ${catF === c ? 'transparent' : '#a7f3d0'}`, cursor: 'pointer' }}>
              {c}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer ml-auto font-semibold" style={{ color: '#059669' }}>
          <input type="checkbox" checked={priOnly} onChange={e => setPriOnly(e.target.checked)} style={{ accentColor: '#059669' }} />
          Priority only
        </label>
      </div>
      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat} className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#059669' }}>{cat} portals ({items.length})</h2>
          <div className="companies-grid">
            {items.map((p, i) => (
              <div key={i} className="card p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold" style={{ color: '#1e3a5f' }}>{p.name}</span>
                  {p.priority && <span className="badge-pri">TOP</span>}
                </div>
                <p className="text-xs mb-2" style={{ color: '#64748b' }}>{p.desc}</p>
                <a href={p.url} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 font-medium hover:underline" style={{ color: '#059669', textDecoration: 'none' }}>
                  <ExternalLink size={10} />Search jobs
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENCIES
// ═══════════════════════════════════════════════════════════════════════════════
function Agencies() {
  const tiers = ['All', 'Priority', 'Good', 'Also']
  const [tierF, setTierF] = useState('All')
  const agencies = AGENCIES.filter(a => tierF === 'All' || a.tier === tierF)
  const groups: Record<string, typeof AGENCIES> = {}
  agencies.forEach(a => { if (!groups[a.tier]) groups[a.tier] = []; groups[a.tier].push(a) })
  const tierOrder = ['Priority', 'Good', 'Also']
  const tierLabels: Record<string, string> = { Priority: 'Priority — Register this week', Good: 'Good — Worth registering', Also: 'Also in Dublin' }
  const TIER_COLORS: Record<string, string> = { Priority: '#059669', Good: '#1d4ed8', Also: '#64748b' }

  return (
    <div className="animate-fade-in">
      <h1 className="section-header">Recruitment Agencies</h1>
      <p className="text-sm mb-3" style={{ color: '#64748b' }}>{AGENCIES.length} agencies — 80% of Dublin tech roles go through agencies first!</p>
      <div className="rounded-xl p-4 mb-4" style={{ background: '#f0fdf4', border: '1px solid #6ee7b7' }}>
        <div className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: '#065f46' }}>What to say when you contact them</div>
        <p className="text-sm leading-relaxed" style={{ color: '#064e3b' }}>
          "Hi, I am a Trust & Safety AI Analyst with 3+ years experience at Meta, including LLM evaluation, abuse detection and content policy. I hold an MSc in Business Analytics from Dublin Business School and am CSPO certified. I am immediately available for permanent roles in Dublin as a T&S Analyst, AI Analyst, Data Analyst, Business Analyst or Product Owner. Salary expectation: EUR55–80k. Can we schedule a call?"
        </p>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {tiers.map(t => (
          <button key={t} onClick={() => setTierF(t)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{ background: tierF === t ? '#059669' : '#ffffff', color: tierF === t ? 'white' : '#059669', border: `1px solid ${tierF === t ? 'transparent' : '#a7f3d0'}`, cursor: 'pointer' }}>
            {t}
          </button>
        ))}
      </div>
      {tierOrder.filter(t => groups[t]).map(tier => (
        <div key={tier} className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: TIER_COLORS[tier] }}>
            <div className="w-2 h-2 rounded-full" style={{ background: TIER_COLORS[tier] }} />{tierLabels[tier]} ({groups[tier].length})
          </h2>
          <div className="space-y-2">
            {groups[tier].map((a, i) => (
              <div key={i} className="card p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold" style={{ color: '#1e3a5f' }}>{a.name}</span>
                    {a.tier === 'Priority' && <span className="badge-pri">PRIORITY</span>}
                  </div>
                  <p className="text-xs" style={{ color: '#64748b' }}>{a.desc}</p>
                  <p className="text-xs mt-1 font-semibold" style={{ color: '#059669' }}>Best for: {a.roles}</p>
                </div>
                <a href={a.url} target="_blank" rel="noreferrer" className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1 flex-shrink-0">
                  <ExternalLink size={10} />View jobs
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACKER — applications auto-sync every 2 min
// ═══════════════════════════════════════════════════════════════════════════════
function Tracker({ apps, onRefresh }: { apps: Application[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [statusF, setStatusF]   = useState('All')
  const [roleF, setRoleF]       = useState('All')
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [form, setForm] = useState({
    title: '', company: '', role_type: 'Trust & Safety', source: '', status: 'Saved',
    date_applied: new Date().toISOString().slice(0, 10), posted_date: '',
    salary: '', job_url: '', contact_name: '', notes: '',
  })

  const filtered = apps.filter(a =>
    (statusF === 'All' || a.status === statusF) &&
    (roleF === 'All' || a.role_type === roleF) &&
    (!search || (a.title + a.company).toLowerCase().includes(search.toLowerCase()))
  )

  async function save() {
    if (!form.title || !form.company) return
    setSaving(true)
    try {
      await db.addApplication(form); await onRefresh(); setShowForm(false); setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      setForm({ ...form, title: '', company: '', notes: '', source: '', job_url: '', salary: '', contact_name: '' })
    } finally { setSaving(false) }
  }

  const stats = {
    total: apps.length, applied: apps.filter(a => a.status === 'Applied').length,
    interviews: apps.filter(a => a.status === 'Interviewing').length,
    offers: apps.filter(a => a.status === 'Offer').length,
    rejected: apps.filter(a => a.status === 'Rejected').length,
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="section-header">My Application Tracker</h1>
          <p className="text-sm flex items-center gap-1.5" style={{ color: '#64748b' }}>
            <PulseDot color="#15803d" />
            <span>Saved to Supabase · syncs every 2 min</span>
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} />{showForm ? 'Cancel' : 'Log application'}
        </button>
      </div>

      {/* Stats */}
      <div className="tracker-stats mb-5">
        {[['Total', stats.total, '#059669', '#ecfdf5'], ['Applied', stats.applied, '#1d4ed8', '#dbeafe'],
          ['Interviews', stats.interviews, '#b45309', '#fef3c7'], ['Offers', stats.offers, '#15803d', '#dcfce7'],
          ['Rejected', stats.rejected, '#dc2626', '#fee2e2'],
        ].map(([l, v, c, bg]) => (
          <div key={l as string} className="rounded-xl p-3 text-center" style={{ background: bg as string, border: `1px solid ${(c as string)}30` }}>
            <div className="text-xl font-bold" style={{ fontFamily: 'Sora', color: c as string }}>{v as number}</div>
            <div className="text-xs mt-1 font-semibold" style={{ color: c as string }}>{l as string}</div>
          </div>
        ))}
      </div>

      {/* Success toast */}
      {saved && (
        <div className="rounded-xl p-3 mb-4 flex items-center gap-2" style={{ background: '#dcfce7', border: '1px solid #86efac' }}>
          <CheckCircle size={14} style={{ color: '#15803d' }} />
          <span className="text-sm font-semibold" style={{ color: '#15803d' }}>Application logged to Supabase!</span>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="card p-5 mb-5" style={{ background: '#faf7ff', border: '1px solid #6ee7b7' }}>
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#1e3a5f' }}>
            <Plus size={14} style={{ color: '#059669' }} /> Log New Application
          </h2>
          <div className="form-grid mb-3">
            <input className="input" placeholder="Job title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <input className="input" placeholder="Company *" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            <select className="input" value={form.role_type} onChange={e => setForm({ ...form, role_type: e.target.value })}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            <input className="input" placeholder="Source (LinkedIn, Indeed...)" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
            <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <input className="input" type="date" value={form.date_applied} onChange={e => setForm({ ...form, date_applied: e.target.value })} />
            <input className="input" placeholder="Salary e.g. EUR60–75k" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} />
            <input className="input" placeholder="Contact name" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
            <input className="input col-span-full" placeholder="Job URL" value={form.job_url} onChange={e => setForm({ ...form, job_url: e.target.value })} />
            <textarea className="input col-span-full" placeholder="Notes — interview dates, follow-ups, impressions..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={save} disabled={saving || !form.title || !form.company}>
            {saving ? <><RefreshCw size={13} className="animate-spin" />Saving...</> : <><CheckCircle size={13} />Save to database</>}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="filter-row mb-4">
        <input className="input flex-1 min-w-0" placeholder="Search applications..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input" style={{ width: 130 }} value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option>All</option>{STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="input" style={{ width: 150 }} value={roleF} onChange={e => setRoleF(e.target.value)}>
          <option>All</option>{ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: '#f0fdf4', border: '1px dashed #6ee7b7' }}>
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#ecfdf5' }}>
            <Briefcase size={24} style={{ color: '#6ee7b7' }} />
          </div>
          <p className="font-semibold" style={{ color: '#059669' }}>No applications yet</p>
          <p className="text-sm mt-1" style={{ color: '#6ee7b7' }}>Click "Log application" to start tracking</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <div key={a.id} className="card p-4">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: '#1e3a5f' }}>{a.title}</div>
                  <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                    <span style={{ color: '#059669', fontWeight: 600 }}>{a.company}</span>
                    {a.salary && <span className="badge-sal">{a.salary}</span>}
                  </div>
                  <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: '#64748b' }}>
                    {a.source && <span>{a.source}</span>}
                    <span>Applied: {a.date_applied}</span>
                  </div>
                  {a.notes && <p className="text-xs mt-1 italic" style={{ color: '#64748b' }}>{a.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                  {roleChip(a.role_type)}
                  <select value={a.status} onChange={e => { db.updateApplicationStatus(a.id, e.target.value).then(onRefresh) }}
                    className="text-xs rounded-xl px-2 py-1.5 border cursor-pointer font-semibold"
                    style={{ background: '#ffffff', borderColor: '#a7f3d0', color: '#059669', fontFamily: 'DM Sans' }}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  {a.job_url && (
                    <a href={a.job_url} target="_blank" rel="noreferrer" className="btn-ghost py-1 px-2 text-xs flex items-center gap-1">
                      <ExternalLink size={10} />Open
                    </a>
                  )}
                  <button onClick={() => db.deleteApplication(a.id).then(onRefresh)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CV EDITOR — ATS layout, drag-and-drop sections, font picker, PDF + DOCX
// ═══════════════════════════════════════════════════════════════════════════════

interface CVSection { id: string; type: string; title: string; visible: boolean; data: any }
interface CVDoc { font: string; sections: CVSection[] }

const CV_FONTS = [
  { id: 'Calibri, Arial, sans-serif',   label: 'Calibri (ATS)' },
  { id: 'Arial, sans-serif',             label: 'Arial' },
  { id: 'Georgia, serif',               label: 'Georgia' },
  { id: '"Times New Roman", serif',     label: 'Times New Roman' },
  { id: 'Garamond, Georgia, serif',     label: 'Garamond' },
]

const CV_SECTION_TYPES = [
  { type: 'summary',        label: 'Summary' },
  { type: 'experience',     label: 'Experience' },
  { type: 'projects',       label: 'Projects' },
  { type: 'education',      label: 'Education' },
  { type: 'certifications', label: 'Certifications' },
  { type: 'skills',         label: 'Skills' },
  { type: 'languages',      label: 'Languages' },
  { type: 'custom',         label: 'Custom Section' },
]

function mkid() { return Math.random().toString(36).slice(2, 8) }

const DEFAULT_CV_DOC: CVDoc = {
  font: 'Calibri, Arial, sans-serif',
  sections: [
    { id: 'hdr', type: 'header', title: 'Header', visible: true, data: {
      name: 'Devanshi Shah', location: 'Dublin, Ireland',
      email: 'devanshishah059@gmail.com', phone: '+353868182884',
      linkedin: 'in/devanshi-shah059', github: 'github.com/DEVANSHISHAH59',
    }},
    { id: 'sum', type: 'summary', title: 'SUMMARY', visible: true, data: {
      text: 'Engineering Analyst with 4+ years of experience in Trust & Safety, ML evaluation, and data-driven risk measurement. MSc in Business Analytics with hands-on experience benchmarking LLM outputs, analyzing classifier failure modes, and designing risk metrics to improve content safety systems.',
    }},
    { id: 'exp', type: 'experience', title: 'EXPERIENCE', visible: true, data: [
      { id: 'e1', title: 'Trust and Safety AI Analyst', company: 'Covalen Solutions Ltd (Meta Contract)',
        dates: 'July 2024 – Present', location: 'Dublin, Ireland',
        bullets: '• Conduct structured LLM safety evaluations across text, video, audio, and workflow-based use cases, applying benchmark metrics to assess policy violations, hallucinations, and quality regressions.\n• Built and analyzed evaluation datasets (15K+ samples) used to benchmark safety classifiers and identify emerging abuse patterns.\n• Partner with engineering and quality teams to evaluate ranking quality signals and content safety indicators.\n• Reduced annotation disagreement, improving quality acceptance rates to 95%.\n• Performed SQL-driven investigations into fraud, impersonation, and malware-related abuse patterns.\n• Serve as Primary Subject Matter Expert (PSME) and POC for the Nepal market, independently managing Trust and Safety operations.' },
      { id: 'e2', title: 'Business Analyst - Support Analytics', company: 'Sunrise Enterprises Pvt Ltd',
        dates: 'Oct 2020 – Oct 2022', location: 'Kathmandu, Nepal',
        bullets: '• Improved demand forecasting accuracy by 10% by developing SQL-based reporting models analyzing ticket volume trends.\n• Increased SLA compliance from 78% to 84% by designing monitoring frameworks.\n• Reduced backlog growth by 22% by leading workflow redesign initiatives.\n• Led requirements definition across eight release cycles, authoring business and functional specifications.' },
    ]},
    { id: 'proj', type: 'projects', title: 'PROJECTS', visible: true, data: [
      { id: 'p1', title: 'Sentinel AI Moderator – Content Safety Dashboard Prototype',
        url: 'sentinel-ai-moderator-dqtmurpww6ta8kcrgs6kat.streamlit.app',
        description: 'Built a prototype moderation analytics system that detects policy violations, assigns risk scores to user-generated content, and visualizes abuse trends for Trust & Safety workflows.' },
      { id: 'p2', title: 'AI Retail Analytics Dashboard – Customer Behavior Insights',
        url: 'ai-retail-analytics-vqppazwcawhihgyyy6dkei.streamlit.app',
        description: 'Interactive analytics dashboard using clustering and market basket analysis to uncover customer segments and product purchase patterns from retail transaction data.' },
      { id: 'p3', title: 'Churn Risk Insights Dashboard – Customer Retention Analytics',
        url: 'churn-prediction-ml-fnf2kbnuknqkeapudnjgxk.streamlit.app',
        description: 'Machine learning dashboard that predicts customer churn probability and identifies high-risk users to support targeted retention strategies.' },
    ]},
    { id: 'edu', type: 'education', title: 'EDUCATION', visible: true, data: [
      { id: 'ed1', degree: 'MSc Business Analytics', institution: 'Dublin Business School', location: 'Dublin, Ireland', dates: '' },
      { id: 'ed2', degree: 'Bachelor of Business Administration', institution: 'Tribhuvan University – Kathmandu, Nepal', location: 'Kathmandu, Nepal', dates: '' },
    ]},
    { id: 'cert', type: 'certifications', title: 'CERTIFICATIONS', visible: true, data: [
      { id: 'c1', name: 'Certified Scrum Product Owner (CSPO)', issuer: 'Scrum Alliance' },
      { id: 'c2', name: 'Product Management with Applied AI', issuer: 'IIT Roorkee via Masai' },
    ]},
    { id: 'skl', type: 'skills', title: 'SKILLS', visible: true, data: [
      { id: 'sg1', category: 'Trust & Safety & Risk Analysis', skills: 'Abuse Detection · Spam & Fraud Analysis · Policy Risk Identification · Sensitive Content Review · Risk Measurement · Content Safety Evaluation' },
      { id: 'sg2', category: 'Machine Learning & Data Analysis', skills: 'Python · SQL · Machine Learning Models · LLM Evaluation · Dataset Creation · Classifier Benchmarking · Feature Engineering' },
      { id: 'sg3', category: 'Analytics & Metrics', skills: 'Statistical Analysis · Hypothesis Testing · Data Visualization · Trend Detection · Risk Metrics Design · A/B Testing' },
      { id: 'sg4', category: 'Collaboration & Project Delivery', skills: 'Project Scoping · Cross-functional Collaboration · Stakeholder Reporting · Requirements Definition · Process Improvement' },
    ]},
    { id: 'lang', type: 'languages', title: 'LANGUAGES', visible: true, data: [
      { id: 'l1', language: 'English', level: 'Native' },
      { id: 'l2', language: 'Hindi', level: 'Bilingual' },
      { id: 'l3', language: 'Nepali', level: 'Native' },
    ]},
  ],
}

function CVPreviewATS({ doc }: { doc: CVDoc }) {
  const accent = '#1e3a5f'
  const rule = <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '3px 0 7px' }} />
  const sh = (title: string) => (
    <div>
      <div style={{ fontWeight: '700', fontSize: '10.5px', textTransform: 'uppercase' as const, letterSpacing: '1.2px', color: accent }}>{title}</div>
      {rule}
    </div>
  )
  const buls = (txt: string) => txt.split('\n').filter(Boolean).map((b, i) => (
    <div key={i} style={{ fontSize: '10.5px', marginBottom: '2px' }}>{b.startsWith('•') ? b : '• ' + b.replace(/^[-]\s*/, '')}</div>
  ))
  return (
    <div style={{ fontFamily: doc.font, color: '#1a1a1a', fontSize: '11px', lineHeight: '1.5' }}>
      {doc.sections.filter(s => s.visible).map(sec => {
        if (sec.type === 'header') {
          const d = sec.data
          return (
            <div key={sec.id} style={{ textAlign: 'center' as const, marginBottom: '12px' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: accent, marginBottom: '4px' }}>{d.name}</div>
              <div style={{ fontSize: '10px', color: '#475569', display: 'flex', flexWrap: 'wrap' as const, justifyContent: 'center', gap: '8px' }}>
                {d.location && <span>📍 {d.location}</span>}
                {d.email    && <span>✉ {d.email}</span>}
                {d.phone    && <span>📱 {d.phone}</span>}
                {d.linkedin && <span>🔗 {d.linkedin}</span>}
                {d.github   && <span>💻 {d.github}</span>}
              </div>
              <hr style={{ border: 'none', borderTop: '1.5px solid #94a3b8', margin: '8px 0 0' }} />
            </div>
          )
        }
        if (sec.type === 'summary') return (
          <div key={sec.id} style={{ marginBottom: '12px' }}>
            {sh(sec.title)}
            <p style={{ fontSize: '10.5px', color: '#334155', margin: 0 }}>{sec.data.text}</p>
          </div>
        )
        if (sec.type === 'experience') return (
          <div key={sec.id} style={{ marginBottom: '12px' }}>
            {sh(sec.title)}
            {(sec.data as any[]).map((e: any) => (
              <div key={e.id} style={{ marginBottom: '10px' }}>
                <div style={{ fontWeight: '700', fontSize: '11.5px' }}>{e.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' as const, marginBottom: '3px' }}>
                  <span style={{ fontWeight: '600', fontSize: '10.5px', color: accent }}>{e.company}</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{e.dates}{e.location ? '  ·  ' + e.location : ''}</span>
                </div>
                {buls(e.bullets)}
              </div>
            ))}
          </div>
        )
        if (sec.type === 'projects') return (
          <div key={sec.id} style={{ marginBottom: '12px' }}>
            {sh(sec.title)}
            {(sec.data as any[]).map((p: any) => (
              <div key={p.id} style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: '700', fontSize: '11.5px' }}>{p.title}</div>
                {p.url && <div style={{ fontSize: '10px', color: '#2563eb', marginBottom: '1px' }}>{p.url}</div>}
                <div style={{ fontSize: '10.5px', color: '#334155' }}>• {p.description}</div>
              </div>
            ))}
          </div>
        )
        if (sec.type === 'education') return (
          <div key={sec.id} style={{ marginBottom: '12px' }}>
            {sh(sec.title)}
            {(sec.data as any[]).map((e: any) => (
              <div key={e.id} style={{ marginBottom: '6px' }}>
                <div style={{ fontWeight: '700', fontSize: '11.5px' }}>{e.degree}</div>
                <div style={{ fontSize: '10.5px', color: '#475569' }}>{[e.institution, e.location, e.dates].filter(Boolean).join(' · ')}</div>
              </div>
            ))}
          </div>
        )
        if (sec.type === 'certifications') return (
          <div key={sec.id} style={{ marginBottom: '12px' }}>
            {sh(sec.title)}
            {(sec.data as any[]).map((c: any) => (
              <div key={c.id} style={{ marginBottom: '5px' }}>
                <div style={{ fontWeight: '700', fontSize: '11.5px' }}>{c.name}</div>
                <div style={{ fontSize: '10.5px', color: '#475569' }}>{c.issuer}</div>
              </div>
            ))}
          </div>
        )
        if (sec.type === 'skills') return (
          <div key={sec.id} style={{ marginBottom: '12px' }}>
            {sh(sec.title)}
            {(sec.data as any[]).map((g: any) => (
              <div key={g.id} style={{ marginBottom: '3px', fontSize: '10.5px' }}>
                <strong>{g.category}  </strong>{g.skills}
              </div>
            ))}
          </div>
        )
        if (sec.type === 'languages') return (
          <div key={sec.id} style={{ marginBottom: '12px' }}>
            {sh(sec.title)}
            {(sec.data as any[]).map((l: any) => (
              <div key={l.id} style={{ fontSize: '10.5px' }}>{l.language} — {l.level}</div>
            ))}
          </div>
        )
        return (
          <div key={sec.id} style={{ marginBottom: '12px' }}>
            {sh(sec.title)}
            <p style={{ fontSize: '10.5px', color: '#334155', whiteSpace: 'pre-wrap' as const, margin: 0 }}>{sec.data?.text}</p>
          </div>
        )
      })}
    </div>
  )
}

function SectionEditForm({ section, onChange }: { section: CVSection; onChange: (s: CVSection) => void }) {
  function upd(data: any) { onChange({ ...section, data }) }
  const inp = (val: string, ph: string, setter: (v: string) => void) => (
    <input className="input" placeholder={ph} value={val || ''} onChange={e => setter(e.target.value)} />
  )

  if (section.type === 'header') {
    const d = section.data
    return (
      <div className="space-y-2">
        {inp(d.name, 'Full name', v => upd({...d, name: v}))}
        {inp(d.location, 'Location', v => upd({...d, location: v}))}
        {inp(d.email, 'Email', v => upd({...d, email: v}))}
        {inp(d.phone, 'Phone', v => upd({...d, phone: v}))}
        {inp(d.linkedin, 'LinkedIn (e.g. in/yourname)', v => upd({...d, linkedin: v}))}
        {inp(d.github, 'GitHub (e.g. github.com/yourname)', v => upd({...d, github: v}))}
      </div>
    )
  }
  if (section.type === 'summary') return (
    <textarea className="input" rows={5} placeholder="Professional summary..." value={section.data.text || ''} onChange={e => upd({...section.data, text: e.target.value})} />
  )
  if (section.type === 'experience') {
    const items: any[] = section.data
    return (
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.id} className="rounded-xl p-3 space-y-2" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <div className="flex justify-between"><span className="text-xs font-bold" style={{ color: '#064e3b' }}>Position {idx+1}</span>
              <button onClick={() => upd(items.filter((_,i)=>i!==idx))} style={{ background:'none',border:'none',cursor:'pointer',color:'#be123c',fontSize:'11px' }}>Remove</button>
            </div>
            <input className="input" placeholder="Job title" value={item.title} onChange={e => upd(items.map((it,i)=>i===idx?{...it,title:e.target.value}:it))} />
            <input className="input" placeholder="Company" value={item.company} onChange={e => upd(items.map((it,i)=>i===idx?{...it,company:e.target.value}:it))} />
            <div className="flex gap-2">
              <input className="input" placeholder="Dates" value={item.dates} onChange={e => upd(items.map((it,i)=>i===idx?{...it,dates:e.target.value}:it))} />
              <input className="input" placeholder="Location" value={item.location} onChange={e => upd(items.map((it,i)=>i===idx?{...it,location:e.target.value}:it))} />
            </div>
            <textarea className="input" rows={5} placeholder="Bullets (one per line, start with •)" value={item.bullets} onChange={e => upd(items.map((it,i)=>i===idx?{...it,bullets:e.target.value}:it))} />
          </div>
        ))}
        <button className="btn-ghost w-full text-xs" onClick={() => upd([...items,{id:mkid(),title:'',company:'',dates:'',location:'',bullets:''}])}>+ Add Position</button>
      </div>
    )
  }
  if (section.type === 'projects') {
    const items: any[] = section.data
    return (
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.id} className="rounded-xl p-3 space-y-2" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <div className="flex justify-between"><span className="text-xs font-bold" style={{ color: '#1e40af' }}>Project {idx+1}</span>
              <button onClick={() => upd(items.filter((_,i)=>i!==idx))} style={{ background:'none',border:'none',cursor:'pointer',color:'#be123c',fontSize:'11px' }}>Remove</button>
            </div>
            <input className="input" placeholder="Project title" value={item.title} onChange={e => upd(items.map((it,i)=>i===idx?{...it,title:e.target.value}:it))} />
            <input className="input" placeholder="URL" value={item.url} onChange={e => upd(items.map((it,i)=>i===idx?{...it,url:e.target.value}:it))} />
            <textarea className="input" rows={3} placeholder="Description" value={item.description} onChange={e => upd(items.map((it,i)=>i===idx?{...it,description:e.target.value}:it))} />
          </div>
        ))}
        <button className="btn-ghost w-full text-xs" onClick={() => upd([...items,{id:mkid(),title:'',url:'',description:''}])}>+ Add Project</button>
      </div>
    )
  }
  if (section.type === 'education') {
    const items: any[] = section.data
    return (
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.id} className="rounded-xl p-3 space-y-2" style={{ background: '#fdf2f8', border: '1px solid #fbcfe8' }}>
            <div className="flex justify-between"><span className="text-xs font-bold" style={{ color: '#9d174d' }}>Degree {idx+1}</span>
              <button onClick={() => upd(items.filter((_,i)=>i!==idx))} style={{ background:'none',border:'none',cursor:'pointer',color:'#be123c',fontSize:'11px' }}>Remove</button>
            </div>
            <input className="input" placeholder="Degree / qualification" value={item.degree} onChange={e => upd(items.map((it,i)=>i===idx?{...it,degree:e.target.value}:it))} />
            <input className="input" placeholder="Institution" value={item.institution} onChange={e => upd(items.map((it,i)=>i===idx?{...it,institution:e.target.value}:it))} />
            <div className="flex gap-2">
              <input className="input" placeholder="Location" value={item.location} onChange={e => upd(items.map((it,i)=>i===idx?{...it,location:e.target.value}:it))} />
              <input className="input" placeholder="Dates" value={item.dates} onChange={e => upd(items.map((it,i)=>i===idx?{...it,dates:e.target.value}:it))} />
            </div>
          </div>
        ))}
        <button className="btn-ghost w-full text-xs" onClick={() => upd([...items,{id:mkid(),degree:'',institution:'',location:'',dates:''}])}>+ Add Education</button>
      </div>
    )
  }
  if (section.type === 'certifications') {
    const items: any[] = section.data
    return (
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.id} className="rounded-xl p-3 space-y-2" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <div className="flex justify-between"><span className="text-xs font-bold" style={{ color: '#92400e' }}>Cert {idx+1}</span>
              <button onClick={() => upd(items.filter((_,i)=>i!==idx))} style={{ background:'none',border:'none',cursor:'pointer',color:'#be123c',fontSize:'11px' }}>Remove</button>
            </div>
            <input className="input" placeholder="Certification name" value={item.name} onChange={e => upd(items.map((it,i)=>i===idx?{...it,name:e.target.value}:it))} />
            <input className="input" placeholder="Issuing body" value={item.issuer} onChange={e => upd(items.map((it,i)=>i===idx?{...it,issuer:e.target.value}:it))} />
          </div>
        ))}
        <button className="btn-ghost w-full text-xs" onClick={() => upd([...items,{id:mkid(),name:'',issuer:''}])}>+ Add Certification</button>
      </div>
    )
  }
  if (section.type === 'skills') {
    const items: any[] = section.data
    return (
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.id} className="rounded-xl p-3 space-y-2" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <div className="flex justify-between"><span className="text-xs font-bold" style={{ color: '#064e3b' }}>Group {idx+1}</span>
              <button onClick={() => upd(items.filter((_,i)=>i!==idx))} style={{ background:'none',border:'none',cursor:'pointer',color:'#be123c',fontSize:'11px' }}>Remove</button>
            </div>
            <input className="input" placeholder="Category (e.g. Technical Skills)" value={item.category} onChange={e => upd(items.map((it,i)=>i===idx?{...it,category:e.target.value}:it))} />
            <textarea className="input" rows={2} placeholder="Skills separated by ·" value={item.skills} onChange={e => upd(items.map((it,i)=>i===idx?{...it,skills:e.target.value}:it))} />
          </div>
        ))}
        <button className="btn-ghost w-full text-xs" onClick={() => upd([...items,{id:mkid(),category:'',skills:''}])}>+ Add Skill Group</button>
      </div>
    )
  }
  if (section.type === 'languages') {
    const items: any[] = section.data
    return (
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.id} className="flex gap-2 items-center">
            <input className="input" placeholder="Language" value={item.language} onChange={e => upd(items.map((it,i)=>i===idx?{...it,language:e.target.value}:it))} />
            <input className="input" placeholder="Level" value={item.level} onChange={e => upd(items.map((it,i)=>i===idx?{...it,level:e.target.value}:it))} />
            <button onClick={() => upd(items.filter((_,i)=>i!==idx))} style={{ background:'none',border:'none',cursor:'pointer',color:'#be123c',flexShrink:0 }}>✕</button>
          </div>
        ))}
        <button className="btn-ghost w-full text-xs" onClick={() => upd([...items,{id:mkid(),language:'',level:''}])}>+ Add Language</button>
      </div>
    )
  }
  return <textarea className="input" rows={6} placeholder="Write content here..." value={section.data?.text||''} onChange={e => upd({...section.data,text:e.target.value})} />
}

function CVEditor({ cv, onSave }: { cv: CVData | null; onSave: (cv: CVData) => void }) {
  const [doc, setDoc]                 = useState<CVDoc>(DEFAULT_CV_DOC)
  const [activeId, setActiveId]       = useState<string | null>('hdr')
  const [tab, setTab]                 = useState<'edit'|'preview'>('edit')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [downloading, setDownloading] = useState<string|null>(null)
  const [dragOverId, setDragOverId]   = useState<string|null>(null)
  const dragSrcId                     = useRef<string|null>(null)
  const previewRef                    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try { const raw = (cv as any)?._json; if (raw) setDoc(JSON.parse(raw)) } catch {}
  }, [cv])

  const updSec = (s: CVSection) => setDoc(d => ({...d, sections: d.sections.map(x => x.id===s.id ? s : x)}))
  const toggleVis = (id: string) => setDoc(d => ({...d, sections: d.sections.map(s => s.id===id ? {...s,visible:!s.visible} : s)}))
  const removeSec = (id: string) => { setDoc(d => ({...d, sections: d.sections.filter(s=>s.id!==id)})); if(activeId===id) setActiveId(null) }
  const renameSec = (id: string, title: string) => setDoc(d => ({...d, sections: d.sections.map(s => s.id===id ? {...s,title} : s)}))

  function addSection(type: string) {
    const label = CV_SECTION_TYPES.find(s=>s.type===type)?.label || 'Section'
    const defaults: Record<string,any> = { summary:{text:''}, experience:[], projects:[], education:[], certifications:[], skills:[], languages:[], custom:{text:''} }
    const ns: CVSection = { id: mkid(), type, title: label.toUpperCase(), visible: true, data: defaults[type]??{text:''} }
    setDoc(d => ({...d, sections:[...d.sections, ns]}))
    setActiveId(ns.id)
  }

  function onDragStart(id: string) { dragSrcId.current = id }
  function onDragOverSec(e: React.DragEvent, id: string) { e.preventDefault(); setDragOverId(id) }
  function onDropSec(targetId: string) {
    const src = dragSrcId.current
    if (!src || src===targetId) { setDragOverId(null); return }
    setDoc(d => {
      const secs = [...d.sections]
      const si = secs.findIndex(s=>s.id===src), ti = secs.findIndex(s=>s.id===targetId)
      const [moved] = secs.splice(si,1); secs.splice(ti,0,moved)
      return {...d, sections: secs}
    })
    setDragOverId(null); dragSrcId.current = null
  }

  async function save() {
    setSaving(true)
    try {
      const expSecs = doc.sections.find(s=>s.type==='experience')?.data||[]
      const legacy: any = {
        full_name: doc.sections.find(s=>s.type==='header')?.data.name||'',
        contact_line: [doc.sections.find(s=>s.type==='header')?.data.email, doc.sections.find(s=>s.type==='header')?.data.phone].filter(Boolean).join(' | '),
        summary: doc.sections.find(s=>s.type==='summary')?.data.text||'',
        skills: doc.sections.find(s=>s.type==='skills')?.data.map((g:any)=>g.skills).join(' · ')||'',
        exp1_title: expSecs[0]?.title||'', exp1_company: expSecs[0]?.company||'', exp1_dates: expSecs[0]?.dates||'', exp1_bullets: expSecs[0]?.bullets||'',
        exp2_title: expSecs[1]?.title||'', exp2_company: expSecs[1]?.company||'', exp2_dates: expSecs[1]?.dates||'', exp2_bullets: expSecs[1]?.bullets||'',
        education: doc.sections.find(s=>s.type==='education')?.data.map((e:any)=>e.degree+' — '+e.institution).join('\n')||'',
        _json: JSON.stringify(doc),
      }
      await db.saveCV(legacy); onSave(legacy)
      setSaved(true); setTimeout(()=>setSaved(false),2000)
    } finally { setSaving(false) }
  }

  async function dlPDF() {
    setDownloading('pdf')
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')
      const el = previewRef.current; if (!el) return
      const canvas = await html2canvas(el,{scale:2.5,useCORS:true,backgroundColor:'#ffffff'})
      const pdf = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'})
      const pW=pdf.internal.pageSize.getWidth(), pH=pdf.internal.pageSize.getHeight()
      const iW=pW-16, iH=(canvas.height*iW)/canvas.width
      const name=doc.sections.find(s=>s.type==='header')?.data.name||'CV'
      if (iH <= pH-16) {
        pdf.addImage(canvas.toDataURL('image/png'),'PNG',8,8,iW,iH)
      } else {
        const rowH = (pH-16)*canvas.width/iW
        let y=0, page=0
        while (y < canvas.height) {
          const h = Math.min(rowH, canvas.height-y)
          const c2 = document.createElement('canvas'); c2.width=canvas.width; c2.height=h
          c2.getContext('2d')!.drawImage(canvas,0,-y)
          if (page>0) pdf.addPage()
          pdf.addImage(c2.toDataURL('image/png'),'PNG',8,8,iW,(h*iW)/canvas.width)
          y+=h; page++
        }
      }
      pdf.save(name.replace(/\s+/g,'_')+'_CV.pdf')
    } catch(e){console.error(e)} finally{setDownloading(null)}
  }

  async function dlDOCX() {
    setDownloading('docx')
    try {
      const { Document, Packer, Paragraph, TextRun, BorderStyle, AlignmentType } = await import('docx')
      const hdr = doc.sections.find(s=>s.type==='header')?.data||{}
      const name = hdr.name||'CV'
      const contact = [hdr.location,hdr.email,hdr.phone,hdr.linkedin,hdr.github].filter(Boolean).join('  |  ')
      const ps: any[] = [
        new Paragraph({children:[new TextRun({text:name,bold:true,size:44,color:'1e3a5f'})],alignment:AlignmentType.CENTER}),
        new Paragraph({children:[new TextRun({text:contact,size:18,color:'475569'})],alignment:AlignmentType.CENTER,spacing:{after:240}}),
      ]
      const sh = (t:string) => new Paragraph({children:[new TextRun({text:t.toUpperCase(),bold:true,size:22,color:'1e3a5f'})],border:{bottom:{style:BorderStyle.SINGLE,size:6,color:'cbd5e1',space:2}},spacing:{before:240,after:120}})
      for (const sec of doc.sections.filter(s=>s.visible&&s.type!=='header')) {
        ps.push(sh(sec.title))
        if (sec.type==='summary') ps.push(new Paragraph({text:sec.data.text,spacing:{after:120}}))
        if (sec.type==='experience') for (const e of sec.data) {
          ps.push(new Paragraph({children:[new TextRun({text:e.title,bold:true,size:24})],spacing:{after:40}}))
          ps.push(new Paragraph({children:[new TextRun({text:e.company,bold:true,size:22,color:'1e3a5f'}),new TextRun({text:'   '+e.dates+(e.location?' · '+e.location:''),size:20,color:'64748b'})],spacing:{after:60}}))
          for (const b of e.bullets.split('\n').filter(Boolean)) ps.push(new Paragraph({text:b.startsWith('•')?b:'• '+b.replace(/^-\s*/,''),spacing:{after:40}}))
          ps.push(new Paragraph({spacing:{after:80}}))
        }
        if (sec.type==='projects') for (const p of sec.data) {
          ps.push(new Paragraph({children:[new TextRun({text:p.title,bold:true,size:22})],spacing:{after:40}}))
          if (p.url) ps.push(new Paragraph({children:[new TextRun({text:p.url,size:20,color:'2563eb'})],spacing:{after:40}}))
          ps.push(new Paragraph({text:'• '+p.description,spacing:{after:80}}))
        }
        if (sec.type==='education') for (const e of sec.data) {
          ps.push(new Paragraph({children:[new TextRun({text:e.degree,bold:true,size:22})],spacing:{after:40}}))
          ps.push(new Paragraph({text:[e.institution,e.location,e.dates].filter(Boolean).join(' · '),spacing:{after:80}}))
        }
        if (sec.type==='certifications') for (const c of sec.data) {
          ps.push(new Paragraph({children:[new TextRun({text:c.name,bold:true,size:22})],spacing:{after:40}}))
          ps.push(new Paragraph({text:c.issuer,spacing:{after:80}}))
        }
        if (sec.type==='skills') for (const g of sec.data) {
          ps.push(new Paragraph({children:[new TextRun({text:g.category+'  ',bold:true,size:22}),new TextRun({text:g.skills,size:22})],spacing:{after:60}}))
        }
        if (sec.type==='languages') for (const l of sec.data) ps.push(new Paragraph({text:l.language+' — '+l.level,spacing:{after:40}}))
        if (sec.type==='custom') ps.push(new Paragraph({text:sec.data?.text||'',spacing:{after:120}}))
      }
      const blob = await Packer.toBlob(new Document({sections:[{properties:{page:{margin:{top:720,bottom:720,left:900,right:900}}},children:ps}]}))
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name.replace(/\s+/g,'_')+'_CV.docx'; a.click(); URL.revokeObjectURL(url)
    } catch(e){console.error(e)} finally{setDownloading(null)}
  }

  const activeSec = doc.sections.find(s=>s.id===activeId)

  return (
    <div className="animate-fade-in">
      {/* Top bar */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="section-header">CV Editor</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>Drag ⠿ to reorder sections · click to edit · ATS-friendly</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={save} disabled={saving} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5">
            {saved ? <><CheckCircle size={11}/>Saved!</> : saving ? <><RefreshCw size={11} className="animate-spin"/>Saving...</> : <><CheckCircle size={11}/>Save</>}
          </button>
          <button onClick={dlPDF} disabled={!!downloading} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5" style={{background:'linear-gradient(135deg,#1e40af,#3b82f6)'}}>
            {downloading==='pdf'?<RefreshCw size={11} className="animate-spin"/>:<FileText size={11}/>} PDF
          </button>
          <button onClick={dlDOCX} disabled={!!downloading} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5" style={{background:'linear-gradient(135deg,#db2777,#f472b6)'}}>
            {downloading==='docx'?<RefreshCw size={11} className="animate-spin"/>:<FileText size={11}/>} Word
          </button>
        </div>
      </div>

      {/* Font picker */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-wider flex-shrink-0" style={{color:'#064e3b'}}>Font:</span>
        {CV_FONTS.map(f => (
          <button key={f.id} onClick={()=>setDoc(d=>({...d,font:f.id}))}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
            style={{background:doc.font===f.id?'#059669':'#fff',color:doc.font===f.id?'white':'#475569',border:`1.5px solid ${doc.font===f.id?'#059669':'#d1fae5'}`,cursor:'pointer',fontFamily:f.id}}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Mobile tabs */}
      <div className="flex gap-2 mb-4 md:hidden">
        {(['edit','preview'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize"
            style={{background:tab===t?'linear-gradient(135deg,#059669,#10b981)':'#fff',color:tab===t?'white':'#059669',border:`1.5px solid ${tab===t?'transparent':'#a7f3d0'}`,cursor:'pointer'}}>
            {t}
          </button>
        ))}
      </div>

      <div className="cv-grid">
        {/* Left: section manager + editor */}
        <div className={tab==='preview'?'hidden md:block':'block'}>

          {/* Section list */}
          <div className="rounded-xl mb-3" style={{border:'1px solid #d1fae5',overflow:'hidden'}}>
            <div className="px-3 py-2" style={{background:'#ecfdf5',borderBottom:'1px solid #d1fae5'}}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{color:'#064e3b'}}>Sections — drag ⠿ to reorder</span>
            </div>
            {doc.sections.map(s=>(
              <div key={s.id} draggable
                onDragStart={()=>onDragStart(s.id)}
                onDragOver={e=>onDragOverSec(e,s.id)}
                onDrop={()=>onDropSec(s.id)}
                onClick={()=>setActiveId(activeId===s.id?null:s.id)}
                style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 12px',cursor:'pointer',background:activeId===s.id?'#ecfdf5':dragOverId===s.id?'#f0fdf4':'#fff',borderBottom:'1px solid #f1f5f9',transition:'background 0.15s'}}>
                <span style={{color:'#9ca3af',cursor:'grab',fontSize:'15px',userSelect:'none'}}>⠿</span>
                <span className="flex-1 text-xs font-semibold" style={{color:s.visible?'#1e3a5f':'#9ca3af'}}>{s.title}</span>
                <button onClick={e=>{e.stopPropagation();const t=window.prompt('Rename section:',s.title);if(t)renameSec(s.id,t)}}
                  style={{background:'none',border:'none',cursor:'pointer',fontSize:'12px',color:'#94a3b8',padding:'0 2px'}} title="Rename">✏️</button>
                <button onClick={e=>{e.stopPropagation();toggleVis(s.id)}}
                  style={{background:'none',border:'none',cursor:'pointer',fontSize:'13px',color:s.visible?'#059669':'#9ca3af'}} title={s.visible?'Hide':'Show'}>
                  {s.visible?'👁':'🙈'}
                </button>
                {s.type!=='header'&&(
                  <button onClick={e=>{e.stopPropagation();if(window.confirm('Remove "'+s.title+'"?'))removeSec(s.id)}}
                    style={{background:'none',border:'none',cursor:'pointer',fontSize:'12px',color:'#fca5a5'}} title="Remove">✕</button>
                )}
              </div>
            ))}
          </div>

          {/* Add section */}
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{color:'#064e3b'}}>Add section</p>
            <div className="flex flex-wrap gap-1.5">
              {CV_SECTION_TYPES.map(t=>(
                <button key={t.type} onClick={()=>addSection(t.type)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium"
                  style={{background:'#fff',color:'#059669',border:'1.5px solid #a7f3d0',cursor:'pointer'}}>
                  + {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active section editor */}
          {activeSec && (
            <div className="rounded-xl" style={{border:'1.5px solid #059669',overflow:'hidden'}}>
              <div className="px-3 py-2 flex items-center justify-between" style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Editing: {activeSec.title}</span>
                <button onClick={()=>setActiveId(null)} style={{background:'none',border:'none',color:'white',cursor:'pointer',fontSize:'15px'}}>✕</button>
              </div>
              <div className="p-3 space-y-2">
                {activeSec.type!=='header'&&(
                  <input className="input" placeholder="Section heading" value={activeSec.title}
                    onChange={e=>renameSec(activeSec.id,e.target.value)} />
                )}
                <SectionEditForm section={activeSec} onChange={updSec} />
              </div>
            </div>
          )}
        </div>

        {/* Right: live preview */}
        <div className={tab==='edit'?'hidden md:block':'block'}>
          <div ref={previewRef} id="cv-print-target" className="rounded-2xl p-8"
            style={{background:'white',border:'1px solid #e2e8f0',minHeight:'600px',boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
            <CVPreviewATS doc={doc} />
          </div>
          <p className="text-xs mt-2 text-center" style={{color:'#94a3b8'}}>ATS-friendly layout · updates live as you type</p>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERVIEW PREP
// ═══════════════════════════════════════════════════════════════════════════════
function InterviewPrep() {
  const [tab, setTab] = useState(0)
  const companies = ['OpenAI', 'TikTok', 'Google', 'Meta', 'General T&S']
  const qa: [string, string][][] = [
    [
      ['Tell me about yourself', '3+ years Trust & Safety at Meta via Covalen. Sole market owner across 4 markets. LLM evaluation, abuse detection, content policy. MSc Business Analytics. CSPO. Now seeking a permanent senior T&S role at an AI-first company like OpenAI.'],
      ['Why OpenAI?', 'Your T&S team is building safety infrastructure for the most consequential AI of our time. My LLM evaluation and content policy background maps directly — I understand both how models fail AND how to scale enforcement operationally.'],
      ['Describe a complex T&S case you owned', 'Use the coordinated account network investigation: SQL analysis to identify signal, cross-team escalation, policy recommendation, enforcement action, and measurable outcome.'],
      ['What do you know about DSA and EU AI Act?', 'DSA requires transparency reports, risk assessments for VLOPs, regulator responsiveness. EU AI Act classifies AI by risk — GPAIs like ChatGPT fall under Article 51 with specific obligations.'],
    ],
    [
      ['Why TikTok?', 'TikTok has one of the most complex T&S environments globally. Short-form video at scale, multilingual markets, live content. My EMEA market ownership and LLM evaluation experience is directly applicable.'],
      ['How do you analyse safety data at scale?', 'SQL for pattern detection, Python/Pandas for trend analysis, BI dashboards for reporting. At Meta I built dashboards tracking policy enforcement metrics across 4 markets.'],
      ['Tell me about a policy you helped improve', 'Data-driven gap identification → proposed policy change → cross-functional review → A/B test → rollout. Always anchor on measurable outcome.'],
    ],
    [
      ['Tell me about yourself — data analyst framing', 'I have spent 3 years using SQL and Python to identify coordinated account networks, abuse patterns, and policy violations at Meta. My work sits at the intersection of data analysis and integrity operations.'],
      ['Walk me through a SQL analysis', 'Coordinated account detection: GROUP BY device fingerprint, COUNT of accounts, suspicious temporal clustering. Found networks of fake accounts. Escalated to policy team with full evidence package.'],
      ['How do you measure T&S impact?', 'Leading: detection rate, false positive rate, escalation latency. Lagging: repeat violation rate, user harm reports. Built dashboards tracking all across 4 markets.'],
    ],
    [
      ['You worked for Meta before — what would you do differently?', 'Focus more on proactive rather than reactive enforcement. Better tooling for market owners. Invest in cross-market knowledge sharing.'],
      ['How do you prioritise across multiple markets?', 'Risk-based scoring: severity × volume × regulatory exposure. Used a triage matrix to allocate effort across 4 markets efficiently.'],
    ],
    [
      ['Why are you leaving / what happened?', 'My contract with Covalen concluded as Meta consolidated its vendor operations. I am now actively pursuing permanent senior roles in T&S and AI analysis.'],
      ['Biggest strength?', 'Combining technical data skills with operational T&S judgment. I can write the SQL query AND translate findings into a policy recommendation AND present to stakeholders.'],
      ['Where in 3 years?', 'Senior T&S Analyst or AI Policy Manager at a major platform, owning a product area end-to-end and contributing to AI governance frameworks.'],
    ],
  ]
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="animate-fade-in">
      <h1 className="section-header">Interview Prep</h1>
      <p className="text-sm mb-4" style={{ color: '#64748b' }}>STAR answers tailored to your background. Tap each question.</p>
      <div className="flex gap-2 mb-4 flex-wrap">
        {companies.map((c, i) => (
          <button key={c} onClick={() => { setTab(i); setOpen(null) }}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: tab === i ? 'linear-gradient(135deg,#059669,#10b981)' : '#ffffff', color: tab === i ? 'white' : '#059669', border: `1px solid ${tab === i ? 'transparent' : '#a7f3d0'}`, cursor: 'pointer', boxShadow: tab === i ? '0 3px 10px rgba(5,150,105,0.25)' : 'none' }}>
            {c}
          </button>
        ))}
      </div>
      <div className="space-y-2 mb-6">
        {qa[tab].map(([q, a], i) => (
          <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <button className="w-full text-left px-4 py-4 flex items-center justify-between gap-3"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setOpen(open === i ? null : i)}>
              <span className="text-sm font-semibold" style={{ color: '#1e3a5f' }}>? {q}</span>
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#f0fdf4' }}>
                <span style={{ color: '#059669', fontSize: '14px', lineHeight: 1 }}>{open === i ? '−' : '+'}</span>
              </div>
            </button>
            {open === i && (
              <div className="px-4 pb-4" style={{ borderTop: '1px solid #ecfdf5', background: '#faf7ff' }}>
                <p className="text-sm leading-relaxed mt-3" style={{ color: '#1e3a5f' }}>{a}</p>
                <textarea className="input mt-3 text-xs" placeholder="Your notes..." rows={2} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="rounded-xl p-4 mb-4" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
        <div className="text-xs font-bold mb-1 uppercase tracking-wider" style={{ color: '#15803d' }}>STAR reminder</div>
        <p className="text-sm" style={{ color: '#166534' }}>Situation → Task → Action → Result. Always end with a measurable outcome.</p>
      </div>
      <div className="card p-4">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#1e3a5f' }}>
          <Star size={13} style={{ color: '#f59e0b' }} /> Your unique selling points
        </h2>
        {['Rare combo: LLM evaluation + T&S operations + data analysis — very few have all three',
          'EMEA market ownership: autonomous policy decisions across 4 markets',
          'EU AI Act awareness: directly relevant for OpenAI, Google, TikTok Dublin RIGHT NOW',
          'MSc Business Analytics: signals data fluency beyond operations',
          'CSPO certified: product thinking on top of analyst skills',
          'Immediately available: top of recruiter shortlists',
        ].map((p, i) => (
          <div key={i} className="flex items-start gap-2 mb-2">
            <CheckCircle size={13} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
            <span className="text-sm" style={{ color: '#1e3a5f' }}>{p}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4-WEEK PLAN
// ═══════════════════════════════════════════════════════════════════════════════
function WeeklyPlan() {
  const weeks = [
    { title: 'Daily — do these every single day', color: '#059669', bg: '#ecfdf5', tasks: [
      { t: 'Check LinkedIn jobs — T&S + AI Analyst + Dublin — filter past 24h', url: 'https://www.linkedin.com/jobs/search/?keywords=trust+safety+analyst&location=Dublin&f_TPR=r86400' },
      { t: 'Check Indeed Ireland — analyst + Dublin — sorted by date', url: 'https://ie.indeed.com/jobs?q=trust+safety+analyst+OR+AI+analyst+OR+business+analyst&l=Dublin&fromage=1&sort=date' },
      { t: 'Read Silicon Republic — 5 minutes of Irish tech news', url: 'https://www.siliconrepublic.com' },
      { t: 'Send at least 2 applications', url: null },
      { t: 'Follow up any outstanding applications over 5 days old', url: null },
    ]},
    { title: 'Week 1 — Foundation', color: '#1d4ed8', bg: '#dbeafe', tasks: [
      { t: 'Update LinkedIn headline: Trust & Safety AI Analyst | LLM Evaluation | Immediately Available | Dublin', url: null },
      { t: 'Set LinkedIn to Open to Work (visible to recruiters only)', url: null },
      { t: 'Register with CPL Recruitment — send CV', url: 'https://www.cpl.com/jobs' },
      { t: 'Register with Morgan McKinley — send CV', url: 'https://www.morganmckinley.com/ie/jobs' },
      { t: 'Register with Sigmar Recruitment — send CV', url: 'https://www.sigmarrecruitment.com/' },
      { t: 'Register with Mason Alexander — send CV', url: 'https://www.masonalexander.ie/jobs' },
      { t: 'Apply to OpenAI Trust & Safety Operations Analyst — TOP PRIORITY', url: 'https://openai.com/careers/trust-and-safety-operations-analyst-2/' },
      { t: 'Apply to TikTok Reporting & Insights Analyst — Youth Safety', url: 'https://careers.tiktok.com/position?location=CT_211&query=analyst' },
      { t: 'Apply to Meta GRO Intelligence Analyst', url: 'https://www.metacareers.com/jobs?offices=Dublin&q=trust+integrity' },
      { t: 'Set up daily job alerts on LinkedIn, Indeed, IrishJobs', url: null },
    ]},
    { title: 'Week 2 — Expand', color: '#0369a1', bg: '#e0f2fe', tasks: [
      { t: 'Register with Hays, Archer Recruitment, Solas IT and IT Search', url: null },
      { t: 'Apply to Google Engineering Analyst — AI Safety', url: 'https://careers.google.com/jobs/results/99432678838674118-engineering-analyst/' },
      { t: 'Apply to Accenture Trust & Safety Team Lead', url: 'https://www.accenture.com/ie-en/careers/jobsearch?jk=trust+safety&cl=Dublin' },
      { t: 'Apply to EY Business Analyst — Financial Services', url: 'https://www.ey.com/en_ie/careers' },
      { t: 'Apply to Deloitte Technology Business Analyst', url: 'https://apply.deloitte.com/careers/SearchJobs/analyst?3_56_3=5440' },
      { t: 'Apply to AI Governance Analyst — Irish Life', url: 'https://www.irishjobs.ie/Jobs/analyst/in-Dublin' },
      { t: 'Connect with 5 hiring managers on LinkedIn — T&S and AI teams', url: null },
      { t: 'Follow up all Week 1 applications that have not replied', url: null },
      { t: 'Create Wellfound profile and set job preferences', url: 'https://wellfound.com/jobs?location=dublin' },
    ]},
    { title: 'Week 3 — Go deeper', color: '#b45309', bg: '#fef3c7', tasks: [
      { t: 'Apply to Whatnot Senior Manager — Trust & Safety', url: 'https://www.whatnot.com/careers' },
      { t: 'Apply to LILT Product Owner — Localization AI', url: 'https://lilt.com/careers' },
      { t: 'Apply to Intercom Data Analyst', url: 'https://www.intercom.com/careers' },
      { t: 'Apply to Salesforce Policy Operations Analyst — Slack', url: 'https://careers.salesforce.com/en/jobs/?search=analyst&location=Dublin' },
      { t: 'Apply to Bank of Ireland Product Owner — Digital Banking', url: 'https://careers.bankofireland.com' },
      { t: 'Follow up ALL Weeks 1 & 2 applications — brief check-in email', url: null },
      { t: 'Research EU AI Act — prepare 3 talking points for interviews', url: 'https://artificialintelligenceact.eu/' },
      { t: 'Do 2 mock STAR interviews — record yourself on phone', url: null },
    ]},
    { title: 'Week 4 — Close and convert', color: '#be185d', bg: '#fce7f3', tasks: [
      { t: 'Follow up every single application from Weeks 1–3', url: null },
      { t: 'Ask every agency: do you have anything new this week?', url: null },
      { t: 'Apply to 10 new roles from Built In Dublin', url: 'https://builtindublin.ie/jobs' },
      { t: 'Apply via new roles posted on Silicon Republic Jobs', url: 'https://www.siliconrepublic.com/jobs' },
      { t: 'Post on LinkedIn about your job search — your network can help', url: null },
      { t: 'Ask former colleagues for LinkedIn recommendations', url: null },
      { t: 'Prepare 2–3 references ready to share immediately if asked', url: null },
    ]},
  ]
  const [checked, setChecked] = useState<Set<string>>(new Set())
  function toggle(key: string) { const n = new Set(checked); n.has(key) ? n.delete(key) : n.add(key); setChecked(n) }
  const totalTasks = weeks.reduce((s, w) => s + w.tasks.length, 0)
  const doneTasks  = checked.size
  const pct = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0

  return (
    <div className="animate-fade-in">
      <h1 className="section-header">4-Week Job Search Plan</h1>
      <p className="text-sm mb-4" style={{ color: '#64748b' }}>Follow this plan to maximise your chances of getting hired within a month.</p>
      <div className="rounded-xl p-4 mb-5" style={{ background: '#f0fdf4', border: '1px solid #6ee7b7' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold" style={{ color: '#064e3b' }}>Overall progress</span>
          <span className="text-sm font-bold" style={{ color: '#059669' }}>{doneTasks}/{totalTasks} tasks · {pct}%</span>
        </div>
        <div className="w-full h-3 rounded-full" style={{ background: '#d1fae5' }}>
          <div className="h-3 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#059669,#ec4899)' }} />
        </div>
      </div>
      <div className="rounded-xl p-4 mb-5" style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
        <p className="text-sm italic" style={{ color: '#78350f', lineHeight: '1.6' }}>
          The candidates who get hired fastest are not the ones with the best CV — they are the ones who are most systematic, most persistent, and most visible. This plan makes you that person.
        </p>
      </div>
      <div className="space-y-4">
        {weeks.map((w, wi) => {
          const doneCount = w.tasks.filter((_, i) => checked.has(`${wi}-${i}`)).length
          return (
            <div key={wi} className="card p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: w.color }} />
                <h2 className="text-sm font-bold" style={{ color: '#1e3a5f' }}>{w.title}</h2>
                <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: w.bg, color: w.color }}>{doneCount}/{w.tasks.length}</span>
              </div>
              <div className="w-full h-1.5 rounded-full mb-3" style={{ background: '#f1f5f9' }}>
                <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: `${w.tasks.length ? doneCount / w.tasks.length * 100 : 0}%`, background: w.color }} />
              </div>
              <div className="space-y-2">
                {w.tasks.map((task, ti) => {
                  const key = `${wi}-${ti}`; const done = checked.has(key)
                  return (
                    <div key={ti} className="flex items-start gap-3">
                      <input type="checkbox" checked={done} onChange={() => toggle(key)} style={{ accentColor: w.color, marginTop: 3, flexShrink: 0 }} />
                      <div className="flex-1 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm" style={{ color: done ? '#9ca3af' : '#1e3a5f', textDecoration: done ? 'line-through' : 'none' }}>{task.t}</span>
                        {task.url && (
                          <a href={task.url} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 font-semibold flex-shrink-0" style={{ color: w.color, textDecoration: 'none' }}>
                            <ExternalLink size={10} />Go
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="rounded-xl p-4 mt-4" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
        <div className="text-xs font-bold mb-1 uppercase tracking-wider" style={{ color: '#15803d' }}>The numbers game</div>
        <p className="text-sm" style={{ color: '#166534', lineHeight: '1.6' }}>
          In Dublin tech: 40 applications → 8 recruiter calls → 4 first interviews → 2 second interviews → 1 offer. You can hit those numbers. Keep going, Devanshi.
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALARY GUIDE
// ═══════════════════════════════════════════════════════════════════════════════
function SalaryGuide() {
  const rows = [
    ['Trust & Safety Analyst', 'Mid', 'EUR45–60k', 'TikTok, Meta, Accenture'],
    ['Trust & Safety Analyst', 'Senior', 'EUR60–80k', 'OpenAI, Meta, Google'],
    ['Trust & Safety Manager', 'Senior', 'EUR75–100k', 'OpenAI, TikTok, Google'],
    ['AI Analyst / LLM Evaluator', 'Mid', 'EUR50–70k', 'Google, Scale AI, Anthropic'],
    ['AI Analyst / LLM Evaluator', 'Senior', 'EUR65–90k', 'Google, OpenAI, Anthropic'],
    ['AI Governance Analyst', 'Mid', 'EUR55–75k', 'Irish Life, AIB, Big Tech'],
    ['Data Analyst', 'Mid', 'EUR45–60k', 'Stripe, HubSpot, Meta'],
    ['Data Analyst', 'Senior', 'EUR60–80k', 'Google, Stripe, TikTok'],
    ['Business Analyst', 'Mid', 'EUR45–65k', 'EY, Deloitte, Accenture'],
    ['Business Analyst', 'Senior', 'EUR60–80k', 'Big Tech, Consulting firms'],
    ['Product Owner', 'Mid', 'EUR55–75k', 'Bank of Ireland, HubSpot'],
    ['Product Owner', 'Senior', 'EUR70–95k', 'Anthropic, Big Tech, Fintech'],
    ['Policy Analyst', 'Mid', 'EUR50–70k', 'TikTok, Meta, Google'],
    ['Risk & Compliance Analyst', 'Mid', 'EUR50–70k', 'Revolut, AIB, JP Morgan'],
  ]

  return (
    <div className="animate-fade-in">
      <h1 className="section-header">Dublin Salary Guide 2026</h1>
      <p className="text-sm mb-4" style={{ color: '#64748b' }}>Salary ranges for your target roles in Dublin.</p>
      <div className="rounded-xl p-4 mb-5" style={{ background: 'linear-gradient(135deg,#f0fdf4,#fce7f3)', border: '1px solid #6ee7b7' }}>
        <div className="text-xs font-bold mb-1 uppercase tracking-wider" style={{ color: '#065f46' }}>Devanshi's target range</div>
        <p className="text-sm" style={{ color: '#064e3b' }}>Based on your 3+ years T&S experience, MSc and CSPO cert — target <strong style={{ color: '#059669' }}>EUR55,000–EUR80,000</strong>. Do not undersell yourself.</p>
      </div>
      <div className="rounded-2xl overflow-hidden mb-5" style={{ border: '1px solid #d1fae5', boxShadow: '0 2px 12px rgba(5,150,105,0.06)' }}>
        <div className="salary-table-wrap">
          <table className="w-full text-sm" style={{ minWidth: 500 }}>
            <thead>
              <tr style={{ background: '#f0fdf4' }}>
                {['Role', 'Level', 'Salary', 'Example Companies'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#059669' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : '#faf7ff', borderTop: '1px solid #d1fae5' }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: '#1e3a5f' }}>{row[0]}</td>
                  <td className="px-4 py-3"><span className={`chip ${row[1] === 'Senior' ? 'chip-ts' : 'chip-da'}`}>{row[1]}</span></td>
                  <td className="px-4 py-3 font-bold" style={{ color: '#059669' }}>{row[2]}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#64748b' }}>{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card p-4">
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#1e3a5f' }}>
          <Target size={13} style={{ color: '#059669' }} /> Negotiation tips
        </h2>
        {['Always negotiate. 85% of employers expect it. First offer is rarely the best offer.',
          'Anchor high. If they ask your expectation, say EUR5–10k above your minimum.',
          'Ask about the full package: pension (5–10%), health insurance, bonus (5–15%), training budget, hybrid.',
          'Your LLM evaluation background commands a premium right now due to EU AI Act demand. Use it.',
          'Use competing offers or agency interest as leverage — even a conversation with CPL counts.',
        ].map((t, i) => (
          <div key={i} className="flex items-start gap-2 mb-2">
            <CheckCircle size={13} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
            <span className="text-sm" style={{ color: '#1e3a5f' }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
