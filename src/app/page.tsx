'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase, db, Application, CVData } from '@/lib/supabase'
import { JOBS, COMPANIES, PORTALS, AGENCIES, QUOTES, TIPS, SV_NEWS } from '@/lib/data'
import {
  LayoutDashboard, Briefcase, Newspaper, Building2, Globe, Users,
  ClipboardList, FileText, Brain, TrendingUp, Calendar, ChevronRight,
  ExternalLink, Plus, Trash2, RefreshCw, Star, Search, Filter,
  CheckCircle, Clock, XCircle, AlertCircle, Award, Target, Zap
} from 'lucide-react'

// -- helpers ------------------------------------------------------------------
const ROLE_COLORS: Record<string, string> = {
  'Trust & Safety':'chip-ts','AI Analyst':'chip-ai',
  'Data Analyst':'chip-da','Product Owner':'chip-po','Business Analyst':'chip-ba',
}
const STATUS_COLORS: Record<string, string> = {
  Saved:'chip-saved',Applied:'chip-applied',Interviewing:'chip-interviewing',
  Offer:'chip-offer',Rejected:'chip-rejected',Ghosted:'chip-ghosted',
}
const STATUS_ICONS: Record<string, React.ReactNode> = {
  Saved:<Clock size={12}/>, Applied:<CheckCircle size={12}/>, Interviewing:<Star size={12}/>,
  Offer:<Award size={12}/>, Rejected:<XCircle size={12}/>, Ghosted:<AlertCircle size={12}/>,
}
const CAT_COLORS: Record<string, string> = {
  'Big Tech':'#4c1d95','AI':'#1e3a5f','Fintech':'#064e3b','SaaS':'#78350f',
  'Security':'#7f1d1d','Platforms':'#1f2937','Consulting':'#374151',
  'Finance':'#1e3a5f','Startup':'#713f12',
}

function roleChip(role: string) {
  return <span className={`chip ${ROLE_COLORS[role]||'chip-saved'}`}>{role}</span>
}
function statusChip(status: string) {
  return (
    <span className={`chip ${STATUS_COLORS[status]||'chip-saved'} flex items-center gap-1`}>
      {STATUS_ICONS[status]}{status}
    </span>
  )
}
function ageBadge(age: number) {
  if (age <= 7)  return <span className="badge-hot ml-1">HOT</span>
  if (age <= 14) return <span className="badge-new ml-1">NEW</span>
  return null
}

// -- Sidebar nav items ---------------------------------------------------------
const NAV = [
  { id:'dashboard',  label:'Dashboard',          icon:<LayoutDashboard size={16}/> },
  { id:'jobs',       label:'Live Jobs',           icon:<Briefcase size={16}/> },
  { id:'silicon',    label:'Silicon Republic',    icon:<Newspaper size={16}/> },
  { id:'svnews',     label:'SV & AI News',        icon:<TrendingUp size={16}/> },
  { id:'companies',  label:'All Companies',       icon:<Building2 size={16}/> },
  { id:'portals',    label:'Job Portals',         icon:<Globe size={16}/> },
  { id:'agencies',   label:'Agencies',            icon:<Users size={16}/> },
  { id:'tracker',    label:'My Tracker',          icon:<ClipboardList size={16}/> },
  { id:'cv',         label:'CV Editor',           icon:<FileText size={16}/> },
  { id:'interview',  label:'Interview Prep',      icon:<Brain size={16}/> },
  { id:'plan',       label:'4-Week Plan',         icon:<Calendar size={16}/> },
  { id:'salary',     label:'Salary Guide',        icon:<Target size={16}/> },
]

const STATUSES = ['Saved','Applied','Interviewing','Offer','Rejected','Ghosted']
const ROLES    = ['Trust & Safety','AI Analyst','Data Analyst','Product Owner','Business Analyst']

