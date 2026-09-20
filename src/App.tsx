import { useEffect, useMemo, useState } from 'react'
import {
  Activity as ActivityIcon, AlertCircle, ArrowLeft, ArrowRight, BarChart3, Bell, CalendarDays, Check,
  CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Clock3, Command, Edit3, FileText,
  Filter, Home, Inbox, LayoutDashboard, ListFilter, Mail, Menu, MessageSquare, MoreHorizontal,
  Plus, RefreshCw, Search, Send, Settings as SettingsIcon, SlidersHorizontal, Sparkles, UserRound,
  Users, X, Zap,
} from 'lucide-react'
import {
  Activity, Communication, Followup, FollowupStatus, Notification, Patient, RescheduleRequest, staff, Task, TaskStatus,
} from './data'

type Route = '/overview' | '/follow-ups' | '/patients' | '/communication' | '/reschedules' | '/tasks' | '/escalations' | '/analytics' | '/settings' | '/portal'

type Toast = { id: number; message: string; tone?: 'success' | 'error' }

type AppState = {
  patients: Patient[]
  communications: Communication[]
  tasks: Task[]
  reschedules: RescheduleRequest[]
  notifications: Notification[]
  activity: Activity[]
}

const navItems: { route: Route; label: string; icon: typeof Home }[] = [
  { route: '/overview', label: 'Overview', icon: LayoutDashboard },
  { route: '/follow-ups', label: 'Follow-ups', icon: CalendarDays },
  { route: '/patients', label: 'Patients', icon: Users },
  { route: '/communication', label: 'Communication', icon: MessageSquare },
  { route: '/reschedules', label: 'Reschedule Requests', icon: RefreshCw },
  { route: '/tasks', label: 'Tasks', icon: ClipboardList },
  { route: '/analytics', label: 'Analytics', icon: BarChart3 },
]

const routeLabels: Record<Route, string> = {
  '/overview': 'Overview', '/follow-ups': 'Follow-ups', '/patients': 'Patients', '/communication': 'Communication',
  '/reschedules': 'Reschedule Requests', '/tasks': 'Tasks', '/escalations': 'Staff Action Required', '/analytics': 'Analytics',
  '/settings': 'Settings', '/portal': 'Patient Portal',
}

function routeFromPath(pathname: string): Route {
  if (pathname === '/portal') return '/portal'
  if (pathname.startsWith('/patients/')) return '/patients'
  if (pathname === '/escalations') return '/escalations'
  return (Object.keys(routeLabels).includes(pathname) ? pathname : '/overview') as Route
}

function App() {
  const [route, setRoute] = useState<Route>(routeFromPath(window.location.pathname))
  const [state, setState] = useState<AppState>({
    patients: [], communications: [], tasks: [], reschedules: [], notifications: [], activity: [],
  })
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [portalPatientId, setPortalPatientId] = useState<string | null>(null)

  useEffect(() => {
    const onPopState = () => setRoute(routeFromPath(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (nextRoute: Route) => {
    window.history.pushState({}, '', nextRoute)
    setRoute(nextRoute)
    setMobileNav(false)
    setSelectedPatientId(null)
  }

  const toast = (message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now()
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3600)
  }

  useEffect(() => {
    const handleExternalToast = (event: Event) => {
      const message = (event as CustomEvent<string>).detail
      if (message) toast(message)
    }
    window.addEventListener('careloop:toast', handleExternalToast)
    return () => window.removeEventListener('careloop:toast', handleExternalToast)
  }, [])

  const addActivity = (text: string, tone: Activity['tone'] = 'blue') => {
    setState((current) => ({ ...current, activity: [{ id: `a-${Date.now()}`, time: 'Now', text, tone }, ...current.activity].slice(0, 8) }))
  }

  const updatePatient = (patientId: string, patch: Partial<Patient>) => {
    setState((current) => ({ ...current, patients: current.patients.map((patient) => patient.id === patientId ? { ...patient, ...patch } : patient) }))
  }

  const sendReminder = (patientId: string) => {
    updatePatient(patientId, { reminder: 'Sent', response: 'Awaiting response', status: 'Reminder Pending' })
    setState((current) => ({ ...current, communications: [{ id: `c-${Date.now()}`, patientId, type: 'Follow-up reminder', created: 'Today · Now', approvedBy: 'Backend approval', sent: 'Today · Now', response: 'Awaiting', status: 'Awaiting Response' }, ...current.communications] }))
    addActivity(`${patientId} reminder sent`, 'blue')
    toast('Reminder sent successfully.')
  }

  const confirmAppointment = (patientId: string) => {
    updatePatient(patientId, { response: 'Confirmed', status: 'Confirmed' })
    setState((current) => ({ ...current, notifications: current.notifications.map((item) => item.title.includes(patientId) ? { ...item, read: true } : item) }))
    addActivity(`${patientId} confirmed`, 'green')
    toast('Appointment confirmed.')
  }

  const requestReschedule = (patientId: string, request: Omit<RescheduleRequest, 'id' | 'patientId' | 'status'>) => {
    updatePatient(patientId, { response: 'Reschedule requested', status: 'Reschedule Requested' })
    setState((current) => ({ ...current, reschedules: [{ ...request, id: `r-${Date.now()}`, patientId, status: 'Pending Review' }, ...current.reschedules] }))
    addActivity(`${patientId} requested reschedule`, 'amber')
    toast('Reschedule request sent to the care team.')
  }

  const approveReschedule = (requestId: string, date: string, time: string) => {
    const request = state.reschedules.find((item) => item.id === requestId)
    if (!request) return
    updatePatient(request.patientId, { nextFollowup: date, time, response: 'Confirmed', status: 'Confirmed' })
    setState((current) => ({ ...current, reschedules: current.reschedules.map((item) => item.id === requestId ? { ...item, status: 'Approved', requestedDate: date, requestedTime: time } : item) }))
    addActivity(`${request.patientId} appointment updated`, 'green')
    toast('Appointment updated and confirmation message ready.')
  }

  const changeTaskStatus = (taskId: string, status: TaskStatus) => {
    setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? { ...task, status } : task) }))
    toast(status === 'Completed' ? 'Task marked complete.' : 'Task status updated.')
  }

  const assignTask = (taskId: string, owner: string) => {
    setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? { ...task, owner } : task) }))
    toast('Task assigned.')
  }

  const selectedPatient = state.patients.find((item) => item.id === selectedPatientId) ?? null
  const pendingNotifications = state.notifications.filter((item) => !item.read).length

  if (route === '/portal') {
    const portalPatient = portalPatientId ? state.patients.find((item) => item.id === portalPatientId) : undefined
    return portalPatient ? <PatientPortal patient={portalPatient} patients={state.patients} onConfirm={confirmAppointment} onRequestReschedule={requestReschedule} onBack={() => navigate('/overview')} onSelectPatient={setPortalPatientId} /> : <PatientPortalEmpty onBack={() => navigate('/overview')} />
  }

  return (
    <div className="app-shell">
      <Sidebar route={route} navigate={navigate} mobileOpen={mobileNav} onClose={() => setMobileNav(false)} onSearch={() => setSearchOpen(true)} notificationCount={pendingNotifications} taskCount={state.tasks.length} />
      <div className="app-content">
        <main className="main-content">
          {route === '/overview' && <Overview state={state} onSelectPatient={setSelectedPatientId} navigate={navigate} />}
          {route === '/follow-ups' && <FollowUps state={state} onSelectPatient={setSelectedPatientId} onSendReminder={sendReminder} navigate={navigate} />}
          {route === '/patients' && <Patients state={state} onSelectPatient={setSelectedPatientId} />}
          {route === '/communication' && <CommunicationPage state={state} onSendReminder={sendReminder} onSelectPatient={setSelectedPatientId} />}
          {route === '/reschedules' && <Reschedules state={state} onApprove={approveReschedule} onSelectPatient={setSelectedPatientId} />}
          {route === '/tasks' && <TasksPage state={state} onStatusChange={changeTaskStatus} onAssign={assignTask} onSelectPatient={setSelectedPatientId} />}
          {route === '/escalations' && <Escalations state={state} onSelectPatient={setSelectedPatientId} onSendReminder={sendReminder} />}
          {route === '/analytics' && <Analytics state={state} />}
          {route === '/settings' && <Settings />}
        </main>
      </div>
      {selectedPatient && <FollowupDrawer patient={selectedPatient} communications={state.communications.filter((item) => item.patientId === selectedPatient.id)} onClose={() => setSelectedPatientId(null)} onSendReminder={sendReminder} onConfirm={confirmAppointment} navigate={navigate} />}
      {searchOpen && <GlobalSearch state={state} onClose={() => setSearchOpen(false)} onSelect={(patientId) => { setSearchOpen(false); setSelectedPatientId(patientId) }} navigate={navigate} />}
      <ToastStack toasts={toasts} />
    </div>
  )
}