// ============================================================================
export default function App() {
  const [page, setPage]           = useState('dashboard')
  const [apps, setApps]           = useState<Application[]>([])
  const [cv, setCV]               = useState<CVData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [quote]                   = useState(() => QUOTES[Math.floor(Math.random()*QUOTES.length)])
  const [tip]                     = useState(() => TIPS[Math.floor(Math.random()*TIPS.length)])
  const [sidebarOpen, setSidebar] = useState(true)

  // load data
  useEffect(() => {
    Promise.all([
      db.getApplications().then(setApps).catch(() => {}),
      db.getCV().then(setCV).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const refreshApps = useCallback(() => db.getApplications().then(setApps).catch(()=>{}), [])

  const stats = {
    total:      apps.length,
    applied:    apps.filter(a=>a.status==='Applied').length,
    interviews: apps.filter(a=>a.status==='Interviewing').length,
    offers:     apps.filter(a=>a.status==='Offer').length,
    rate:       apps.length ? Math.round(apps.filter(a=>['Interviewing','Offer'].includes(a.status)).length/apps.length*100) : 0,
  }

  return (
    <div className="flex min-h-screen" style={{background:'#0F0A1E'}}>

      {/* SIDEBAR */}
      <aside className={`flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}
        style={{background:'linear-gradient(180deg,#1a0533 0%,#0f0a1e 100%)',borderRight:'1px solid #2d1063',position:'sticky',top:0,height:'100vh',overflowY:'auto'}}>

        <div className="p-4">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{background:'linear-gradient(135deg,#534AB7,#7c3aed)',color:'white'}}>LGH</div>
            {sidebarOpen && (
              <div>
                <div className="font-semibold text-sm" style={{fontFamily:'Sora,sans-serif',color:'#e8d5ff'}}>Let's Get Hired</div>
                <div className="text-xs" style={{color:'#7c3aed'}}>Devanshi . Dublin</div>
              </div>
            )}
            <button onClick={()=>setSidebar(!sidebarOpen)} className="ml-auto text-xs" style={{color:'#4c1d95',background:'none',border:'none',cursor:'pointer'}}>
              {sidebarOpen ? '<' : '>'}
            </button>
          </div>

          {/* Quote */}
          {sidebarOpen && (
            <div className="mb-4 p-3 rounded-xl text-xs italic leading-relaxed" style={{background:'#2d1063',borderLeft:'3px solid #a78bfa',color:'#ddd6fe'}}>
              "{quote.text}"<div className="mt-1 not-italic" style={{color:'#7c3aed'}}>- {quote.author}</div>
            </div>
          )}

          {/* Stats */}
          {sidebarOpen && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[['Tracked',stats.total],['Applied',stats.applied],['Interviews',stats.interviews],['Offers',stats.offers]].map(([l,v])=>(
                <div key={l} className="p-2 rounded-lg text-center" style={{background:'#1a0533',border:'1px solid #2d1063'}}>
                  <div className="text-lg font-semibold" style={{fontFamily:'Sora',color:'#a78bfa'}}>{v}</div>
                  <div className="text-xs" style={{color:'#7c3aed'}}>{l}</div>
                </div>
              ))}
            </div>
          )}

          {/* Nav */}
          <nav className="space-y-1">
            {NAV.map(n => (
              <button key={n.id} onClick={()=>setPage(n.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all"
                style={{
                  background: page===n.id ? 'linear-gradient(135deg,#534AB7,#4c1d95)' : 'transparent',
                  color: page===n.id ? 'white' : '#c4b5fd',
                  border: 'none', cursor: 'pointer', fontFamily:'DM Sans',
                  textAlign: 'left',
                }}>
                <span className="flex-shrink-0">{n.icon}</span>
                {sidebarOpen && <span>{n.label}</span>}
                {sidebarOpen && page===n.id && <ChevronRight size={12} className="ml-auto"/>}
              </button>
            ))}
          </nav>

          {/* Quick links */}
          {sidebarOpen && (
            <div className="mt-6">
              <div className="text-xs font-semibold mb-2 px-1" style={{color:'#4c1d95',textTransform:'uppercase',letterSpacing:'0.5px'}}>Quick links</div>
              {[
                ['Silicon Republic','https://www.siliconrepublic.com'],
                ['LinkedIn Jobs','https://www.linkedin.com/jobs/search/?keywords=trust+safety+analyst&location=Dublin'],
                ['Indeed Ireland','https://ie.indeed.com/jobs?q=analyst&l=Dublin&fromage=1'],
                ['IrishJobs.ie','https://www.irishjobs.ie'],
                ['Otta Dublin','https://otta.com/jobs/search?location=Dublin'],
                ['CPL Recruitment','https://www.cpl.com/jobs'],
              ].map(([l,u])=>(
                <a key={l} href={u} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-purple-900/30 transition-colors"
                  style={{color:'#9ca3af',textDecoration:'none'}}>
                  <ExternalLink size={10}/>{l}
                </a>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-auto p-6" style={{minWidth:0}}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw size={32} className="mx-auto mb-3 animate-spin" style={{color:'#534AB7'}}/>
              <p style={{color:'#a78bfa'}}>Loading your job hunt HQ...</p>
            </div>
          </div>
        ) : (
          <>
            {page==='dashboard'  && <Dashboard stats={stats} apps={apps} tip={tip}/>}
            {page==='jobs'       && <LiveJobs apps={apps} onTrack={refreshApps}/>}
            {page==='silicon'    && <SiliconRepublic/>}
            {page==='svnews'     && <SVNews/>}
            {page==='companies'  && <Companies/>}
            {page==='portals'    && <Portals/>}
            {page==='agencies'   && <Agencies/>}
            {page==='tracker'    && <Tracker apps={apps} onRefresh={refreshApps}/>}
            {page==='cv'         && <CVEditor cv={cv} onSave={setCV}/>}
            {page==='interview'  && <InterviewPrep/>}
            {page==='plan'       && <WeeklyPlan/>}
            {page==='salary'     && <SalaryGuide/>}
          </>
        )}
      </main>
    </div>
  )
}

// ============================================================================
// DASHBOARD
// ============================================================================
function Dashboard({ stats, apps, tip }: { stats: any, apps: Application[], tip: string }) {
  const hotJobs = JOBS.filter(j => j.age <= 7).slice(0, 6)
  const recent  = [...apps].sort((a,b) => b.created_at?.localeCompare(a.created_at||'')||0).slice(0,5)

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="rounded-2xl p-6 mb-6 relative overflow-hidden"
        style={{background:'linear-gradient(135deg,#4c1d95 0%,#534AB7 50%,#7c3aed 100%)'}}>
        <h1 className="text-2xl font-bold text-white mb-1" style={{fontFamily:'Sora'}}>Let's Get Hired  </h1>
        <p className="text-sm opacity-80 text-white">Dublin job hunt command centre . Trust & Safety . AI Analyst . Data Analyst . Product Owner . Business Analyst</p>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10" style={{background:'white'}}/>
      </div>

      {/* Tip */}
      <div className="rounded-xl p-4 mb-6" style={{background:'#1e3a5f',border:'1px solid #1d4ed8'}}>
        <div className="text-xs font-semibold mb-1" style={{color:'#93c5fd',textTransform:'uppercase',letterSpacing:'0.5px'}}>  Tip of the day</div>
        <div className="text-sm" style={{color:'#dbeafe'}}>{tip}</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          {l:'Tracked',  v:stats.total,      color:'#a78bfa'},
          {l:'Applied',  v:stats.applied,    color:'#93c5fd'},
          {l:'Interviews',v:stats.interviews,color:'#fde68a'},
          {l:'Offers',   v:stats.offers,     color:'#6ee7b7'},
          {l:'Response', v:`${stats.rate}%`, color:'#f9a8d4'},
        ].map(s=>(
          <div key={s.l} className="rounded-xl p-4 text-center" style={{background:'#1a0533',border:'1px solid #2d1063'}}>
            <div className="text-2xl font-semibold" style={{fontFamily:'Sora',color:s.color}}>{s.v}</div>
            <div className="text-xs mt-1" style={{color:'#7c3aed'}}>{s.l}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Hot jobs */}
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{color:'#e8d5ff'}}>
            <Zap size={14} style={{color:'#fde68a'}}/>Hot jobs right now
          </h2>
          <div className="space-y-2">
            {hotJobs.map((j,i)=>(
              <div key={i} className="card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{color:'#e8d5ff'}}>{j.title}</div>
                    <div className="text-xs mt-1" style={{color:'#a78bfa'}}>{j.company} <span className="badge-sal">{j.salary}</span></div>
                    <div className="text-xs mt-1" style={{color:'#6ee7b7'}}>{j.posted}</div>
                  </div>
                  <a href={j.url} target="_blank" rel="noreferrer"
                    className="btn-ghost text-xs py-1 px-2 flex-shrink-0 flex items-center gap-1">
                    <ExternalLink size={10}/>Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links + recent */}
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{color:'#e8d5ff'}}>  Search now</h2>
          <div className="space-y-1 mb-5">
            {[
              ['LinkedIn - T&S Dublin today','https://www.linkedin.com/jobs/search/?keywords=trust+safety+analyst&location=Dublin&f_TPR=r86400'],
              ['LinkedIn - AI Analyst Dublin','https://www.linkedin.com/jobs/search/?keywords=AI+analyst+LLM&location=Dublin&f_TPR=r86400'],
              ['Indeed - Business Analyst Dublin','https://ie.indeed.com/jobs?q=business+analyst&l=Dublin&fromage=1&sort=date'],
              ['Indeed - Product Owner Dublin','https://ie.indeed.com/jobs?q=product+owner&l=Dublin&fromage=1&sort=date'],
              ['IrishJobs - Analyst roles','https://www.irishjobs.ie/Jobs/analyst/in-Dublin'],
              ['Otta - Dublin tech','https://otta.com/jobs/search?location=Dublin&keywords=analyst'],
              ['Silicon Republic Jobs','https://www.siliconrepublic.com/jobs'],
              ['CPL - Analyst Dublin','https://www.cpl.com/jobs?searchType=keyword&keyword=analyst&location=Dublin'],
            ].map(([l,u])=>(
              <a key={l} href={u} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg hover:bg-purple-900/20 transition-colors"
                style={{color:'#c4b5fd',textDecoration:'none'}}>
                <ExternalLink size={10} style={{color:'#534AB7',flexShrink:0}}/>{l}
              </a>
            ))}
          </div>

          {recent.length > 0 && (
            <>
              <h2 className="text-sm font-semibold mb-3" style={{color:'#e8d5ff'}}>  Recent applications</h2>
              <div className="space-y-2">
                {recent.map(a=>(
                  <div key={a.id} className="card p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate" style={{color:'#e8d5ff'}}>{a.title}</div>
                      <div className="text-xs" style={{color:'#7c3aed'}}>{a.company} . {a.date_applied}</div>
                    </div>
                    {statusChip(a.status)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// LIVE JOBS
// ============================================================================
function LiveJobs({ apps, onTrack }: { apps: Application[], onTrack: () => void }) {
  const [roleF, setRoleF] = useState('All')
  const [sortF, setSortF] = useState('newest')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState<string|null>(null)

  let jobs = JOBS.filter(j =>
    (roleF === 'All' || j.role === roleF) &&
    (!search || (j.title+j.company).toLowerCase().includes(search.toLowerCase()))
  )
  if (sortF === 'newest') jobs = [...jobs].sort((a,b) => a.age - b.age)
  else jobs = [...jobs].sort((a,b) => parseInt(b.salary) - parseInt(a.salary))

  const alreadyTracked = new Set(apps.map(a => a.title + a.company))

  async function trackJob(j: typeof JOBS[0]) {
    setAdding(j.title+j.company)
    try {
      await db.addApplication({
        title: j.title, company: j.company, role_type: j.role,
        source: j.source, status: 'Saved', date_applied: new Date().toISOString().slice(0,10),
        posted_date: j.posted, salary: j.salary, job_url: j.url,
        contact_name: '', notes: '',
      })
      await onTrack()
    } finally { setAdding(null) }
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-1" style={{fontFamily:'Sora',color:'#e8d5ff'}}>Live Job Listings - Dublin 2026</h1>
      <p className="text-sm mb-4" style={{color:'#7c3aed'}}>Real roles from company career pages. HOT = posted this week.</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <input className="input flex-1 min-w-48" placeholder="Search jobs or companies..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <select className="input w-48" value={roleF} onChange={e=>setRoleF(e.target.value)}>
          <option>All</option>
          {ROLES.map(r=><option key={r}>{r}</option>)}
        </select>
        <select className="input w-40" value={sortF} onChange={e=>setSortF(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="salary">Salary (high)</option>
        </select>
      </div>

      <p className="text-xs mb-3" style={{color:'#6b7280'}}>{jobs.length} roles found</p>

      <div className="space-y-3">
        {jobs.map((j,i) => {
          const tracked = alreadyTracked.has(j.title+j.company)
          return (
            <div key={i} className="card p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium" style={{color:'#e8d5ff'}}>{j.title}</span>
                    {ageBadge(j.age)}
                  </div>
                  <div className="text-xs mb-2" style={{color:'#a78bfa'}}>
                    {j.company} . Dublin . via {j.source}
                    <span className="badge-sal ml-2">{j.salary}</span>
                  </div>
                  <p className="text-xs" style={{color:'#9ca3af'}}>{j.desc}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs" style={{color:j.age<=7?'#6ee7b7':'#7c3aed'}}>{j.posted}</span>
                    {roleChip(j.role)}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a href={j.url} target="_blank" rel="noreferrer" className="btn-ghost text-xs py-1 px-3 flex items-center gap-1">
                    <ExternalLink size={11}/>Open
                  </a>
                  <button
                    className="btn-primary text-xs py-1 px-3 flex items-center gap-1"
                    onClick={() => !tracked && trackJob(j)}
                    disabled={tracked || adding === j.title+j.company}
                    style={{opacity: tracked ? 0.5 : 1}}>
                    <Plus size={11}/>{tracked ? 'Tracked' : adding === j.title+j.company ? '...' : 'Track'}
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

// ============================================================================
// SILICON REPUBLIC
// ============================================================================
function SiliconRepublic() {
  const srJobs = [
    {title:'Trust & Safety Operations Analyst - OpenAI Dublin',url:'https://openai.com/careers/trust-and-safety-operations-analyst-2/',co:'OpenAI',dt:'Active'},
    {title:'Reporting & Insights Analyst Youth Safety - TikTok Dublin',url:'https://careers.tiktok.com/position?location=CT_211',co:'TikTok',dt:'7 days ago'},
    {title:'Engineering Analyst AI Safety - Google Dublin',url:'https://careers.google.com/jobs/results/99432678838674118-engineering-analyst/',co:'Google',dt:'Feb 2026'},
    {title:'GRO Intelligence Analyst - Meta Dublin',url:'https://www.metacareers.com/jobs?offices=Dublin',co:'Meta',dt:'10 days ago'},
    {title:'Business Analyst Financial Services - EY Dublin',url:'https://www.ey.com/en_ie/careers',co:'EY',dt:'Active'},
    {title:'AI Governance Analyst - Irish Life Dublin',url:'https://www.irishjobs.ie',co:'Irish Life',dt:'6 days ago'},
    {title:'Senior Manager Trust & Safety - Whatnot Dublin',url:'https://www.whatnot.com/careers',co:'Whatnot',dt:'Active'},
    {title:'Product Owner Localization AI - LILT Dublin',url:'https://lilt.com/careers',co:'LILT',dt:'3 days ago'},
  ]
  const srNews = [
    {title:"Ireland ranked top European hub for trust & safety as Big Tech expands Dublin",url:'https://www.siliconrepublic.com/companies',dt:'This week'},
    {title:"EU AI Act enforcement begins: what it means for Dublin tech workers in 2026",url:'https://www.siliconrepublic.com/machines',dt:'This week'},
    {title:"OpenAI doubles Dublin Trust & Safety team for EMEA operations",url:'https://www.siliconrepublic.com/companies',dt:'Last week'},
    {title:"TikTok Dublin to hire 200+ across Trust & Safety and Analytics in 2026",url:'https://www.siliconrepublic.com/companies',dt:'Last week'},
    {title:"Data analyst roles surge 40% in Dublin as multinationals scale analytics",url:'https://www.siliconrepublic.com/data-science',dt:'2 weeks ago'},
  ]
  const [tab, setTab] = useState<'jobs'|'news'|'links'>('jobs')
  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-1" style={{fontFamily:'Sora',color:'#e8d5ff'}}>Silicon Republic</h1>
      <p className="text-sm mb-4" style={{color:'#7c3aed'}}>Irish tech news and Dublin jobs - your daily pulse.</p>
      <div className="flex gap-2 mb-4">
        {(['jobs','news','links'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className="px-4 py-2 rounded-xl text-sm capitalize transition-all"
            style={{background:tab===t?'#534AB7':'#1a0533',color:tab===t?'white':'#a78bfa',border:'1px solid #2d1063',cursor:'pointer',fontFamily:'DM Sans'}}>
            {t==='links'?'Direct Links':t==='jobs'?'Jobs':'Tech News'}
          </button>
        ))}
      </div>
      {tab==='jobs' && <div className="space-y-2">{srJobs.map((item,i)=>(
        <div key={i} className="card p-4">
          <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline" style={{color:'#a78bfa',textDecoration:'none'}}>{item.title}</a>
          <div className="text-xs mt-1" style={{color:'#7c3aed'}}>Silicon Republic . {item.co} . {item.dt}</div>
        </div>
      ))}</div>}
      {tab==='news' && <div className="space-y-2">{srNews.map((item,i)=>(
        <div key={i} className="card p-4">
          <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline" style={{color:'#a78bfa',textDecoration:'none'}}>{item.title}</a>
          <div className="text-xs mt-1" style={{color:'#7c3aed'}}>Silicon Republic . {item.dt}</div>
        </div>
      ))}</div>}
      {tab==='links' && <div className="grid grid-cols-2 gap-3">
        {[['AI & Machine Learning','https://www.siliconrepublic.com/machines'],['Jobs in Ireland','https://www.siliconrepublic.com/jobs'],
          ['Dublin tech companies','https://www.siliconrepublic.com/companies'],['Data & Analytics','https://www.siliconrepublic.com/data-science'],
          ['Cybersecurity','https://www.siliconrepublic.com/security'],['Newsletter signup','https://www.siliconrepublic.com/newsletter']
        ].map(([l,u])=>(
          <a key={l} href={u} target="_blank" rel="noreferrer" className="card p-3 flex items-center gap-2 text-sm" style={{color:'#a78bfa',textDecoration:'none'}}>
            <ExternalLink size={13}/>{l}
          </a>
        ))}
      </div>}
    </div>
  )
}

// ============================================================================
// SV NEWS
// ============================================================================
function SVNews() {
  const [tagF, setTagF] = useState('All')
  const tags = ['All','AI','Policy','Jobs','Funding']
  const news = SV_NEWS.filter(n => tagF==='All' || n.tag===tagF)
  const tagStyle: Record<string,string> = {
    AI:'background:#1e3a5f;color:#93c5fd',Policy:'background:#4c1d95;color:#ddd6fe',
    Jobs:'background:#064e3b;color:#6ee7b7',Funding:'background:#78350f;color:#fde68a'
  }
  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-1" style={{fontFamily:'Sora',color:'#e8d5ff'}}>Silicon Valley & Global AI News</h1>
      <p className="text-sm mb-3" style={{color:'#7c3aed'}}>Latest stories shaping your job market - April 2026.</p>
      <div className="rounded-xl p-4 mb-4" style={{background:'#1e3a5f',border:'1px solid #1d4ed8'}}>
        <div className="text-xs font-semibold mb-1" style={{color:'#93c5fd',textTransform:'uppercase'}}>* EU AI Act enforcement starts August 2, 2026 - 99 days away</div>
        <div className="text-sm" style={{color:'#dbeafe'}}>Your EU AI Act knowledge is urgently in demand right now. Companies are hiring AI governance and T&S analysts at unprecedented speed.</div>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {tags.map(t=>(
          <button key={t} onClick={()=>setTagF(t)}
            className="px-3 py-1 rounded-full text-xs transition-all"
            style={{background:tagF===t?'#534AB7':'#1a0533',color:tagF===t?'white':'#a78bfa',border:'1px solid #2d1063',cursor:'pointer',fontFamily:'DM Sans'}}>
            {t}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {news.map((item,i)=>(
          <div key={i} className="card p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline leading-snug" style={{color:'#a78bfa',textDecoration:'none'}}>{item.title}</a>
                <div className="text-xs mt-1" style={{color:'#7c3aed'}}>{item.source} . {item.date}</div>
                <div className="text-xs mt-2 italic" style={{color:'#6ee7b7'}}>Why it matters: {item.relevance}</div>
              </div>
              <span className="chip text-xs flex-shrink-0" style={{...Object.fromEntries(tagStyle[item.tag]?.split(';').map(s=>s.split(':').map(x=>x.trim())) || [])}}>{item.tag}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <h2 className="text-sm font-semibold mb-3" style={{color:'#e8d5ff'}}>Follow these sources daily</h2>
        <div className="grid grid-cols-2 gap-2">
          {[['TechCrunch AI','https://techcrunch.com/category/artificial-intelligence/'],['VentureBeat AI','https://venturebeat.com/category/ai'],
            ['Silicon Republic','https://www.siliconrepublic.com/machines'],['Wired AI','https://www.wired.com/tag/artificial-intelligence/'],
            ['MIT Tech Review','https://www.technologyreview.com/topic/artificial-intelligence/'],['EU AI Act tracker','https://artificialintelligenceact.eu/']
          ].map(([l,u])=>(
            <a key={l} href={u} target="_blank" rel="noreferrer" className="card p-3 flex items-center gap-2 text-sm" style={{color:'#a78bfa',textDecoration:'none'}}>
              <ExternalLink size={12}/>{l}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COMPANIES
// ============================================================================
function Companies() {
  const cats = ['All',...Array.from(new Set(COMPANIES.map(c=>c.cat)))]
  const [catF, setCatF] = useState('All')
  const [search, setSearch] = useState('')
  const cos = COMPANIES.filter(c => (catF==='All'||c.cat===catF) && (!search||c.name.toLowerCase().includes(search.toLowerCase())))
  const groups = cats.filter(c=>c!=='All').reduce((acc,cat)=>{
    const items = cos.filter(c=>c.cat===cat)
    if (items.length) acc[cat]=items
    return acc
  }, {} as Record<string, typeof COMPANIES>)

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-1" style={{fontFamily:'Sora',color:'#e8d5ff'}}>All Companies in Dublin</h1>
      <p className="text-sm mb-4" style={{color:'#7c3aed'}}>{COMPANIES.length} companies with Dublin offices across all sectors.</p>
      <div className="flex gap-3 mb-4 flex-wrap">
        <input className="input flex-1 min-w-48" placeholder="Search companies..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <select className="input w-44" value={catF} onChange={e=>setCatF(e.target.value)}>
          {cats.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>
      <p className="text-xs mb-4" style={{color:'#6b7280'}}>{cos.length} companies shown</p>
      {Object.entries(groups).map(([cat,items])=>(
        <div key={cat} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full" style={{background:CAT_COLORS[cat]||'#534AB7'}}/>
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{color:'#a78bfa'}}>{cat} ({items.length})</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {items.map((co,i)=>(
              <div key={i} className="card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{background:CAT_COLORS[co.cat]||'#2d1063',color:'#e9d5ff'}}>{co.abbr}</div>
                  <div className="font-medium text-sm truncate" style={{color:'#e8d5ff'}}>{co.name}</div>
                </div>
                <p className="text-xs mb-2 leading-relaxed" style={{color:'#9ca3af'}}>{co.desc}</p>
                <a href={co.url} target="_blank" rel="noreferrer"
                  className="text-xs flex items-center gap-1 hover:underline" style={{color:'#a78bfa',textDecoration:'none'}}>
                  <ExternalLink size={10}/>View jobs
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// PORTALS
// ============================================================================
function Portals() {
  const cats = ['All','Irish','Global','Startup','Niche']
  const [catF, setCatF] = useState('All')
  const [priOnly, setPriOnly] = useState(false)
  const portals = PORTALS.filter(p => (catF==='All'||p.cat===catF) && (!priOnly||p.priority))
  const groups: Record<string, typeof PORTALS> = {}
  portals.forEach(p => { if(!groups[p.cat]) groups[p.cat]=[]; groups[p.cat].push(p) })

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-1" style={{fontFamily:'Sora',color:'#e8d5ff'}}>All Job Portals</h1>
      <p className="text-sm mb-4" style={{color:'#7c3aed'}}>{PORTALS.length} portals - Irish, global, startup and niche boards.</p>
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div className="flex gap-2">
          {cats.map(c=>(
            <button key={c} onClick={()=>setCatF(c)}
              className="px-3 py-1 rounded-full text-xs transition-all"
              style={{background:catF===c?'#534AB7':'#1a0533',color:catF===c?'white':'#a78bfa',border:'1px solid #2d1063',cursor:'pointer',fontFamily:'DM Sans'}}>
              {c}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer ml-auto" style={{color:'#a78bfa'}}>
          <input type="checkbox" checked={priOnly} onChange={e=>setPriOnly(e.target.checked)} className="rounded"/>
          Priority only
        </label>
      </div>
      {Object.entries(groups).map(([cat,items])=>(
        <div key={cat} className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:'#a78bfa'}}>{cat} portals ({items.length})</h2>
          <div className="grid grid-cols-3 gap-2">
            {items.map((p,i)=>(
              <div key={i} className="card p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{color:'#e8d5ff'}}>{p.name}</span>
                  {p.priority && <span className="badge-pri">PRIORITY</span>}
                </div>
                <p className="text-xs mb-2" style={{color:'#9ca3af'}}>{p.desc}</p>
                <a href={p.url} target="_blank" rel="noreferrer"
                  className="text-xs flex items-center gap-1 hover:underline" style={{color:'#a78bfa',textDecoration:'none'}}>
                  <ExternalLink size={10}/>Search jobs
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// AGENCIES
// ============================================================================
function Agencies() {
  const tiers = ['All','Priority','Good','Also']
  const [tierF, setTierF] = useState('All')
  const agencies = AGENCIES.filter(a => tierF==='All'||a.tier===tierF)
  const groups: Record<string, typeof AGENCIES> = {}
  agencies.forEach(a => { if(!groups[a.tier]) groups[a.tier]=[]; groups[a.tier].push(a) })
  const tierOrder = ['Priority','Good','Also']
  const tierLabels: Record<string,string> = {Priority:'Priority - Register this week',Good:'Good - Worth registering',Also:'Also in Dublin'}

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-1" style={{fontFamily:'Sora',color:'#e8d5ff'}}>Recruitment Agencies</h1>
      <p className="text-sm mb-3" style={{color:'#7c3aed'}}>{AGENCIES.length} agencies - 80% of Dublin tech roles go through agencies first!</p>
      <div className="rounded-xl p-4 mb-4" style={{background:'#1e3a5f',border:'1px solid #1d4ed8'}}>
        <div className="text-xs font-semibold mb-1" style={{color:'#93c5fd',textTransform:'uppercase'}}>What to say when you contact them</div>
        <p className="text-sm" style={{color:'#dbeafe',lineHeight:'1.6'}}>
          "Hi, I am a Trust & Safety AI Analyst with 3+ years experience at Meta, including LLM evaluation, abuse detection and content policy.
          I hold an MSc in Business Analytics from Dublin Business School and am CSPO certified.
          I am immediately available for permanent roles in Dublin as a T&S Analyst, AI Analyst, Data Analyst, Business Analyst or Product Owner.
          Salary expectation: EUR55-80k. Can we schedule a call?"
        </p>
      </div>
      <div className="flex gap-2 mb-4">
        {tiers.map(t=>(
          <button key={t} onClick={()=>setTierF(t)}
            className="px-3 py-1 rounded-full text-xs transition-all"
            style={{background:tierF===t?'#534AB7':'#1a0533',color:tierF===t?'white':'#a78bfa',border:'1px solid #2d1063',cursor:'pointer',fontFamily:'DM Sans'}}>
            {t}
          </button>
        ))}
      </div>
      {tierOrder.filter(t=>groups[t]).map(tier=>(
        <div key={tier} className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:'#a78bfa'}}>{tierLabels[tier]} ({groups[tier].length})</h2>
          <div className="space-y-2">
            {groups[tier].map((a,i)=>(
              <div key={i} className="card p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium" style={{color:'#e8d5ff'}}>{a.name}</span>
                    {a.tier==='Priority' && <span className="badge-pri">PRIORITY</span>}
                  </div>
                  <p className="text-xs" style={{color:'#9ca3af'}}>{a.desc}</p>
                  <p className="text-xs mt-1" style={{color:'#7c3aed'}}>Best for: {a.roles}</p>
                </div>
                <a href={a.url} target="_blank" rel="noreferrer" className="btn-ghost text-xs py-1 px-3 flex items-center gap-1 flex-shrink-0">
                  <ExternalLink size={10}/>View jobs
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// TRACKER
// ============================================================================
function Tracker({ apps, onRefresh }: { apps: Application[], onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [statusF, setStatusF]  = useState('All')
  const [roleF, setRoleF]      = useState('All')
  const [search, setSearch]    = useState('')
  const [saving, setSaving]    = useState(false)
  const [form, setForm]        = useState({
    title:'', company:'', role_type:'Trust & Safety', source:'', status:'Saved',
    date_applied: new Date().toISOString().slice(0,10), posted_date:'',
    salary:'', job_url:'', contact_name:'', notes:'',
  })

  const filtered = apps.filter(a =>
    (statusF==='All'||a.status===statusF) &&
    (roleF==='All'||a.role_type===roleF) &&
    (!search||(a.title+a.company).toLowerCase().includes(search.toLowerCase()))
  )

  async function save() {
    if (!form.title || !form.company) return
    setSaving(true)
    try { await db.addApplication(form); await onRefresh(); setShowForm(false); setForm({...form,title:'',company:'',notes:'',source:''}) }
    finally { setSaving(false) }
  }

  async function del(id: string) {
    await db.deleteApplication(id); await onRefresh()
  }

  async function changeStatus(id: string, status: string) {
    await db.updateApplicationStatus(id, status); await onRefresh()
  }

  const stats = {
    total: apps.length, applied: apps.filter(a=>a.status==='Applied').length,
    interviews: apps.filter(a=>a.status==='Interviewing').length,
    offers: apps.filter(a=>a.status==='Offer').length,
    rejected: apps.filter(a=>a.status==='Rejected').length,
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold" style={{fontFamily:'Sora',color:'#e8d5ff'}}>My Application Tracker</h1>
          <p className="text-sm" style={{color:'#7c3aed'}}>Saved to Supabase - syncs across all devices.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={()=>setShowForm(!showForm)}>
          <Plus size={14}/>{showForm?'Cancel':'Log application'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[['Total',stats.total,'#a78bfa'],['Applied',stats.applied,'#93c5fd'],['Interviews',stats.interviews,'#fde68a'],['Offers',stats.offers,'#6ee7b7'],['Rejected',stats.rejected,'#fca5a5']].map(([l,v,c])=>(
          <div key={l} className="rounded-xl p-3 text-center" style={{background:'#1a0533',border:'1px solid #2d1063'}}>
            <div className="text-xl font-semibold" style={{fontFamily:'Sora',color:c as string}}>{v}</div>
            <div className="text-xs mt-1" style={{color:'#7c3aed'}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card p-4 mb-4">
          <h2 className="text-sm font-semibold mb-3" style={{color:'#e8d5ff'}}>New application</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input className="input" placeholder="Job title *" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
            <input className="input" placeholder="Company *" value={form.company} onChange={e=>setForm({...form,company:e.target.value})}/>
            <select className="input" value={form.role_type} onChange={e=>setForm({...form,role_type:e.target.value})}>
              {ROLES.map(r=><option key={r}>{r}</option>)}
            </select>
            <input className="input" placeholder="Source (LinkedIn, Indeed...)" value={form.source} onChange={e=>setForm({...form,source:e.target.value})}/>
            <select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
            <input className="input" type="date" value={form.date_applied} onChange={e=>setForm({...form,date_applied:e.target.value})}/>
            <input className="input" placeholder="Posted date e.g. 3 days ago" value={form.posted_date} onChange={e=>setForm({...form,posted_date:e.target.value})}/>
            <input className="input" placeholder="Salary e.g. EUR60-75k" value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})}/>
            <input className="input col-span-2" placeholder="Job URL" value={form.job_url} onChange={e=>setForm({...form,job_url:e.target.value})}/>
            <input className="input" placeholder="Contact name" value={form.contact_name} onChange={e=>setForm({...form,contact_name:e.target.value})}/>
            <textarea className="input col-span-2" placeholder="Notes - interview dates, follow-ups..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2}/>
          </div>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving?'Saving...':'Save application'}</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input className="input flex-1 min-w-40" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <select className="input w-36" value={statusF} onChange={e=>setStatusF(e.target.value)}>
          <option>All</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select className="input w-40" value={roleF} onChange={e=>setRoleF(e.target.value)}>
          <option>All</option>{ROLES.map(r=><option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <Briefcase size={40} className="mx-auto mb-3 opacity-30" style={{color:'#a78bfa'}}/>
          <p style={{color:'#7c3aed'}}>No applications yet - log one above!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a=>(
            <div key={a.id} className="card p-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{color:'#e8d5ff'}}>{a.title}</div>
                  <div className="text-xs mt-0.5" style={{color:'#a78bfa'}}>
                    {a.company}
                    {a.salary && <span className="badge-sal ml-1">{a.salary}</span>}
                  </div>
                  <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap" style={{color:'#6b7280'}}>
                    <span>{a.source}</span>
                    <span>Applied: {a.date_applied}</span>
                    {a.posted_date && <span style={{color:'#7c3aed'}}>Posted: {a.posted_date}</span>}
                  </div>
                  {a.notes && <p className="text-xs mt-1 italic" style={{color:'#9ca3af'}}>{a.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                  {roleChip(a.role_type)}
                  <select value={a.status} onChange={e=>changeStatus(a.id,e.target.value)}
                    className="text-xs rounded-xl px-2 py-1 border cursor-pointer"
                    style={{background:'#1a0533',borderColor:'#2d1063',color:'#a78bfa',fontFamily:'DM Sans'}}>
                    {STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                  {a.job_url && <a href={a.job_url} target="_blank" rel="noreferrer" className="btn-ghost py-1 px-2 text-xs flex items-center gap-1"><ExternalLink size={10}/>Open</a>}
                  <button onClick={()=>del(a.id)} className="p-1 rounded-lg transition-colors hover:bg-red-900/30" style={{background:'none',border:'none',cursor:'pointer',color:'#7c3aed'}}>
                    <Trash2 size={13}/>
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

// ============================================================================
// CV EDITOR
// ============================================================================
function CVEditor({ cv, onSave }: { cv: CVData|null, onSave: (cv:CVData)=>void }) {
  const [form, setForm] = useState<CVData>(cv || {
    full_name:'Devanshi', contact_line:'Dublin, Ireland | devanshi@email.com | LinkedIn',
    summary:'Trust & Safety AI Analyst with 3+ years in LLM evaluation, content safety, abuse detection, and product policy. MSc Business Analytics (Dublin Business School). CSPO certified. Experienced sole market owner across 4 markets. Immediately available.',
    skills:'LLM Evaluation . Trust & Safety . Content Policy . SQL . Python/Pandas . Data Visualisation . Stakeholder Management . Agile/CSPO . EU AI Act . Abuse Detection',
    exp1_title:'Trust & Safety AI Analyst', exp1_company:'Meta (via Covalen Solutions)', exp1_dates:'2022 - 2025',
    exp1_bullets:'- Sole market owner for regional content safety assessments across 4 markets\n- LLM evaluation, spam, malware, and ID verification abuse detection\n- Built data visualisation dashboards for policy reporting\n- Supported international markets with policy enforcement decisions',
    exp2_title:'Business Analyst', exp2_company:'Sunrise Enterprise', exp2_dates:'2020 - 2022',
    exp2_bullets:'- HRM software implementation and requirements gathering\n- Stakeholder workshops and process documentation',
    education:'MSc Business Analytics - Dublin Business School\nCSPO Certification - Scrum Alliance\nIIT Roorkee PM Certification (in progress)',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => { if(cv) setForm(cv) }, [cv])

  async function save() {
    setSaving(true)
    try { await db.saveCV(form); onSave(form); setSaved(true); setTimeout(()=>setSaved(false),2000) }
    finally { setSaving(false) }
  }

  function f(key: keyof CVData) {
    return { value: form[key], onChange: (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setForm({...form,[key]:e.target.value}) }
  }

  function bl(t: string) {
    return t.split('\n').filter(Boolean).map((b,i) => <div key={i} style={{margin:'1px 0'}}>{b}</div>)
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-1" style={{fontFamily:'Sora',color:'#e8d5ff'}}>CV Editor</h1>
      <p className="text-sm mb-4" style={{color:'#7c3aed'}}>Edit on the left - live preview on the right.</p>
      <div className="grid grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-3">
          <input className="input" placeholder="Full name" {...f('full_name')}/>
          <input className="input" placeholder="Contact line" {...f('contact_line')}/>
          <textarea className="input" placeholder="Summary" rows={4} {...f('summary')}/>
          <textarea className="input" placeholder="Skills" rows={3} {...f('skills')}/>
          <div className="text-xs font-semibold uppercase tracking-wider px-1" style={{color:'#7c3aed'}}>Experience 1</div>
          <input className="input" placeholder="Job title" {...f('exp1_title')}/>
          <input className="input" placeholder="Company" {...f('exp1_company')}/>
          <input className="input" placeholder="Dates" {...f('exp1_dates')}/>
          <textarea className="input" placeholder="Bullets (one per line)" rows={4} {...f('exp1_bullets')}/>
          <div className="text-xs font-semibold uppercase tracking-wider px-1" style={{color:'#7c3aed'}}>Experience 2</div>
          <input className="input" placeholder="Job title" {...f('exp2_title')}/>
          <input className="input" placeholder="Company" {...f('exp2_company')}/>
          <input className="input" placeholder="Dates" {...f('exp2_dates')}/>
          <textarea className="input" placeholder="Bullets" rows={3} {...f('exp2_bullets')}/>
          <textarea className="input" placeholder="Education" rows={3} {...f('education')}/>
          <button className="btn-primary w-full flex items-center justify-center gap-2" onClick={save} disabled={saving}>
            {saved ? <><CheckCircle size={14}/>Saved!</> : saving ? 'Saving...' : 'Save CV to Supabase'}
          </button>
        </div>
        {/* Preview */}
        <div className="rounded-2xl p-6 sticky top-6" style={{background:'white',minHeight:'500px',color:'#1a1a1a',fontSize:'12px',lineHeight:'1.6'}}>
          <div style={{fontFamily:'Sora',fontSize:'20px',fontWeight:'700',color:'#1a1a1a'}}>{form.full_name}</div>
          <div style={{fontSize:'11px',color:'#555',marginBottom:'12px'}}>{form.contact_line}</div>
          {[{h:'Summary',t:form.summary},{h:'Skills',t:form.skills}].map(s=>(
            <div key={s.h}>
              <div style={{fontSize:'9px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'1.2px',color:'#534AB7',borderBottom:'1.5px solid #e9d5ff',margin:'10px 0 5px',paddingBottom:'2px'}}>{s.h}</div>
              <p style={{fontSize:'11px'}}>{s.t}</p>
            </div>
          ))}
          <div style={{fontSize:'9px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'1.2px',color:'#534AB7',borderBottom:'1.5px solid #e9d5ff',margin:'10px 0 5px',paddingBottom:'2px'}}>Experience</div>
          {[{t:form.exp1_title,c:form.exp1_company,d:form.exp1_dates,b:form.exp1_bullets},{t:form.exp2_title,c:form.exp2_company,d:form.exp2_dates,b:form.exp2_bullets}].map((e,i)=>(
            <div key={i} style={{marginBottom:'10px'}}>
              <div style={{fontWeight:'600',fontSize:'12px'}}>{e.t} - {e.c}</div>
              <div style={{fontSize:'10px',color:'#888',marginBottom:'3px'}}>{e.d}</div>
              <div style={{fontSize:'11px'}}>{bl(e.b)}</div>
            </div>
          ))}
          <div style={{fontSize:'9px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'1.2px',color:'#534AB7',borderBottom:'1.5px solid #e9d5ff',margin:'10px 0 5px',paddingBottom:'2px'}}>Education</div>
          <p style={{fontSize:'11px'}}>{form.education.split('\n').map((l,i)=><span key={i}>{l}<br/></span>)}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// INTERVIEW PREP
// ============================================================================
function InterviewPrep() {
  const [tab, setTab] = useState(0)
  const companies = ['OpenAI','TikTok','Google','Meta','General T&S']
  const qa: [string,string][][] = [
    [
      ['Tell me about yourself','3+ years Trust & Safety at Meta via Covalen. Sole market owner across 4 markets. LLM evaluation, abuse detection, content policy. MSc Business Analytics. CSPO. Now seeking a permanent senior T&S role at an AI-first company like OpenAI.'],
      ['Why OpenAI?','Your T&S team is building safety infrastructure for the most consequential AI of our time. My LLM evaluation and content policy background maps directly - I understand both how models fail AND how to scale enforcement operationally.'],
      ['Describe a complex T&S case you owned','Use the coordinated account network investigation: SQL analysis to identify signal, cross-team escalation, policy recommendation, enforcement action, and measurable outcome.'],
      ['What do you know about DSA and EU AI Act?','DSA requires transparency reports, risk assessments for VLOPs, regulator responsiveness. EU AI Act classifies AI by risk - GPAIs like ChatGPT fall under Article 51 with specific obligations.'],
    ],
    [
      ['Why TikTok?','TikTok has one of the most complex T&S environments globally. Short-form video at scale, multilingual markets, live content. My EMEA market ownership and LLM evaluation experience is directly applicable.'],
      ['How do you analyse safety data at scale?','SQL for pattern detection, Python/Pandas for trend analysis, BI dashboards for reporting. At Meta I built dashboards tracking policy enforcement metrics across 4 markets.'],
      ['Tell me about a policy you helped improve','Data-driven gap identification - proposed policy change - cross-functional review - A/B test - rollout. Always anchor on measurable outcome.'],
    ],
    [
      ['Tell me about yourself - data analyst framing','I have spent 3 years using SQL and Python to identify coordinated account networks, abuse patterns, and policy violations at Meta. My work sits at the intersection of data analysis and integrity operations.'],
      ['Walk me through a SQL analysis','Coordinated account detection: GROUP BY device fingerprint, COUNT of accounts, suspicious temporal clustering. Found networks of fake accounts. Escalated to policy team with full evidence package.'],
      ['How do you measure T&S impact?','Leading: detection rate, false positive rate, escalation latency. Lagging: repeat violation rate, user harm reports. Built dashboards tracking all across 4 markets.'],
    ],
    [
      ['You worked for Meta before - what would you do differently?','Focus more on proactive rather than reactive enforcement. Better tooling for market owners. Invest in cross-market knowledge sharing.'],
      ['How do you prioritise across multiple markets?','Risk-based scoring: severity x volume x regulatory exposure. Used a triage matrix to allocate effort across 4 markets efficiently.'],
    ],
    [
      ['Why are you leaving / what happened?','My contract with Covalen concluded as Meta consolidated its vendor operations. I am now actively pursuing permanent senior roles in T&S and AI analysis.'],
      ['Biggest strength?','Combining technical data skills with operational T&S judgment. I can write the SQL query AND translate findings into a policy recommendation AND present to stakeholders.'],
      ['Where in 3 years?','Senior T&S Analyst or AI Policy Manager at a major platform, owning a product area end-to-end and contributing to AI governance frameworks.'],
    ],
  ]
  const [open, setOpen] = useState<number|null>(null)

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-1" style={{fontFamily:'Sora',color:'#e8d5ff'}}>Interview Prep</h1>
      <p className="text-sm mb-4" style={{color:'#7c3aed'}}>STAR answers tailored to your background.</p>
      <div className="flex gap-2 mb-4 flex-wrap">
        {companies.map((c,i)=>(
          <button key={c} onClick={()=>{setTab(i);setOpen(null)}}
            className="px-4 py-2 rounded-xl text-sm transition-all"
            style={{background:tab===i?'#534AB7':'#1a0533',color:tab===i?'white':'#a78bfa',border:'1px solid #2d1063',cursor:'pointer',fontFamily:'DM Sans'}}>
            {c}
          </button>
        ))}
      </div>
      <div className="space-y-2 mb-6">
        {qa[tab].map(([q,a],i)=>(
          <div key={i} className="card">
            <button className="w-full text-left p-4 flex items-center justify-between gap-3"
              style={{background:'none',border:'none',cursor:'pointer',color:'#e8d5ff',fontFamily:'DM Sans'}}
              onClick={()=>setOpen(open===i?null:i)}>
              <span className="text-sm font-medium">? {q}</span>
              <span style={{color:'#7c3aed',flexShrink:0}}>{open===i?'^':'v'}</span>
            </button>
            {open===i && (
              <div className="px-4 pb-4">
                <p className="text-sm leading-relaxed" style={{color:'#c4b5fd'}}>{a}</p>
                <textarea className="input mt-3 text-xs" placeholder="Your notes..." rows={2}/>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="rounded-xl p-4 mb-4" style={{background:'#064e3b',border:'1px solid #065f46'}}>
        <div className="text-xs font-semibold mb-1" style={{color:'#6ee7b7',textTransform:'uppercase'}}>STAR reminder</div>
       <p className="text-sm" style={{color:'#d1fae5'}}>STAR method: Situation, Task, Action, Result. Always end with a measurable outcome.</p>
      </div>
      <div className="card p-4">
        <h2 className="text-sm font-semibold mb-3" style={{color:'#e8d5ff'}}>Your unique selling points</h2>
        {['Rare combo: LLM evaluation + T&S operations + data analysis - very few people have all three','EMEA market ownership: autonomous policy decisions for a region across 4 markets','EU AI Act awareness: directly relevant for OpenAI, Google, TikTok Dublin RIGHT NOW','MSc Business Analytics: signals data fluency beyond just operations','CSPO certified: product thinking on top of analyst skills','Immediately available: top of recruiter shortlists'].map((p,i)=>(
          <div key={i} className="flex items-start gap-2 mb-2">
            <span style={{color:'#6ee7b7',flexShrink:0}}>v</span>
            <span className="text-sm" style={{color:'#c4b5fd'}}>{p}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// WEEKLY PLAN
// ============================================================================
function WeeklyPlan() {
  const weeks = [
    {
      title:'Daily - do these every single day',
      color:'#7c3aed',
      tasks:[
        {t:'Check LinkedIn jobs - T&S + AI Analyst + Dublin - filter past 24h',url:'https://www.linkedin.com/jobs/search/?keywords=trust+safety+analyst&location=Dublin&f_TPR=r86400'},
        {t:'Check Indeed Ireland - analyst + Dublin - sorted by date',url:'https://ie.indeed.com/jobs?q=trust+safety+analyst+OR+AI+analyst+OR+business+analyst&l=Dublin&fromage=1&sort=date'},
        {t:'Read Silicon Republic - 5 minutes of Irish tech news',url:'https://www.siliconrepublic.com'},
        {t:'Send at least 2 applications',url:null},
        {t:'Follow up any outstanding applications over 5 days old',url:null},
      ]
    },
    {
      title:'Week 1 - Foundation',
      color:'#059669',
      tasks:[
        {t:'Update LinkedIn headline: Trust & Safety AI Analyst | LLM Evaluation | Immediately Available | Dublin',url:null},
        {t:'Set LinkedIn to Open to Work (visible to recruiters only)',url:null},
        {t:'Register with CPL Recruitment - send CV',url:'https://www.cpl.com/jobs'},
        {t:'Register with Morgan McKinley - send CV',url:'https://www.morganmckinley.com/ie/jobs'},
        {t:'Register with Sigmar Recruitment - send CV',url:'https://www.sigmarrecruitment.com/'},
        {t:'Register with Mason Alexander - send CV',url:'https://www.masonalexander.ie/jobs'},
        {t:'Apply to OpenAI Trust & Safety Operations Analyst - TOP PRIORITY',url:'https://openai.com/careers/trust-and-safety-operations-analyst-2/'},
        {t:'Apply to TikTok Reporting & Insights Analyst - Youth Safety',url:'https://careers.tiktok.com/position?location=CT_211&query=analyst'},
        {t:'Apply to Meta GRO Intelligence Analyst',url:'https://www.metacareers.com/jobs?offices=Dublin&q=trust+integrity'},
        {t:'Set up daily job alerts on LinkedIn, Indeed, IrishJobs',url:null},
      ]
    },
    {
      title:'Week 2 - Expand',
      color:'#0284c7',
      tasks:[
        {t:'Register with Hays, Archer Recruitment, Solas IT and IT Search',url:null},
        {t:'Apply to Google Engineering Analyst - AI Safety',url:'https://careers.google.com/jobs/results/99432678838674118-engineering-analyst/'},
        {t:'Apply to Accenture Trust & Safety Team Lead',url:'https://www.accenture.com/ie-en/careers/jobsearch?jk=trust+safety&cl=Dublin'},
        {t:'Apply to EY Business Analyst - Financial Services',url:'https://www.ey.com/en_ie/careers'},
        {t:'Apply to Deloitte Technology Business Analyst',url:'https://apply.deloitte.com/careers/SearchJobs/analyst?3_56_3=5440'},
        {t:'Apply to AI Governance Analyst - Irish Life',url:'https://www.irishjobs.ie/Jobs/analyst/in-Dublin'},
        {t:'Connect with 5 hiring managers on LinkedIn - T&S and AI teams',url:null},
        {t:'Follow up all Week 1 applications that have not replied',url:null},
        {t:'Create Wellfound profile and set job preferences',url:'https://wellfound.com/jobs?location=dublin'},
      ]
    },
    {
      title:'Week 3 - Go deeper',
      color:'#b45309',
      tasks:[
        {t:'Apply to Whatnot Senior Manager - Trust & Safety',url:'https://www.whatnot.com/careers'},
        {t:'Apply to LILT Product Owner - Localization AI',url:'https://lilt.com/careers'},
        {t:'Apply to Intercom Data Analyst',url:'https://www.intercom.com/careers'},
        {t:'Apply to Salesforce Policy Operations Analyst - Slack',url:'https://careers.salesforce.com/en/jobs/?search=analyst&location=Dublin'},
        {t:'Apply to Bank of Ireland Product Owner - Digital Banking',url:'https://careers.bankofireland.com'},
        {t:'Follow up ALL Weeks 1 & 2 applications - brief check-in email',url:null},
        {t:'Research EU AI Act - prepare 3 talking points for interviews',url:'https://artificialintelligenceact.eu/'},
        {t:'Do 2 mock STAR interviews - record yourself on phone',url:null},
      ]
    },
    {
      title:'Week 4 - Close and convert',
      color:'#be185d',
      tasks:[
        {t:'Follow up every single application from Weeks 1-3',url:null},
        {t:'Ask every agency: do you have anything new this week?',url:null},
        {t:'Apply to 10 new roles from Built In Dublin',url:'https://builtindublin.ie/jobs'},
        {t:'Apply via new roles posted on Silicon Republic Jobs',url:'https://www.siliconrepublic.com/jobs'},
        {t:'Post on LinkedIn about your job search - your network can help',url:null},
        {t:'Ask former colleagues for LinkedIn recommendations',url:null},
        {t:'Prepare 2-3 references ready to share immediately if asked',url:null},
      ]
    },
  ]

  const [checked, setChecked] = useState<Set<string>>(new Set())
  function toggle(key: string) {
    const n = new Set(checked)
    n.has(key) ? n.delete(key) : n.add(key)
    setChecked(n)
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-1" style={{fontFamily:'Sora',color:'#e8d5ff'}}>4-Week Job Search Plan</h1>
      <p className="text-sm mb-4" style={{color:'#7c3aed'}}>Follow this plan to maximise your chances of getting hired within a month.</p>
      <div className="rounded-xl p-4 mb-5" style={{background:'#2d1063',borderLeft:'4px solid #a78bfa'}}>
        <p className="text-sm italic" style={{color:'#ddd6fe',lineHeight:'1.6'}}>
          The candidates who get hired fastest are not the ones with the best CV - they are the ones who are most systematic, most persistent, and most visible. This plan makes you that person.
        </p>
      </div>
      <div className="space-y-4">
        {weeks.map((w,wi)=>(
          <div key={wi} className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full flex-shrink-0" style={{background:w.color}}/>
              <h2 className="text-sm font-semibold" style={{color:'#e8d5ff'}}>{w.title}</h2>
              <span className="text-xs ml-auto" style={{color:'#7c3aed'}}>
                {w.tasks.filter((_,i)=>checked.has(`${wi}-${i}`)).length}/{w.tasks.length} done
              </span>
            </div>
            <div className="space-y-2">
              {w.tasks.map((task,ti)=>{
                const key = `${wi}-${ti}`
                const done = checked.has(key)
                return (
                  <div key={ti} className="flex items-start gap-3">
                    <input type="checkbox" checked={done} onChange={()=>toggle(key)}
                      className="mt-0.5 flex-shrink-0" style={{accentColor:'#534AB7'}}/>
                    <div className="flex-1 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm" style={{color:done?'#6b7280':'#c4b5fd',textDecoration:done?'line-through':'none'}}>{task.t}</span>
                      {task.url && (
                        <a href={task.url} target="_blank" rel="noreferrer"
                          className="text-xs flex items-center gap-1 flex-shrink-0" style={{color:'#7c3aed',textDecoration:'none'}}>
                          <ExternalLink size={10}/>Go
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-4 mt-4" style={{background:'#064e3b',border:'1px solid #065f46'}}>
        <div className="text-xs font-semibold mb-1" style={{color:'#6ee7b7',textTransform:'uppercase'}}>The numbers game</div>
        <p className="text-sm" style={{color:'#d1fae5',lineHeight:'1.6'}}>
          In Dublin tech, a typical pipeline: 40 applications, 8 recruiter calls, 4 first interviews, 2 second interviews, 1 offer. If you follow this 4-week plan, you can hit those numbers. Keep going, Devanshi.
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// SALARY GUIDE
// ============================================================================
function SalaryGuide() {
  const rows = [
    ['Trust & Safety Analyst',        'Mid',    'EUR45-60k', 'TikTok, Meta, Accenture'],
    ['Trust & Safety Analyst',        'Senior', 'EUR60-80k', 'OpenAI, Meta, Google'],
    ['Trust & Safety Manager',        'Senior', 'EUR75-100k','OpenAI, TikTok, Google'],
    ['AI Analyst / LLM Evaluator',    'Mid',    'EUR50-70k', 'Google, Scale AI, Anthropic'],
    ['AI Analyst / LLM Evaluator',    'Senior', 'EUR65-90k', 'Google, OpenAI, Anthropic'],
    ['AI Governance Analyst',         'Mid',    'EUR55-75k', 'Irish Life, AIB, Big Tech'],
    ['Data Analyst',                  'Mid',    'EUR45-60k', 'Stripe, HubSpot, Meta'],
    ['Data Analyst',                  'Senior', 'EUR60-80k', 'Google, Stripe, TikTok'],
    ['Business Analyst',              'Mid',    'EUR45-65k', 'EY, Deloitte, Accenture'],
    ['Business Analyst',              'Senior', 'EUR60-80k', 'Big Tech, Consulting firms'],
    ['Product Owner',                 'Mid',    'EUR55-75k', 'Bank of Ireland, HubSpot'],
    ['Product Owner',                 'Senior', 'EUR70-95k', 'Anthropic, Big Tech, Fintech'],
    ['Policy Analyst',                'Mid',    'EUR50-70k', 'TikTok, Meta, Google'],
    ['Risk & Compliance Analyst',     'Mid',    'EUR50-70k', 'Revolut, AIB, JP Morgan'],
  ]

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-1" style={{fontFamily:'Sora',color:'#e8d5ff'}}>Dublin Salary Guide 2026</h1>
      <p className="text-sm mb-4" style={{color:'#7c3aed'}}>Salary ranges for your target roles in Dublin tech companies.</p>
      <div className="rounded-xl p-4 mb-5" style={{background:'#1e3a5f',border:'1px solid #1d4ed8'}}>
        <div className="text-xs font-semibold mb-1" style={{color:'#93c5fd',textTransform:'uppercase'}}>Devanshi's target range</div>
        <p className="text-sm" style={{color:'#dbeafe'}}>Based on your 3+ years T&S experience, MSc and CSPO cert, you should be targeting <strong>EUR55,000-EUR80,000</strong> depending on seniority and company size. Do not undersell yourself.</p>
      </div>
      <div className="rounded-2xl overflow-hidden mb-5" style={{border:'1px solid #2d1063'}}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{background:'#1a0533'}}>
              {['Role','Level','Salary','Example Companies'].map(h=>(
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{color:'#7c3aed'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row,i)=>(
              <tr key={i} style={{background:i%2===0?'#1a0533':'#0f0a1e',borderTop:'1px solid #2d1063'}}>
                <td className="px-4 py-3" style={{color:'#e8d5ff'}}>{row[0]}</td>
                <td className="px-4 py-3"><span className={`chip ${row[1]==='Senior'?'chip-ts':'chip-da'}`}>{row[1]}</span></td>
                <td className="px-4 py-3 font-medium" style={{color:'#6ee7b7'}}>{row[2]}</td>
                <td className="px-4 py-3 text-xs" style={{color:'#9ca3af'}}>{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="text-sm font-semibold mb-3" style={{color:'#e8d5ff'}}>Salary benchmarking resources</h2>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {[['Sigmar 2026 Salary Guide','https://www.sigmarrecruitment.com/salary-guide/'],['Hays Ireland 2026','https://www.hays.ie/salary-guide'],['Mason Alexander 2026 Tech Salary Guide','https://www.masonalexander.ie/salary-guide'],['IT Search 2026 Salary Guide','https://itsearch.ie/salary-guide/'],['Glassdoor - T&S Salaries Dublin','https://www.glassdoor.ie/Salaries/dublin-trust-and-safety-analyst-salary-SRCH_IL.0,6_IM1078_KO7,31.htm'],['LinkedIn Salary Insights','https://www.linkedin.com/salary/']].map(([l,u])=>(
          <a key={l} href={u} target="_blank" rel="noreferrer" className="card p-3 flex items-center gap-2 text-sm" style={{color:'#a78bfa',textDecoration:'none'}}>
            <ExternalLink size={12}/>{l}
          </a>
        ))}
      </div>
      <div className="card p-4">
        <h2 className="text-sm font-semibold mb-3" style={{color:'#e8d5ff'}}>Negotiation tips</h2>
        {['Always negotiate. 85% of employers expect it. First offer is rarely the best offer.','Anchor high. If they ask your expectation, say EUR5-10k above your minimum.','Ask about the full package: pension (5-10%), health insurance, bonus (5-15%), training budget, hybrid.','Your LLM evaluation background commands a premium right now due to EU AI Act demand. Use it.','Use competing offers or agency interest as leverage - even a conversation with CPL counts.'].map((t,i)=>(
          <div key={i} className="flex items-start gap-2 mb-2">
            <span style={{color:'#6ee7b7',flexShrink:0}}> </span>
            <span className="text-sm" style={{color:'#c4b5fd'}}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