function Sidebar({ route, navigate, mobileOpen, onClose, onSearch, notificationCount, taskCount }: { route: Route; navigate: (route: Route) => void; mobileOpen: boolean; onClose: () => void; onSearch: () => void; notificationCount: number; taskCount: number }) {
  return <>
    {mobileOpen && <button className="mobile-backdrop" onClick={onClose} aria-label="Close navigation" />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top">
        <div className="brand-lockup"><img src="/careloop-logo.png" alt="CareLoop" /><div><strong>CARELOOP</strong><span>FOLLOW-UP OPERATIONS</span></div></div>
        <button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={18} /></button>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map(({ route: itemRoute, label, icon: Icon }) => <button key={itemRoute} className={`nav-item ${route === itemRoute ? 'nav-active' : ''}`} onClick={() => navigate(itemRoute)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{itemRoute === '/tasks' && taskCount > 0 && <span className="nav-count">{taskCount}</span>}</button>)}
        </nav>
      </div>
      <Topbar route={route} navigate={navigate} onMenu={onClose} onSearch={onSearch} notificationCount={notificationCount} />
    </aside>
  </>
}

function Topbar({ route, navigate, onMenu, onSearch, notificationCount }: { route: Route; navigate: (route: Route) => void; onMenu: () => void; onSearch: () => void; notificationCount: number }) {
  return <header className="topbar">
    <button className="mobile-menu" onClick={onMenu} aria-label="Open navigation"><Menu size={21} /></button>
    <div className="breadcrumbs"><span>CareLoop</span><ChevronRight size={14} /><strong>{routeLabels[route]}</strong></div>
    <div className="topbar-actions">
      <button className="search-trigger" onClick={onSearch}><Search size={16} /><span>Search patients, follow-ups, tasks...</span><kbd><Command size={12} /> K</kbd></button>
      <button className="icon-button notification-button" onClick={() => navigate('/overview')} aria-label={`${notificationCount} notifications`}><Bell size={19} />{notificationCount > 0 && <span className="notification-dot">{notificationCount}</span>}</button>
      <button className="top-profile" onClick={() => navigate('/settings')}><div className="avatar avatar-blue"><UserRound size={15} /></div><span>Account</span><ChevronDown size={14} /></button>
      <button className={`icon-button corner-settings ${route === '/settings' ? 'corner-settings-active' : ''}`} onClick={() => navigate('/settings')} aria-label="Settings"><SettingsIcon size={19} /></button>
    </div>
  </header>
}

function PageHeader({ title, subtitle, action, eyebrow }: { title: string; subtitle: string; action?: React.ReactNode; eyebrow?: string }) {
  return <div className="page-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{subtitle}</p></div>{action}</div>
}

function Overview({ state, onSelectPatient, navigate }: { state: AppState; onSelectPatient: (id: string) => void; navigate: (route: Route) => void }) {
  const due = state.patients.filter((item) => item.status !== 'Completed').length
  const awaiting = state.patients.filter((item) => item.response === 'Awaiting response' || item.response === 'No response').length
  const reschedules = state.reschedules.filter((item) => item.status === 'Pending Review').length
  const staffAction = state.patients.filter((item) => item.status === 'Staff Action Required').length
  const completed = state.patients.filter((item) => item.status === 'Completed').length
  const attentionPatients = state.patients.filter((patient) => patient.status === 'Staff Action Required' || patient.response === 'No response' || patient.status === 'Reschedule Requested').slice(0, 3)
  return <>
    <PageHeader title="Good morning" subtitle="Here's what needs attention today." action={<button className="button button-primary" onClick={() => navigate('/follow-ups')}><Plus size={16} /> New Follow-up</button>} />
    <div className="kpi-grid">
      <KpiCard label="Follow-ups due today" value={due} icon={<CalendarDays size={17} />} tone="blue" trend="Awaiting backend data" />
      <KpiCard label="Awaiting response" value={awaiting} icon={<Clock3 size={17} />} tone="amber" trend="Awaiting backend data" />
      <KpiCard label="Reschedule requests" value={reschedules} icon={<RefreshCw size={17} />} tone="purple" trend="Awaiting backend data" />
      <KpiCard label="Staff action required" value={staffAction} icon={<AlertCircle size={17} />} tone="red" trend="Awaiting backend data" />
      <KpiCard label="Completed today" value={completed} icon={<CheckCircle2 size={17} />} tone="green" trend="Awaiting backend data" />
    </div>
    <div className="overview-grid">
      <section className="panel queue-panel"><PanelHeading title="Today's follow-up queue" action={<button className="text-button" onClick={() => navigate('/follow-ups')}>View all <ArrowRight size={15} /></button>} />{state.patients.length ? <QueueTable patients={state.patients.slice(0, 4)} onSelectPatient={onSelectPatient} /> : <EmptyState title="No follow-ups yet" body="Backend follow-up records will appear here when connected." />}</section>
      <section className="panel attention-panel"><PanelHeading title="Needs attention" action={<button className="icon-button small" aria-label="More attention options"><MoreHorizontal size={16} /></button>} /><div className="attention-list">{attentionPatients.length ? attentionPatients.map((patient) => <AttentionCard key={patient.id} patientId={patient.id} reason={patient.response === 'No response' ? 'No response received' : 'Follow-up needs review'} time="Backend record" owner={patient.assigned || 'Unassigned'} tone={patient.response === 'No response' ? 'red' : 'amber'} onClick={() => onSelectPatient(patient.id)} />) : <EmptyState title="Nothing needs attention" body="Backend action items will appear here." />}</div></section>
    </div>
    <div className="bottom-grid"><section className="panel activity-panel"><PanelHeading title="Recent activity" action={<button className="text-button" onClick={() => navigate('/communication')}>View communication <ArrowRight size={15} /></button>} /><ActivityTimeline items={state.activity} /></section></div>
  </>
}

function KpiCard({ label, value, icon, tone, trend }: { label: string; value: number; icon: React.ReactNode; tone: string; trend?: string }) {
  return <div className="kpi-card"><div className={`kpi-icon ${tone}`}>{icon}</div><span className="kpi-label">{label}</span><strong className="kpi-value">{value}</strong>{trend && <span className="kpi-trend muted">{trend}</span>}</div>
}
function ArrowUpRight({ size }: { size: number }) { return <ArrowRight size={size} className="arrow-up-right" /> }
function PanelHeading({ title, action }: { title: string; action?: React.ReactNode }) { return <div className="panel-heading"><h2>{title}</h2>{action}</div> }
function StatusBadge({ status }: { status: string }) { const key = status.toLowerCase(); const tone = key.includes('confirmed') || key.includes('completed') || key.includes('responded') || key.includes('sent') ? 'success' : key.includes('reschedule') || key.includes('pending') || key.includes('waiting') ? 'warning' : key.includes('action') || key.includes('escalated') || key.includes('overdue') || key.includes('no response') ? 'danger' : 'neutral'; return <span className={`status-badge ${tone}`}><span className="badge-icon">{tone === 'success' ? <Check size={12} /> : tone === 'danger' ? <AlertCircle size={12} /> : <Clock3 size={12} />}</span>{status}</span> }
function Avatar({ initials, tone = 'blue' }: { initials: string; tone?: string }) { return <span className={`avatar avatar-${tone}`}>{initials}</span> }

function QueueTable({ patients, onSelectPatient }: { patients: Patient[]; onSelectPatient: (id: string) => void }) {
  if (!patients.length) return null
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Patient</th><th>Follow-up date</th><th>Reminder</th><th>Response</th><th>Assigned to</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{patients.map((patient) => <tr key={patient.id} onClick={() => onSelectPatient(patient.id)}><td><div className="patient-cell"><Avatar initials={patient.initials} /><div><strong>{patient.id}</strong><span>{patient.name}</span></div></div></td><td><strong>{patient.nextFollowup}</strong><span className="table-sub">{patient.time}</span></td><td><span className="sent-text"><CheckCircle2 size={14} /> {patient.reminder}</span></td><td>{patient.response}</td><td><div className="assigned-cell"><Avatar initials={patient.assigned === 'Unassigned' ? '?' : patient.assigned.split(' ').map((x) => x[0]).join('')} tone="gray" />{patient.assigned}</div></td><td><StatusBadge status={patient.status} /></td><td><button className="row-action" onClick={(event) => { event.stopPropagation(); onSelectPatient(patient.id) }}>View <ChevronRight size={15} /></button></td></tr>)}</tbody></table></div>
}

function AttentionCard({ patientId, reason, time, owner, tone, onClick }: { patientId: string; reason: string; time: string; owner: string; tone: string; onClick: () => void }) { return <button className="attention-card" onClick={onClick}><div className={`attention-marker ${tone}`} /><div className="attention-copy"><strong>{patientId}</strong><span>{reason}</span><small>{time} · {owner}</small></div><ChevronRight size={16} /></button> }
function ActivityTimeline({ items }: { items: Activity[] }) { return items.length ? <div className="timeline">{items.map((item) => <div className="timeline-item" key={item.id}><div className={`timeline-marker ${item.tone}`}><span /></div><div><strong>{item.time}</strong><span>{item.text}</span></div></div>)}</div> : <EmptyState title="No recent activity" body="Backend events will appear here when activity data is connected." /> }
function Workflow() { return <div className="workflow"><div className="workflow-line" />{[['Scheduled', 'CalendarDays'], ['Reminder', 'Send'], ['Response', 'MessageSquare'], ['Action', 'Zap'], ['Completion', 'Check']].map(([label, icon], index) => <div className="workflow-step" key={label}><div className={`workflow-icon ${index === 4 ? 'complete' : ''}`}>{icon === 'CalendarDays' ? <CalendarDays size={16} /> : icon === 'Send' ? <Send size={16} /> : icon === 'MessageSquare' ? <MessageSquare size={16} /> : icon === 'Zap' ? <Zap size={16} /> : <Check size={16} />}</div><span>{label}</span></div>)}</div> }

function FollowUps({ state, onSelectPatient, onSendReminder, navigate }: { state: AppState; onSelectPatient: (id: string) => void; onSendReminder: (id: string) => void; navigate: (route: Route) => void }) {
  const [tab, setTab] = useState('All'); const [query, setQuery] = useState('')
  const filtered = state.patients.filter((patient) => (patient.id + patient.name + patient.status).toLowerCase().includes(query.toLowerCase())).filter((patient) => tab === 'All' || (tab === 'Overdue' && patient.status === 'Staff Action Required') || (tab === 'Completed' && patient.status === 'Confirmed') || (tab === 'Upcoming' && patient.status !== 'Completed') || (tab === 'Due Today' && patient.status !== 'Completed'))
  return <><PageHeader title="Follow-ups" subtitle="Manage scheduled patient follow-ups and communication." action={<button className="button button-primary" onClick={() => toastUnavailable()}><Plus size={16} /> Schedule follow-up</button>} /><div className="filter-bar"><label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient ID or name" /></label><FilterSelect label="Date range" /><FilterSelect label="Department" /><FilterSelect label="Assigned staff" /><FilterSelect label="Status" /></div><div className="tabs">{['All', 'Due Today', 'Upcoming', 'Overdue', 'Completed'].map((item) => <button className={tab === item ? 'tab-active' : ''} key={item} onClick={() => setTab(item)}>{item}<span>{item === 'All' ? state.patients.length : item === 'Completed' ? state.patients.filter((p) => p.status === 'Confirmed').length : ''}</span></button>)}</div><section className="panel page-panel"><QueueTable patients={filtered} onSelectPatient={onSelectPatient} />{filtered.length === 0 && <EmptyState title="No follow-ups found" body="Try changing your filters or search terms." action={<button className="button button-secondary" onClick={() => { setQuery(''); setTab('All') }}>Clear filters</button>} />}</section><div className="page-footnote"><span>Showing {filtered.length} of {state.patients.length} follow-ups</span><button className="text-button" onClick={() => navigate('/communication')}>Review communication <ArrowRight size={15} /></button></div></>
}
function FilterSelect({ label }: { label: string }) { return <button className="filter-select">{label}<ChevronDown size={15} /></button> }
function toastUnavailable() { window.dispatchEvent(new CustomEvent('careloop:toast', { detail: 'Backend integration is pending for new follow-ups.' })) }

function Patients({ state, onSelectPatient }: { state: AppState; onSelectPatient: (id: string) => void }) { const [query, setQuery] = useState(''); const patients = state.patients.filter((p) => `${p.id} ${p.name}`.toLowerCase().includes(query.toLowerCase())); return <><PageHeader title="Patients" subtitle="Manage administrative follow-up records."  /><section className="panel page-panel"><div className="section-toolbar"><label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient ID or name" /></label><span className="toolbar-meta">{patients.length} records</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Patient</th><th>Next follow-up</th><th>Reminder</th><th>Response</th><th>Assigned staff</th><th>Administrative status</th><th /></tr></thead><tbody>{patients.map((patient) => <tr key={patient.id} onClick={() => onSelectPatient(patient.id)}><td><div className="patient-cell"><Avatar initials={patient.initials} /><div><strong>{patient.id}</strong><span>{patient.name}</span></div></div></td><td><strong>{patient.nextFollowup}</strong><span className="table-sub">{patient.time}</span></td><td>{patient.reminder}</td><td>{patient.response}</td><td>{patient.assigned}</td><td><StatusBadge status={patient.status} /></td><td><button className="row-action">Open <ChevronRight size={15} /></button></td></tr>)}</tbody></table></div>{patients.length === 0 && <EmptyState title="No patients found" body="There are no patient records matching that search." />}</section></> }

function CommunicationPage({ state, onSendReminder, onSelectPatient }: { state: AppState; onSendReminder: (id: string) => void; onSelectPatient: (id: string) => void }) { const [tab, setTab] = useState('All'); const [draftOpen, setDraftOpen] = useState(false); const filtered = state.communications.filter((item) => tab === 'All' || item.status === tab); return <><PageHeader title="Communication" subtitle="Track approved patient follow-up communications." action={state.patients.length ? <button className="button button-primary" onClick={() => setDraftOpen(true)}><Sparkles size={16} /> Draft reminder</button> : undefined} /><div className="tabs">{['All', 'Awaiting Response', 'Sent', 'Responded', 'Escalated'].map((item) => <button className={tab === item ? 'tab-active' : ''} key={item} onClick={() => setTab(item)}>{item}</button>)}</div><div className="communication-grid">{filtered.map((item) => <CommunicationCard key={item.id} item={item} onOpen={() => onSelectPatient(item.patientId)} />)}</div>{filtered.length === 0 && <EmptyState title="No communication here" body="Approved follow-up communications will appear here." />}{draftOpen && <DraftAssistant patients={state.patients} onClose={() => setDraftOpen(false)} onSend={(patientId) => { onSendReminder(patientId); setDraftOpen(false) }} />}</> }
function CommunicationCard({ item, onOpen }: { item: Communication; onOpen: () => void }) { return <button className="communication-card" onClick={onOpen}><div className="card-topline"><span className="mini-icon blue"><Mail size={15} /></span><StatusBadge status={item.status} /></div><div className="communication-title"><strong>{item.patientId}</strong><span>{item.type}</span></div><div className="communication-details"><div><span>Created</span><strong>{item.created}</strong></div><div><span>Approved by</span><strong>{item.approvedBy}</strong></div><div><span>Sent</span><strong>{item.sent}</strong></div><div><span>Response</span><strong>{item.response}</strong></div></div><span className="card-link">View record <ArrowRight size={14} /></span></button> }
function DraftAssistant({ patients, onClose, onSend }: { patients: Patient[]; onClose: () => void; onSend: (id: string) => void }) { const [patientId, setPatientId] = useState(patients[0]?.id ?? ''); const [draft, setDraft] = useState(''); const patient = patients.find((p) => p.id === patientId) ?? patients[0]; return <div className="modal-backdrop"><div className="modal draft-modal"><div className="modal-header"><div><span className="eyebrow">ADMINISTRATIVE ASSISTANT</span><h2>Reminder draft assistant</h2><p>Create a clear reminder for staff approval.</p></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="assistant-note"><Sparkles size={16} /><span>AI-generated draft. Staff approval required.</span></div><label className="field-label">Patient record<select value={patientId} onChange={(event) => { setPatientId(event.target.value); const next = patients.find((p) => p.id === event.target.value); if (next) setDraft(`Hello, your follow-up appointment is scheduled for ${next.nextFollowup} at ${next.time}. Please confirm your appointment or request a different date.`) }}>{patients.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}</select></label><label className="field-label">Message<textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} /></label><div className="modal-footer"><button className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" onClick={() => onSend(patient.id)}><Check size={16} /> Approve & send</button></div></div></div> }

function Reschedules({ state, onApprove, onSelectPatient }: { state: AppState; onApprove: (id: string, date: string, time: string) => void; onSelectPatient: (id: string) => void }) { const [selected, setSelected] = useState<RescheduleRequest | null>(null); return <><PageHeader title="Reschedule requests" subtitle="Review and coordinate patient-requested appointment changes." action={<FilterSelect label="Pending review" />} /><div className="reschedule-grid">{state.reschedules.map((request) => <RescheduleCard key={request.id} request={request} onReview={() => setSelected(request)} onOpenPatient={() => onSelectPatient(request.patientId)} />)}</div>{state.reschedules.length === 0 && <EmptyState title="You're all caught up" body="There are no pending reschedule requests right now." />}{selected && <RescheduleModal request={selected} onClose={() => setSelected(null)} onApprove={(date, time) => { onApprove(selected.id, date, time); setSelected(null) }} />}</> }
function RescheduleCard({ request, onReview, onOpenPatient }: { request: RescheduleRequest; onReview: () => void; onOpenPatient: () => void }) { return <section className="panel reschedule-card"><div className="reschedule-card-head"><button className="patient-link" onClick={onOpenPatient}><span className="avatar avatar-amber">{request.patientId.slice(-2)}</span><strong>{request.patientId}</strong></button><StatusBadge status={request.status} /></div><div className="reschedule-compare"><div><span>Current appointment</span><strong>{request.currentDate}</strong><small>{request.currentTime}</small></div><ArrowRight size={17} /><div className="requested-date"><span>Patient requested</span><strong>{request.requestedDate}</strong><small>{request.requestedTime}</small></div></div><p className="request-message">“{request.message}”</p><div className="request-meta"><span>Received {request.received}</span><span>Backend record</span></div><div className="card-actions"><button className="button button-primary" onClick={onReview}>Review request</button><button className="button button-secondary" onClick={onOpenPatient}>Contact patient</button></div></section> }
function RescheduleModal({ request, onClose, onApprove }: { request: RescheduleRequest; onClose: () => void; onApprove: (date: string, time: string) => void }) { const [date, setDate] = useState(request.requestedDate); const [time, setTime] = useState(request.requestedTime === 'Morning' ? '10:30 AM' : '2:00 PM'); return <div className="modal-backdrop"><div className="modal"><div className="modal-header"><div><span className="eyebrow">REVIEW RESCHEDULE REQUEST</span><h2>{request.patientId}</h2><p>{request.message}</p></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="appointment-compare"><div><span>Current appointment</span><strong>{request.currentDate}</strong><b>{request.currentTime}</b></div><ChevronRight size={18} /><div className="new-appointment"><span>Requested appointment</span><strong>{request.requestedDate}</strong><b>{request.requestedTime}</b></div></div><div className="modal-form-grid"><label className="field-label">Available date<input type="text" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="field-label">Available time<select value={time} onChange={(event) => setTime(event.target.value)}><option>10:30 AM</option><option>11:15 AM</option><option>2:00 PM</option><option>3:00 PM</option></select></label></div><div className="availability"><CheckCircle2 size={16} /><span>Availability will be checked after backend connection.</span></div><div className="modal-footer"><button className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" onClick={() => onApprove(date, time)}><Check size={16} /> Confirm new appointment</button></div></div></div> }

function TasksPage({ state, onStatusChange, onAssign, onSelectPatient }: { state: AppState; onStatusChange: (id: string, status: TaskStatus) => void; onAssign: (id: string, owner: string) => void; onSelectPatient: (id: string) => void }) { const [tab, setTab] = useState('All'); const filtered = state.tasks.filter((task) => tab === 'All' || (tab === 'Completed' && task.status === 'Completed') || (tab === 'My Tasks' && task.owner !== 'Unassigned') || (tab === 'Unassigned' && task.owner === 'Unassigned') || (tab === 'Due Today' && task.due === 'Today') || (tab === 'Overdue' && task.status === 'To Do')); return <><PageHeader title="Tasks" subtitle="Coordinate administrative follow-up work across your team." action={<button className="button button-primary"><Plus size={16} /> New task</button>} /><div className="tabs">{['All', 'My Tasks', 'Unassigned', 'Due Today', 'Overdue', 'Completed'].map((item) => <button className={tab === item ? 'tab-active' : ''} key={item} onClick={() => setTab(item)}>{item}</button>)}</div><section className="panel page-panel"><div className="table-wrap"><table className="data-table task-table"><thead><tr><th>Task</th><th>Owner</th><th>Created</th><th>Due</th><th>Status</th><th>Change status</th></tr></thead><tbody>{filtered.map((task) => <tr key={task.id}><td><button className="task-name" onClick={() => onSelectPatient(task.patientId)}><span className="task-check"><Check size={12} /></span><span><strong>{task.task}</strong><small>{task.patientId}</small></span></button></td><td><select className="table-select" value={task.owner} onChange={(event) => onAssign(task.id, event.target.value)}>{['Unassigned', ...staff].map((person) => <option key={person}>{person}</option>)}</select></td><td>{task.created}</td><td>{task.due}</td><td><StatusBadge status={task.status} /></td><td><select className="table-select" value={task.status} onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}>{['To Do', 'In Progress', 'Waiting', 'Completed'].map((status) => <option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div>{filtered.length === 0 && <EmptyState title="No tasks in this view" body="There are no administrative tasks matching this filter." />}</section></> }

function Escalations({ state, onSelectPatient, onSendReminder }: { state: AppState; onSelectPatient: (id: string) => void; onSendReminder: (id: string) => void }) { const escalated = state.patients.filter((patient) => patient.status === 'Staff Action Required' || patient.response === 'No response'); return <><PageHeader title="Staff action required" subtitle="Administrative follow-ups requiring staff attention." action={<FilterSelect label="All action items" />} /><div className="tabs"><button className="tab-active">Unanswered <span>{escalated.length}</span></button><button>Overdue</button><button>Reschedule</button><button>Unassigned</button></div><section className="panel page-panel"><div className="escalation-list">{escalated.map((patient) => <div className="escalation-row" key={patient.id}><div className="escalation-icon"><AlertCircle size={18} /></div><div className="escalation-main"><div><strong>{patient.id}</strong><StatusBadge status={patient.status} /></div><p>No response after approved reminder sequence.</p><span>Backend reminder history pending · Assigned: {patient.assigned || 'Unassigned'}</span></div><div className="card-actions compact"><button className="button button-secondary" onClick={() => onSelectPatient(patient.id)}>Review</button><button className="button button-primary" onClick={() => onSendReminder(patient.id)}>Contact</button></div></div>)}</div>{escalated.length === 0 && <EmptyState title="You're all caught up" body="There are no unanswered reminders requiring action." />}</section></> }

function Analytics({ state }: { state: AppState }) {
  const scheduled = state.patients.length
  const confirmed = state.patients.filter((patient) => patient.response === 'Confirmed').length
  const awaiting = state.patients.filter((patient) => patient.response === 'Awaiting response' || patient.response === 'No response').length
  const reschedules = state.reschedules.filter((request) => request.status === 'Pending Review').length
  const confirmationRate = scheduled ? Math.round((confirmed / scheduled) * 100) : 0
  const responseRate = state.communications.length ? Math.round((state.communications.filter((item) => item.response !== 'Awaiting').length / state.communications.length) * 100) : 0
  return <>
    <PageHeader title="Follow-up operations" subtitle="Understand follow-up workload and communication performance." action={<button className="filter-select" disabled><CalendarDays size={15} /> Date range <ChevronDown size={15} /></button>} />
    <div className="analytics-kpis">
      <Metric label="Total scheduled follow-ups" value={String(scheduled)} change="Awaiting backend data" />
      <Metric label="Confirmation rate" value={`${confirmationRate}%`} change="Awaiting backend data" />
      <Metric label="Reschedule requests" value={String(reschedules)} change="Awaiting backend data" />
      <Metric label="Reminder response rate" value={`${responseRate}%`} change="Awaiting backend data" />
    </div>
    <div className="chart-grid">
      <section className="panel chart-panel"><PanelHeading title="Follow-up volume" action={<button className="icon-button small" aria-label="More volume options"><MoreHorizontal size={16} /></button>} /><BarChart hasData={scheduled > 0} /></section>
      <section className="panel chart-panel"><PanelHeading title="Follow-up status" action={<span className="chart-total">{scheduled} total</span>} /><DonutChart state={state} /></section>
      <section className="panel chart-panel wide-chart"><PanelHeading title="Response trend" action={<span className="chart-legend"><i className="legend-line" /> Responses <i className="legend-line soft" /> Follow-ups</span>} /><LineChart /></section>
      <section className="panel chart-panel"><PanelHeading title="Staff workload" /><WorkloadChart patients={state.patients} /></section>
    </div>
  </>
}
function Metric({ label, value, change }: { label: string; value: string; change: string }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong><small className="metric-pending">— {change}</small></div> }
function BarChart({ hasData }: { hasData: boolean }) { return hasData ? <div className="analytics-empty"><BarChart3 size={24} /><strong>Volume data is ready for connection</strong><span>Connect dated follow-up records to render this chart.</span></div> : <div className="analytics-empty"><BarChart3 size={24} /><strong>No volume data</strong><span>Connect follow-up records to populate this chart.</span></div> }
function DonutChart({ state }: { state: AppState }) {
  const confirmed = state.patients.filter((patient) => patient.response === 'Confirmed').length
  const awaiting = state.patients.filter((patient) => patient.response === 'Awaiting response').length
  const reschedules = state.patients.filter((patient) => patient.response === 'Reschedule requested').length
  const action = state.patients.filter((patient) => patient.response === 'No response' || patient.status === 'Staff Action Required').length
  const total = confirmed + awaiting + reschedules + action
  const confirmedEnd = total ? confirmed / total * 100 : 0
  const awaitingEnd = total ? confirmedEnd + awaiting / total * 100 : 0
  const rescheduleEnd = total ? awaitingEnd + reschedules / total * 100 : 0
  const background = total ? `conic-gradient(var(--blue) 0 ${confirmedEnd}%, #f1ad4e ${confirmedEnd}% ${awaitingEnd}%, #8b82de ${awaitingEnd}% ${rescheduleEnd}%, #ef8b86 ${rescheduleEnd}% 100%)` : '#e3ebf5'
  return <div className="donut-layout"><div className={`donut ${total === 0 ? 'donut-empty' : ''}`} style={{ background }} /><div className="donut-label"><strong>{total}</strong><span>Total</span></div><div className="legend-list"><span><i className="legend-dot blue" /> Confirmed <b>{confirmed}</b></span><span><i className="legend-dot amber" /> Awaiting <b>{awaiting}</b></span><span><i className="legend-dot purple" /> Reschedule <b>{reschedules}</b></span><span><i className="legend-dot red" /> Action <b>{action}</b></span></div></div>
}
function LineChart() { return <div className="analytics-empty trend-empty"><ActivityIcon size={24} /><strong>No response trend data</strong><span>Connect communication events to populate this chart.</span></div> }
function WorkloadChart({ patients }: { patients: Patient[] }) {
  const owners = Array.from(new Set(patients.map((patient) => patient.assigned || 'Unassigned')))
  const max = Math.max(0, ...owners.map((owner) => patients.filter((patient) => (patient.assigned || 'Unassigned') === owner).length))
  return owners.length ? <div className="workload">{owners.map((owner) => { const count = patients.filter((patient) => (patient.assigned || 'Unassigned') === owner).length; return <div key={owner}><span>{owner}</span><b style={{ width: `${max ? count / max * 100 : 0}%` }} /><em>{count}</em></div> })}</div> : <div className="analytics-empty"><Users size={24} /><strong>No workload data</strong><span>Connect assigned follow-up records to populate this chart.</span></div>
}

function Settings() { const [section, setSection] = useState('Profile'); const sections = ['Profile', 'Notifications', 'Reminder Templates', 'Team Members', 'Roles & Permissions', 'Communication Settings', 'Data & Privacy']; return <><PageHeader title="Settings" subtitle="Configure CareLoop for your team's follow-up operations." /><div className="settings-layout"><div className="settings-nav">{sections.map((item) => <button key={item} className={section === item ? 'settings-active' : ''} onClick={() => setSection(item)}>{item}<ChevronRight size={15} /></button>)}</div><section className="panel settings-panel">{section === 'Profile' && <><div className="settings-title"><div><h2>Profile</h2><p>Connect the current user profile through the backend.</p></div><button className="button button-primary"><Check size={16} /> Save changes</button></div><div className="profile-edit"><div className="avatar avatar-large avatar-blue"><UserRound size={18} /></div><div><strong>Profile not connected</strong><span>User details will load from the backend.</span><button className="text-button">Change photo</button></div></div><div className="form-grid"><label className="field-label">Full name<input placeholder="Connect from backend" /></label><label className="field-label">Role<input placeholder="Connect from backend" /></label><label className="field-label">Email address<input placeholder="Connect from backend" /></label><label className="field-label">Timezone<select defaultValue=""><option value="" disabled>Select timezone</option><option>UTC</option></select></label></div></>}{section === 'Reminder Templates' && <TemplateSettings />}{section !== 'Profile' && section !== 'Reminder Templates' && <EmptyState title={`${section} settings`} body="This section is ready for backend configuration." action={<button className="button button-secondary">Review options</button>} />}</section></div></> }
function TemplateSettings() { return <><div className="settings-title"><div><h2>Reminder templates</h2><p>Approved administrative messages connected from the backend.</p></div><button className="button button-primary" disabled><Plus size={16} /> New template</button></div><EmptyState title="No reminder templates" body="Templates will appear here after the backend connection is configured." /></> }
function FollowupDrawer({ patient, communications, onClose, onSendReminder, onConfirm, navigate }: { patient: Patient; communications: Communication[]; onClose: () => void; onSendReminder: (id: string) => void; onConfirm: (id: string) => void; navigate: (route: Route) => void }) { return <div className="drawer-wrap"><button className="drawer-scrim" onClick={onClose} aria-label="Close follow-up drawer" /><aside className="drawer"><div className="drawer-header"><div><span className="eyebrow">FOLLOW-UP RECORD</span><h2>{patient.id}</h2><p>{patient.name}</p></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="drawer-status"><StatusBadge status={patient.status} /><button className="text-button"><MoreHorizontal size={15} /></button></div><section className="drawer-section"><h3>Appointment</h3><div className="appointment-card"><CalendarDays size={18} /><div><strong>{patient.nextFollowup}</strong><span>{patient.time}</span><small>Location will load from backend</small></div></div></section><section className="drawer-section"><h3>Reminder</h3><div className="detail-row"><span>Status</span><strong>{patient.reminder}</strong></div><div className="detail-row"><span>Last sent</span><strong>Not available</strong></div></section><section className="drawer-section"><h3>Patient response</h3><div className="response-state"><div className={`response-icon ${patient.response === 'Confirmed' ? 'success' : 'warning'}`}>{patient.response === 'Confirmed' ? <Check size={18} /> : <Clock3 size={18} />}</div><div><strong>{patient.response}</strong><span>Response history is administrative only.</span></div></div></section><section className="drawer-section"><h3>Communication history</h3><ActivityTimeline items={communications.map((item, index) => ({ id: item.id, time: item.sent.split(' · ')[1] ?? item.sent, text: `${item.type} · ${item.response}`, tone: index === 0 ? 'blue' : 'navy' }))} /></section><section className="drawer-section"><h3>Assigned staff</h3><div className="assigned-large"><Avatar initials={patient.assigned === 'Unassigned' ? '?' : patient.assigned.split(' ').map((x) => x[0]).join('')} tone="gray" /><strong>{patient.assigned}</strong><ChevronDown size={15} /></div></section><div className="drawer-footer"><button className="button button-secondary" onClick={() => onSendReminder(patient.id)}><Send size={16} /> Send reminder</button><button className="button button-primary" onClick={() => onConfirm(patient.id)}><Check size={16} /> Mark contacted</button><button className="button button-ghost" onClick={() => { onClose(); navigate('/reschedules') }}>Request reschedule</button></div></aside></div> }

function GlobalSearch({ state, onClose, onSelect, navigate }: { state: AppState; onClose: () => void; onSelect: (patientId: string) => void; navigate: (route: Route) => void }) { const [query, setQuery] = useState(''); const results = query.length > 1 ? state.patients.filter((p) => `${p.id} ${p.name}`.toLowerCase().includes(query.toLowerCase())) : state.patients.slice(0, 3); return <div className="search-backdrop" onClick={onClose}><div className="search-modal" onClick={(event) => event.stopPropagation()}><div className="search-input-wrap"><Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient IDs, appointments, tasks and communications" /><kbd>ESC</kbd></div><div className="search-results"><span className="search-group-label">Patients</span>{results.map((patient) => <button className="search-result" key={patient.id} onClick={() => onSelect(patient.id)}><Avatar initials={patient.initials} /><div><strong>{patient.id}</strong><span>{patient.name} · {patient.nextFollowup}</span></div><ChevronRight size={16} /></button>)}{query.length > 1 && results.length === 0 && <EmptyState title="No search results" body="Try a patient ID, name, or task keyword." />}</div><div className="search-footer"><span><kbd>↑↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><button onClick={() => navigate('/follow-ups')}>View all records <ArrowRight size={14} /></button></div></div></div> }

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) { return <div className="empty-state"><div className="empty-icon"><Inbox size={20} /></div><h3>{title}</h3><p>{body}</p>{action}</div> }
function ToastStack({ toasts }: { toasts: Toast[] }) { return <div className="toast-stack" aria-live="polite">{toasts.map((item) => <div className={`toast ${item.tone === 'error' ? 'toast-error' : ''}`} key={item.id}><div className="toast-icon"><Check size={15} /></div><span>{item.message}</span><button aria-label="Dismiss"><X size={14} /></button></div>)}</div> }

function PatientPortalEmpty({ onBack }: { onBack: () => void }) { return <div className="portal-shell"><div className="portal-topbar"><button className="portal-brand" onClick={onBack}><img src="/careloop-logo.png" alt="CareLoop" /><span>CARELOOP</span></button></div><main className="portal-main"><div className="portal-intro"><span className="eyebrow">PATIENT PORTAL</span><h1>No patient record connected</h1><p>Patient portal details will appear after the backend provides a patient record.</p></div><div className="portal-success"><div className="success-mark"><Inbox size={30} /></div><h2>Waiting for backend data</h2><p>No appointment or patient information is loaded.</p><button className="button button-primary full-button" onClick={onBack}>Return to CareLoop</button></div></main></div> }

function PatientPortal({ patient, patients, onConfirm, onRequestReschedule, onBack, onSelectPatient }: { patient: Patient; patients: Patient[]; onConfirm: (id: string) => void; onRequestReschedule: (id: string, request: Omit<RescheduleRequest, 'id' | 'patientId' | 'status'>) => void; onBack: () => void; onSelectPatient: (id: string) => void }) { const [requested, setRequested] = useState(false); const [submitted, setSubmitted] = useState(false); const [confirmed, setConfirmed] = useState(patient.response === 'Confirmed'); const [date, setDate] = useState(''); const [time, setTime] = useState(''); useEffect(() => { setConfirmed(patient.response === 'Confirmed'); setRequested(false); setSubmitted(false) }, [patient.id]); const handleConfirm = () => { onConfirm(patient.id); setConfirmed(true) }; const handleRequest = () => { onRequestReschedule(patient.id, { currentDate: patient.nextFollowup, currentTime: patient.time, requestedDate: date, requestedTime: time, received: 'Now', message: 'Please move my follow-up to a different time.' }); setSubmitted(true) }; return <div className="portal-shell"><div className="portal-topbar"><button className="portal-brand" onClick={onBack}><img src="/careloop-logo.png" alt="CareLoop" /><span>CARELOOP</span></button><div className="portal-switcher"><span>Viewing as</span><select value={patient.id} onChange={(event) => onSelectPatient(event.target.value)}>{patients.map((p) => <option key={p.id}>{p.id}</option>)}</select></div></div><main className="portal-main"><div className="portal-intro"><span className="eyebrow">YOUR FOLLOW-UP</span><h1>Patient follow-up</h1><p>Review the connected appointment and let your care team know what works for you.</p></div>{confirmed ? <div className="portal-success"><div className="success-mark"><Check size={30} /></div><h2>Appointment confirmed</h2><p>Your care team has been notified.</p><div className="portal-appointment compact"><CalendarDays size={19} /><div><strong>{patient.nextFollowup}</strong><span>{patient.time}</span></div></div><button className="button button-primary full-button" onClick={onBack}>Return to CareLoop</button></div> : submitted ? <div className="portal-success"><div className="success-mark amber-mark"><Check size={30} /></div><h2>Your request has been sent</h2><p>Your care team will review the requested time.</p><button className="button button-secondary full-button" onClick={() => { setSubmitted(false); setRequested(true) }}>Review appointment</button></div> : <><section className="portal-appointment"><div className="appointment-date"><span>DATE</span><strong>—</strong><small>Connected</small></div><div><span className="appointment-label">UPCOMING APPOINTMENT</span><h2>{patient.nextFollowup}</h2><strong>{patient.time}</strong><p>Location will load from backend</p></div><StatusBadge status={patient.status} /></section><p className="portal-message">Please confirm your appointment or request a different time.</p><div className="portal-actions"><button className="button button-primary full-button" onClick={handleConfirm}><CheckCircle2 size={18} /> Confirm appointment</button><button className="button button-secondary full-button" onClick={() => setRequested(true)}><RefreshCw size={18} /> Request a different time</button></div>{requested && !submitted && <div className="portal-request-form"><label className="field-label">Preferred date<input type="text" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="field-label">Preferred time<select value={time} onChange={(event) => setTime(event.target.value)}><option value="">Select a time</option><option>Morning</option><option>Afternoon</option><option>Any time</option></select></label><button className="button button-primary full-button" onClick={handleRequest} disabled={!date || !time}>Submit request</button></div>}</>}</main><footer className="portal-footer"><img src="/careloop-logo.png" alt="" /> CareLoop helps care teams keep administrative follow-ups on track.</footer></div> }

export default App
