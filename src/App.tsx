import { useEffect, useMemo, useState } from 'react'
import {
  Activity as ActivityIcon, AlertCircle, ArrowLeft, ArrowRight, BarChart3, Bell, CalendarDays, Check,
  CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Clock3, Command, Edit3, FileText,
  Filter, Home, Inbox, LayoutDashboard, ListFilter, Mail, Menu, MessageSquare, MoreHorizontal,
  Plus, RefreshCw, Search, Send, Settings as SettingsIcon, SlidersHorizontal, Sparkles, UserRound,
  Users, X, Zap,
} from 'lucide-react'
import {
  Activity, Communication, Followup, FollowupStatus, initialActivity, initialCommunications, initialNotifications,
  initialPatients, initialReschedules, initialTasks, Notification, Patient, RescheduleRequest, staff, Task, TaskStatus,
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
    patients: initialPatients, communications: initialCommunications, tasks: initialTasks,
    reschedules: initialReschedules, notifications: initialNotifications, activity: initialActivity,
  })
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [portalPatientId, setPortalPatientId] = useState('P-1281')

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
    setState((current) => ({ ...current, communications: [{ id: `c-${Date.now()}`, patientId, type: 'Follow-up reminder', created: 'Today · Now', approvedBy: 'Dr. Meera Rao', sent: 'Today · Now', response: 'Awaiting', status: 'Awaiting Response' }, ...current.communications] }))
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

  const resetDemo = () => {
    setState({ patients: initialPatients, communications: initialCommunications, tasks: initialTasks, reschedules: initialReschedules, notifications: initialNotifications, activity: initialActivity })
    toast('Demo data reset.')
  }

  const selectedPatient = state.patients.find((item) => item.id === selectedPatientId) ?? null
  const pendingNotifications = state.notifications.filter((item) => !item.read).length

  if (route === '/portal') {
    return <PatientPortal patient={state.patients.find((item) => item.id === portalPatientId) ?? state.patients[3]} onConfirm={confirmAppointment} onRequestReschedule={requestReschedule} onBack={() => navigate('/overview')} onSelectPatient={setPortalPatientId} patients={state.patients} />
  }

  return (
    <div className="app-shell">
      <Sidebar route={route} navigate={navigate} mobileOpen={mobileNav} onClose={() => setMobileNav(false)} onSearch={() => setSearchOpen(true)} notificationCount={pendingNotifications} />
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
          {route === '/settings' && <Settings onReset={resetDemo} onGenerate={() => { addActivity('Demo activity generated', 'blue'); toast('Demo activity generated.') }} />}
        </main>
      </div>
      {selectedPatient && <FollowupDrawer patient={selectedPatient} communications={state.communications.filter((item) => item.patientId === selectedPatient.id)} onClose={() => setSelectedPatientId(null)} onSendReminder={sendReminder} onConfirm={confirmAppointment} navigate={navigate} />}
      {searchOpen && <GlobalSearch state={state} onClose={() => setSearchOpen(false)} onSelect={(patientId) => { setSearchOpen(false); setSelectedPatientId(patientId) }} navigate={navigate} />}
      <ToastStack toasts={toasts} />
    </div>
  )
}

function Sidebar({ route, navigate, mobileOpen, onClose, onSearch, notificationCount }: { route: Route; navigate: (route: Route) => void; mobileOpen: boolean; onClose: () => void; onSearch: () => void; notificationCount: number }) {
  return <>
    {mobileOpen && <button className="mobile-backdrop" onClick={onClose} aria-label="Close navigation" />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top">
        <div className="brand-lockup"><img src="/careloop-logo.png" alt="CareLoop" /><div><strong>CARELOOP</strong><span>FOLLOW-UP OPERATIONS</span></div></div>
        <button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={18} /></button>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map(({ route: itemRoute, label, icon: Icon }) => <button key={itemRoute} className={`nav-item ${route === itemRoute ? 'nav-active' : ''}`} onClick={() => navigate(itemRoute)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{itemRoute === '/tasks' && <span className="nav-count">4</span>}</button>)}
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
      <button className="top-profile" onClick={() => navigate('/settings')}><div className="avatar avatar-blue">MR</div><span>Dr. Meera Rao</span><ChevronDown size={14} /></button>
      <button className={`icon-button corner-settings ${route === '/settings' ? 'corner-settings-active' : ''}`} onClick={() => navigate('/settings')} aria-label="Settings"><SettingsIcon size={19} /></button>
    </div>
  </header>
}

function PageHeader({ title, subtitle, action, eyebrow }: { title: string; subtitle: string; action?: React.ReactNode; eyebrow?: string }) {
  return <div className="page-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{subtitle}</p></div>{action}</div>
}

function Overview({ state, onSelectPatient, navigate }: { state: AppState; onSelectPatient: (id: string) => void; navigate: (route: Route) => void }) {
  const due = state.patients.filter((item) => item.status !== 'Completed').length + 19
  const awaiting = state.patients.filter((item) => item.response === 'Awaiting response' || item.response === 'No response').length + 5
  const reschedules = state.reschedules.filter((item) => item.status === 'Pending Review').length + 5
  const staffAction = state.patients.filter((item) => item.status === 'Staff Action Required').length + 3
  const completed = state.patients.filter((item) => item.status === 'Confirmed').length + 16
  return <>
    <PageHeader title="Good morning, Dr. Rao" subtitle="Here's what needs attention today." action={<button className="button button-primary" onClick={() => navigate('/follow-ups')}><Plus size={16} /> New Follow-up</button>} />
    <div className="kpi-grid">
      <KpiCard label="Follow-ups due today" value={due} icon={<CalendarDays size={17} />} tone="blue" trend="4 from yesterday" />
      <KpiCard label="Awaiting response" value={awaiting} icon={<Clock3 size={17} />} tone="amber" trend="2 more than yesterday" />
      <KpiCard label="Reschedule requests" value={reschedules} icon={<RefreshCw size={17} />} tone="purple" trend="3 need review" />
      <KpiCard label="Staff action required" value={staffAction} icon={<AlertCircle size={17} />} tone="red" trend="1 overdue" />
      <KpiCard label="Completed today" value={completed} icon={<CheckCircle2 size={17} />} tone="green" trend="12% above average" />
    </div>
    <div className="overview-grid">
      <section className="panel queue-panel"><PanelHeading title="Today's follow-up queue" action={<button className="text-button" onClick={() => navigate('/follow-ups')}>View all <ArrowRight size={15} /></button>} /><QueueTable patients={state.patients.slice(0, 4)} onSelectPatient={onSelectPatient} /></section>
      <section className="panel attention-panel"><PanelHeading title="Needs attention" action={<button className="icon-button small"><MoreHorizontal size={16} /></button>} /><div className="attention-list"><AttentionCard patientId="P-1281" reason="Follow-up reminder unanswered" time="1 day ago" owner="Coordinator C" tone="red" onClick={() => onSelectPatient('P-1281')} /><AttentionCard patientId="P-1177" reason="Reschedule request received" time="2 hrs ago" owner="Coordinator A" tone="amber" onClick={() => onSelectPatient('P-1177')} /><AttentionCard patientId="P-1452" reason="Follow-up due tomorrow" time="3 hrs ago" owner="Unassigned" tone="blue" onClick={() => onSelectPatient('P-1452')} /></div></section>
    </div>
    <div className="bottom-grid"><section className="panel activity-panel"><PanelHeading title="Recent activity" action={<button className="text-button" onClick={() => navigate('/communication')}>View communication <ArrowRight size={15} /></button>} /><ActivityTimeline items={state.activity} /></section></div>
  </>
}

function KpiCard({ label, value, icon, tone, trend }: { label: string; value: number; icon: React.ReactNode; tone: string; trend: string }) {
  return <div className="kpi-card"><div className={`kpi-icon ${tone}`}>{icon}</div><span className="kpi-label">{label}</span><strong className="kpi-value">{value}</strong><span className="kpi-trend"><ArrowUpRight size={13} /> {trend}</span></div>
}
function ArrowUpRight({ size }: { size: number }) { return <ArrowRight size={size} className="arrow-up-right" /> }
function PanelHeading({ title, action }: { title: string; action?: React.ReactNode }) { return <div className="panel-heading"><h2>{title}</h2>{action}</div> }
function StatusBadge({ status }: { status: string }) { const key = status.toLowerCase(); const tone = key.includes('confirmed') || key.includes('completed') || key.includes('responded') || key.includes('sent') ? 'success' : key.includes('reschedule') || key.includes('pending') || key.includes('waiting') ? 'warning' : key.includes('action') || key.includes('escalated') || key.includes('overdue') || key.includes('no response') ? 'danger' : 'neutral'; return <span className={`status-badge ${tone}`}><span className="badge-icon">{tone === 'success' ? <Check size={12} /> : tone === 'danger' ? <AlertCircle size={12} /> : <Clock3 size={12} />}</span>{status}</span> }
function Avatar({ initials, tone = 'blue' }: { initials: string; tone?: string }) { return <span className={`avatar avatar-${tone}`}>{initials}</span> }

function QueueTable({ patients, onSelectPatient }: { patients: Patient[]; onSelectPatient: (id: string) => void }) {
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Patient</th><th>Follow-up date</th><th>Reminder</th><th>Response</th><th>Assigned to</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{patients.map((patient) => <tr key={patient.id} onClick={() => onSelectPatient(patient.id)}><td><div className="patient-cell"><Avatar initials={patient.initials} /><div><strong>{patient.id}</strong><span>{patient.name}</span></div></div></td><td><strong>{patient.nextFollowup}</strong><span className="table-sub">{patient.time}</span></td><td><span className="sent-text"><CheckCircle2 size={14} /> {patient.reminder}</span></td><td>{patient.response}</td><td><div className="assigned-cell"><Avatar initials={patient.assigned === 'Unassigned' ? '?' : patient.assigned.split(' ').map((x) => x[0]).join('')} tone="gray" />{patient.assigned}</div></td><td><StatusBadge status={patient.status} /></td><td><button className="row-action" onClick={(event) => { event.stopPropagation(); onSelectPatient(patient.id) }}>View <ChevronRight size={15} /></button></td></tr>)}</tbody></table></div>
}

function AttentionCard({ patientId, reason, time, owner, tone, onClick }: { patientId: string; reason: string; time: string; owner: string; tone: string; onClick: () => void }) { return <button className="attention-card" onClick={onClick}><div className={`attention-marker ${tone}`} /><div className="attention-copy"><strong>{patientId}</strong><span>{reason}</span><small>{time} · {owner}</small></div><ChevronRight size={16} /></button> }
function ActivityTimeline({ items }: { items: Activity[] }) { return <div className="timeline">{items.map((item) => <div className="timeline-item" key={item.id}><div className={`timeline-marker ${item.tone}`}><span /></div><div><strong>{item.time}</strong><span>{item.text}</span></div></div>)}</div> }
function Workflow() { return <div className="workflow"><div className="workflow-line" />{[['Scheduled', 'CalendarDays'], ['Reminder', 'Send'], ['Response', 'MessageSquare'], ['Action', 'Zap'], ['Completion', 'Check']].map(([label, icon], index) => <div className="workflow-step" key={label}><div className={`workflow-icon ${index === 4 ? 'complete' : ''}`}>{icon === 'CalendarDays' ? <CalendarDays size={16} /> : icon === 'Send' ? <Send size={16} /> : icon === 'MessageSquare' ? <MessageSquare size={16} /> : icon === 'Zap' ? <Zap size={16} /> : <Check size={16} />}</div><span>{label}</span></div>)}</div> }

function FollowUps({ state, onSelectPatient, onSendReminder, navigate }: { state: AppState; onSelectPatient: (id: string) => void; onSendReminder: (id: string) => void; navigate: (route: Route) => void }) {
  const [tab, setTab] = useState('All'); const [query, setQuery] = useState('')
  const filtered = state.patients.filter((patient) => (patient.id + patient.name + patient.status).toLowerCase().includes(query.toLowerCase())).filter((patient) => tab === 'All' || (tab === 'Due Today' && patient.nextFollowup.includes('22 Sep')) || (tab === 'Overdue' && patient.status === 'Staff Action Required') || (tab === 'Completed' && patient.status === 'Confirmed') || (tab === 'Upcoming' && patient.nextFollowup.includes('24 Sep')))
  return <><PageHeader title="Follow-ups" subtitle="Manage scheduled patient follow-ups and communication." action={<button className="button button-primary" onClick={() => toastUnavailable()}><Plus size={16} /> Schedule follow-up</button>} /><div className="filter-bar"><label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient ID or name" /></label><FilterSelect label="Date range" /><FilterSelect label="Department" /><FilterSelect label="Assigned staff" /><FilterSelect label="Status" /></div><div className="tabs">{['All', 'Due Today', 'Upcoming', 'Overdue', 'Completed'].map((item) => <button className={tab === item ? 'tab-active' : ''} key={item} onClick={() => setTab(item)}>{item}<span>{item === 'All' ? state.patients.length : item === 'Completed' ? state.patients.filter((p) => p.status === 'Confirmed').length : ''}</span></button>)}</div><section className="panel page-panel"><QueueTable patients={filtered} onSelectPatient={onSelectPatient} />{filtered.length === 0 && <EmptyState title="No follow-ups found" body="Try changing your filters or search terms." action={<button className="button button-secondary" onClick={() => { setQuery(''); setTab('All') }}>Clear filters</button>} />}</section><div className="page-footnote"><span>Showing {filtered.length} of {state.patients.length} follow-ups</span><button className="text-button" onClick={() => navigate('/communication')}>Review communication <ArrowRight size={15} /></button></div></>
}
function FilterSelect({ label }: { label: string }) { return <button className="filter-select">{label}<ChevronDown size={15} /></button> }
function toastUnavailable() { window.dispatchEvent(new CustomEvent('careloop:toast', { detail: 'Schedule form ready for demo data.' })) }

function Patients({ state, onSelectPatient }: { state: AppState; onSelectPatient: (id: string) => void }) { const [query, setQuery] = useState(''); const patients = state.patients.filter((p) => `${p.id} ${p.name}`.toLowerCase().includes(query.toLowerCase())); return <><PageHeader title="Patients" subtitle="Manage administrative follow-up records." action={<div className="demo-tag"><span className="status-dot" /> DEMO PATIENTS ONLY</div>} /><section className="panel page-panel"><div className="section-toolbar"><label className="inline-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient ID or name" /></label><span className="toolbar-meta">{patients.length} fictional records</span></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Patient</th><th>Next follow-up</th><th>Reminder</th><th>Response</th><th>Assigned staff</th><th>Administrative status</th><th /></tr></thead><tbody>{patients.map((patient) => <tr key={patient.id} onClick={() => onSelectPatient(patient.id)}><td><div className="patient-cell"><Avatar initials={patient.initials} /><div><strong>{patient.id}</strong><span>{patient.name}</span><em>DEMO PATIENT</em></div></div></td><td><strong>{patient.nextFollowup}</strong><span className="table-sub">{patient.time}</span></td><td>{patient.reminder}</td><td>{patient.response}</td><td>{patient.assigned}</td><td><StatusBadge status={patient.status} /></td><td><button className="row-action">Open <ChevronRight size={15} /></button></td></tr>)}</tbody></table></div>{patients.length === 0 && <EmptyState title="No patients found" body="There are no demo patients matching that search." />}</section></> }

function CommunicationPage({ state, onSendReminder, onSelectPatient }: { state: AppState; onSendReminder: (id: string) => void; onSelectPatient: (id: string) => void }) { const [tab, setTab] = useState('All'); const [draftOpen, setDraftOpen] = useState(false); const filtered = state.communications.filter((item) => tab === 'All' || item.status === tab); return <><PageHeader title="Communication" subtitle="Track approved patient follow-up communications." action={<button className="button button-primary" onClick={() => setDraftOpen(true)}><Sparkles size={16} /> Draft reminder</button>} /><div className="tabs">{['All', 'Awaiting Response', 'Sent', 'Responded', 'Escalated'].map((item) => <button className={tab === item ? 'tab-active' : ''} key={item} onClick={() => setTab(item)}>{item}</button>)}</div><div className="communication-grid">{filtered.map((item) => <CommunicationCard key={item.id} item={item} onOpen={() => onSelectPatient(item.patientId)} />)}</div>{filtered.length === 0 && <EmptyState title="No communication here" body="Approved follow-up communications will appear here." />}{draftOpen && <DraftAssistant patients={state.patients} onClose={() => setDraftOpen(false)} onSend={(patientId) => { onSendReminder(patientId); setDraftOpen(false) }} />}</> }
function CommunicationCard({ item, onOpen }: { item: Communication; onOpen: () => void }) { return <button className="communication-card" onClick={onOpen}><div className="card-topline"><span className="mini-icon blue"><Mail size={15} /></span><StatusBadge status={item.status} /></div><div className="communication-title"><strong>{item.patientId}</strong><span>{item.type}</span></div><div className="communication-details"><div><span>Created</span><strong>{item.created}</strong></div><div><span>Approved by</span><strong>{item.approvedBy}</strong></div><div><span>Sent</span><strong>{item.sent}</strong></div><div><span>Response</span><strong>{item.response}</strong></div></div><span className="card-link">View record <ArrowRight size={14} /></span></button> }
function DraftAssistant({ patients, onClose, onSend }: { patients: Patient[]; onClose: () => void; onSend: (id: string) => void }) { const [patientId, setPatientId] = useState('P-1281'); const [draft, setDraft] = useState('Hello, your follow-up appointment is scheduled for 20 September at 3:00 PM. Please confirm your appointment or request a different date.'); const patient = patients.find((p) => p.id === patientId) ?? patients[0]; return <div className="modal-backdrop"><div className="modal draft-modal"><div className="modal-header"><div><span className="eyebrow">ADMINISTRATIVE ASSISTANT</span><h2>Reminder draft assistant</h2><p>Create a clear reminder for staff approval.</p></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="assistant-note"><Sparkles size={16} /><span>AI-generated draft. Staff approval required.</span></div><label className="field-label">Patient record<select value={patientId} onChange={(event) => { setPatientId(event.target.value); const next = patients.find((p) => p.id === event.target.value); if (next) setDraft(`Hello, your follow-up appointment is scheduled for ${next.nextFollowup} at ${next.time}. Please confirm your appointment or request a different date.`) }}>{patients.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}</select></label><label className="field-label">Message<textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} /></label><div className="modal-footer"><button className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" onClick={() => onSend(patient.id)}><Check size={16} /> Approve & send</button></div></div></div> }

function Reschedules({ state, onApprove, onSelectPatient }: { state: AppState; onApprove: (id: string, date: string, time: string) => void; onSelectPatient: (id: string) => void }) { const [selected, setSelected] = useState<RescheduleRequest | null>(null); return <><PageHeader title="Reschedule requests" subtitle="Review and coordinate patient-requested appointment changes." action={<FilterSelect label="Pending review" />} /><div className="reschedule-grid">{state.reschedules.map((request) => <RescheduleCard key={request.id} request={request} onReview={() => setSelected(request)} onOpenPatient={() => onSelectPatient(request.patientId)} />)}</div>{state.reschedules.length === 0 && <EmptyState title="You're all caught up" body="There are no pending reschedule requests right now." />}{selected && <RescheduleModal request={selected} onClose={() => setSelected(null)} onApprove={(date, time) => { onApprove(selected.id, date, time); setSelected(null) }} />}</> }
function RescheduleCard({ request, onReview, onOpenPatient }: { request: RescheduleRequest; onReview: () => void; onOpenPatient: () => void }) { return <section className="panel reschedule-card"><div className="reschedule-card-head"><button className="patient-link" onClick={onOpenPatient}><span className="avatar avatar-amber">{request.patientId.slice(-2)}</span><strong>{request.patientId}</strong></button><StatusBadge status={request.status} /></div><div className="reschedule-compare"><div><span>Current appointment</span><strong>{request.currentDate}</strong><small>{request.currentTime}</small></div><ArrowRight size={17} /><div className="requested-date"><span>Patient requested</span><strong>{request.requestedDate}</strong><small>{request.requestedTime}</small></div></div><p className="request-message">“{request.message}”</p><div className="request-meta"><span>Received {request.received}</span><span>Demo patient</span></div><div className="card-actions"><button className="button button-primary" onClick={onReview}>Review request</button><button className="button button-secondary" onClick={onOpenPatient}>Contact patient</button></div></section> }
function RescheduleModal({ request, onClose, onApprove }: { request: RescheduleRequest; onClose: () => void; onApprove: (date: string, time: string) => void }) { const [date, setDate] = useState(request.requestedDate); const [time, setTime] = useState(request.requestedTime === 'Morning' ? '10:30 AM' : '2:00 PM'); return <div className="modal-backdrop"><div className="modal"><div className="modal-header"><div><span className="eyebrow">REVIEW RESCHEDULE REQUEST</span><h2>{request.patientId}</h2><p>{request.message}</p></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="appointment-compare"><div><span>Current appointment</span><strong>{request.currentDate}</strong><b>{request.currentTime}</b></div><ChevronRight size={18} /><div className="new-appointment"><span>Requested appointment</span><strong>{request.requestedDate}</strong><b>{request.requestedTime}</b></div></div><div className="modal-form-grid"><label className="field-label">Available date<input type="text" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="field-label">Available time<select value={time} onChange={(event) => setTime(event.target.value)}><option>10:30 AM</option><option>11:15 AM</option><option>2:00 PM</option><option>3:00 PM</option></select></label></div><div className="availability"><CheckCircle2 size={16} /><span>Available slot at Demo Clinic · Room 04</span></div><div className="modal-footer"><button className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" onClick={() => onApprove(date, time)}><Check size={16} /> Confirm new appointment</button></div></div></div> }

function TasksPage({ state, onStatusChange, onAssign, onSelectPatient }: { state: AppState; onStatusChange: (id: string, status: TaskStatus) => void; onAssign: (id: string, owner: string) => void; onSelectPatient: (id: string) => void }) { const [tab, setTab] = useState('All'); const filtered = state.tasks.filter((task) => tab === 'All' || (tab === 'Completed' && task.status === 'Completed') || (tab === 'My Tasks' && task.owner === 'Coordinator A') || (tab === 'Unassigned' && task.owner === 'Unassigned') || (tab === 'Due Today' && task.due === 'Today') || (tab === 'Overdue' && task.status === 'To Do')); return <><PageHeader title="Tasks" subtitle="Coordinate administrative follow-up work across your team." action={<button className="button button-primary"><Plus size={16} /> New task</button>} /><div className="tabs">{['All', 'My Tasks', 'Unassigned', 'Due Today', 'Overdue', 'Completed'].map((item) => <button className={tab === item ? 'tab-active' : ''} key={item} onClick={() => setTab(item)}>{item}</button>)}</div><section className="panel page-panel"><div className="table-wrap"><table className="data-table task-table"><thead><tr><th>Task</th><th>Owner</th><th>Created</th><th>Due</th><th>Status</th><th>Change status</th></tr></thead><tbody>{filtered.map((task) => <tr key={task.id}><td><button className="task-name" onClick={() => onSelectPatient(task.patientId)}><span className="task-check"><Check size={12} /></span><span><strong>{task.task}</strong><small>{task.patientId}</small></span></button></td><td><select className="table-select" value={task.owner} onChange={(event) => onAssign(task.id, event.target.value)}>{['Unassigned', ...staff].map((person) => <option key={person}>{person}</option>)}</select></td><td>{task.created}</td><td>{task.due}</td><td><StatusBadge status={task.status} /></td><td><select className="table-select" value={task.status} onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}>{['To Do', 'In Progress', 'Waiting', 'Completed'].map((status) => <option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div>{filtered.length === 0 && <EmptyState title="No tasks in this view" body="There are no administrative tasks matching this filter." />}</section></> }

function Escalations({ state, onSelectPatient, onSendReminder }: { state: AppState; onSelectPatient: (id: string) => void; onSendReminder: (id: string) => void }) { const escalated = state.patients.filter((patient) => patient.status === 'Staff Action Required' || patient.response === 'No response'); return <><PageHeader title="Staff action required" subtitle="Administrative follow-ups requiring staff attention." action={<FilterSelect label="All action items" />} /><div className="tabs"><button className="tab-active">Unanswered <span>{escalated.length}</span></button><button>Overdue</button><button>Reschedule</button><button>Unassigned</button></div><section className="panel page-panel"><div className="escalation-list">{escalated.map((patient) => <div className="escalation-row" key={patient.id}><div className="escalation-icon"><AlertCircle size={18} /></div><div className="escalation-main"><div><strong>{patient.id}</strong><StatusBadge status={patient.status} /></div><p>No response after approved reminder sequence.</p><span>Last reminder: 22 Sep · 09:30 · Attempts: 2 · Assigned: {patient.assigned}</span></div><div className="card-actions compact"><button className="button button-secondary" onClick={() => onSelectPatient(patient.id)}>Review</button><button className="button button-primary" onClick={() => onSendReminder(patient.id)}>Contact</button></div></div>)}</div>{escalated.length === 0 && <EmptyState title="You're all caught up" body="There are no unanswered reminders requiring action." />}</section></> }

function Analytics({ state }: { state: AppState }) { const confirmed = state.patients.filter((p) => p.response === 'Confirmed').length; const responseRate = Math.round((confirmed / state.patients.length) * 100); return <><PageHeader title="Follow-up operations" subtitle="Understand follow-up workload and communication performance." action={<button className="filter-select"><CalendarDays size={15} /> 16-22 Sep 2026 <ChevronDown size={15} /></button>} /><div className="analytics-kpis"><Metric label="Total scheduled follow-ups" value="38" change="+8.4%" /><Metric label="Confirmation rate" value={`${responseRate}%`} change="+4.2%" /><Metric label="Reschedule requests" value={String(state.reschedules.length + 5)} change="-2.1%" /><Metric label="Reminder response rate" value="71%" change="+6.8%" /></div><div className="chart-grid"><section className="panel chart-panel"><PanelHeading title="Follow-up volume" action={<button className="icon-button small"><MoreHorizontal size={16} /></button>} /><BarChart /></section><section className="panel chart-panel"><PanelHeading title="Follow-up status" action={<span className="chart-total">38 total</span>} /><DonutChart /></section><section className="panel chart-panel wide-chart"><PanelHeading title="Response trend" action={<span className="chart-legend"><i className="legend-line" /> Responses <i className="legend-line soft" /> Follow-ups</span>} /><LineChart /></section><section className="panel chart-panel"><PanelHeading title="Staff workload" /><WorkloadChart /></section></div></> }
function Metric({ label, value, change }: { label: string; value: string; change: string }) { return <div className="metric-card"><span>{label}</span><strong>{value}</strong><small><ArrowUpRight size={13} /> {change} vs last period</small></div> }
function BarChart() { return <div className="bar-chart"><div className="chart-y"><span>12</span><span>8</span><span>4</span><span>0</span></div><div className="bars">{[['16 Sep', 45], ['17 Sep', 68], ['18 Sep', 58], ['19 Sep', 82], ['20 Sep', 64], ['21 Sep', 92], ['22 Sep', 74]].map(([day, height]) => <div className="bar-group" key={day}><div className="bar" style={{ height: `${height}%` }} /><span>{day}</span></div>)}</div></div> }
function DonutChart() { return <div className="donut-layout"><div className="donut" /><div className="donut-label"><strong>38</strong><span>Total</span></div><div className="legend-list"><span><i className="legend-dot blue" /> Confirmed <b>18</b></span><span><i className="legend-dot amber" /> Awaiting <b>11</b></span><span><i className="legend-dot purple" /> Reschedule <b>7</b></span><span><i className="legend-dot red" /> Action <b>2</b></span></div></div> }
function LineChart() {
  const responsePoints = '18,128 128,105 238,115 348,72 458,84 568,42 678,56'
  const followupPoints = '18,154 128,132 238,139 348,102 458,112 568,76 678,88'
  const responseNodes = [[18, 128], [128, 105], [238, 115], [348, 72], [458, 84], [568, 42], [678, 56]]
  return <div className="line-chart trend-chart">
    <svg className="trend-svg" viewBox="0 0 700 190" role="img" aria-label="Response and follow-up trend over seven days">
      <g className="trend-grid">
        <line x1="18" y1="20" x2="678" y2="20" />
        <line x1="18" y1="72" x2="678" y2="72" />
        <line x1="18" y1="124" x2="678" y2="124" />
        <line x1="18" y1="176" x2="678" y2="176" />
      </g>
      <polygon className="trend-area-followups" points={`${followupPoints} 678,176 18,176`} />
      <polyline className="trend-line followups" points={followupPoints} />
      <polyline className="trend-line responses" points={responsePoints} />
      {responseNodes.map(([cx, cy]) => <circle className="trend-point" key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" />)}
    </svg>
    <div className="trend-labels"><span>16 Sep</span><span>18 Sep</span><span>20 Sep</span><span>22 Sep</span></div>
  </div>
}
function WorkloadChart() { return <div className="workload"><div><span>Coordinator A</span><b style={{ width: '82%' }} /><em>12</em></div><div><span>Coordinator B</span><b style={{ width: '61%' }} /><em>9</em></div><div><span>Coordinator C</span><b style={{ width: '48%' }} /><em>7</em></div><div><span>Unassigned</span><b style={{ width: '24%' }} /><em>3</em></div></div> }

function Settings({ onReset, onGenerate }: { onReset: () => void; onGenerate: () => void }) { const [section, setSection] = useState('Profile'); return <><PageHeader title="Settings" subtitle="Configure CareLoop for your team's follow-up operations." /><div className="settings-layout"><div className="settings-nav">{['Profile', 'Notifications', 'Reminder Templates', 'Team Members', 'Roles & Permissions', 'Communication Settings', 'Data & Privacy', 'Demo Environment'].map((item) => <button key={item} className={section === item ? 'settings-active' : ''} onClick={() => setSection(item)}>{item}<ChevronRight size={15} /></button>)}</div><section className="panel settings-panel">{section === 'Profile' && <><div className="settings-title"><div><h2>Profile</h2><p>Manage your CareLoop profile and workspace identity.</p></div><button className="button button-primary"><Check size={16} /> Save changes</button></div><div className="profile-edit"><div className="avatar avatar-large avatar-blue">MR</div><div><strong>Dr. Meera Rao</strong><span>Care Coordinator</span><button className="text-button">Change photo</button></div></div><div className="form-grid"><label className="field-label">Full name<input defaultValue="Dr. Meera Rao" /></label><label className="field-label">Role<input defaultValue="Care Coordinator" /></label><label className="field-label">Email address<input defaultValue="meera.rao@democlinic.example" /></label><label className="field-label">Timezone<select defaultValue="Asia/Kolkata"><option>Asia/Kolkata</option><option>UTC</option></select></label></div></>}{section === 'Reminder Templates' && <TemplateSettings />}{section === 'Demo Environment' && <DemoSettings onReset={onReset} onGenerate={onGenerate} />}{!['Profile', 'Reminder Templates', 'Demo Environment'].includes(section) && <EmptyState title={`${section} settings`} body="This demo section is ready for configuration. No real patient data is stored here." action={<button className="button button-secondary">Review options</button>} />}</section></div></> }
function TemplateSettings() { return <><div className="settings-title"><div><h2>Reminder templates</h2><p>Approved administrative messages your team can reuse.</p></div><button className="button button-primary"><Plus size={16} /> New template</button></div><div className="template-row"><div className="template-icon"><FileText size={18} /></div><div><strong>Standard follow-up reminder</strong><p>Hello {'{{patient_name}}'}, your follow-up appointment is scheduled for {'{{date}}'} at {'{{time}}'}. Please confirm your appointment or request a reschedule.</p><span>Templates require staff approval before use.</span></div><div className="template-actions"><button className="icon-button"><Edit3 size={16} /></button><button className="button button-secondary">Preview</button><button className="button button-primary">Active</button></div></div></> }
function DemoSettings({ onReset, onGenerate }: { onReset: () => void; onGenerate: () => void }) { return <><div className="settings-title"><div><h2>Demo environment</h2><p>All records shown here are fictional and created for demonstration.</p></div><span className="demo-tag"><span className="status-dot" /> DEMO ENVIRONMENT</span></div><div className="demo-callout"><Zap size={19} /><div><strong>Nothing falls through the cracks</strong><p>Explore the end-to-end follow-up workflow without using real patient data.</p></div></div><div className="demo-actions"><button className="button button-secondary" onClick={onReset}><RefreshCw size={16} /> Reset demo data</button><button className="button button-primary" onClick={onGenerate}><ActivityIcon size={16} /> Generate demo activity</button></div></> }

function FollowupDrawer({ patient, communications, onClose, onSendReminder, onConfirm, navigate }: { patient: Patient; communications: Communication[]; onClose: () => void; onSendReminder: (id: string) => void; onConfirm: (id: string) => void; navigate: (route: Route) => void }) { return <div className="drawer-wrap"><button className="drawer-scrim" onClick={onClose} aria-label="Close follow-up drawer" /><aside className="drawer"><div className="drawer-header"><div><span className="eyebrow">FOLLOW-UP RECORD</span><h2>{patient.id}</h2><p>{patient.name} · DEMO PATIENT</p></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="drawer-status"><StatusBadge status={patient.status} /><button className="text-button"><MoreHorizontal size={15} /></button></div><section className="drawer-section"><h3>Appointment</h3><div className="appointment-card"><CalendarDays size={18} /><div><strong>{patient.nextFollowup}</strong><span>{patient.time}</span><small>Demo Clinic · Room 04</small></div></div></section><section className="drawer-section"><h3>Reminder</h3><div className="detail-row"><span>Status</span><strong>{patient.reminder}</strong></div><div className="detail-row"><span>Last sent</span><strong>22 Sep 2026 · 09:32</strong></div></section><section className="drawer-section"><h3>Patient response</h3><div className="response-state"><div className={`response-icon ${patient.response === 'Confirmed' ? 'success' : 'warning'}`}>{patient.response === 'Confirmed' ? <Check size={18} /> : <Clock3 size={18} />}</div><div><strong>{patient.response}</strong><span>Response history is administrative only.</span></div></div></section><section className="drawer-section"><h3>Communication history</h3><ActivityTimeline items={communications.map((item, index) => ({ id: item.id, time: item.sent.split(' · ')[1] ?? item.sent, text: `${item.type} · ${item.response}`, tone: index === 0 ? 'blue' : 'navy' }))} /></section><section className="drawer-section"><h3>Assigned staff</h3><div className="assigned-large"><Avatar initials={patient.assigned === 'Unassigned' ? '?' : patient.assigned.split(' ').map((x) => x[0]).join('')} tone="gray" /><strong>{patient.assigned}</strong><ChevronDown size={15} /></div></section><div className="drawer-footer"><button className="button button-secondary" onClick={() => onSendReminder(patient.id)}><Send size={16} /> Send reminder</button><button className="button button-primary" onClick={() => onConfirm(patient.id)}><Check size={16} /> Mark contacted</button><button className="button button-ghost" onClick={() => { onClose(); navigate('/reschedules') }}>Request reschedule</button></div></aside></div> }

function GlobalSearch({ state, onClose, onSelect, navigate }: { state: AppState; onClose: () => void; onSelect: (patientId: string) => void; navigate: (route: Route) => void }) { const [query, setQuery] = useState(''); const results = query.length > 1 ? state.patients.filter((p) => `${p.id} ${p.name}`.toLowerCase().includes(query.toLowerCase())) : state.patients.slice(0, 3); return <div className="search-backdrop" onClick={onClose}><div className="search-modal" onClick={(event) => event.stopPropagation()}><div className="search-input-wrap"><Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient IDs, appointments, tasks and communications" /><kbd>ESC</kbd></div><div className="search-results"><span className="search-group-label">Patients</span>{results.map((patient) => <button className="search-result" key={patient.id} onClick={() => onSelect(patient.id)}><Avatar initials={patient.initials} /><div><strong>{patient.id}</strong><span>{patient.name} · {patient.nextFollowup}</span></div><ChevronRight size={16} /></button>)}{query.length > 1 && results.length === 0 && <EmptyState title="No search results" body="Try a patient ID, name, or task keyword." />}</div><div className="search-footer"><span><kbd>↑↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><button onClick={() => navigate('/follow-ups')}>View all records <ArrowRight size={14} /></button></div></div></div> }

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) { return <div className="empty-state"><div className="empty-icon"><Inbox size={20} /></div><h3>{title}</h3><p>{body}</p>{action}</div> }
function ToastStack({ toasts }: { toasts: Toast[] }) { return <div className="toast-stack" aria-live="polite">{toasts.map((item) => <div className={`toast ${item.tone === 'error' ? 'toast-error' : ''}`} key={item.id}><div className="toast-icon"><Check size={15} /></div><span>{item.message}</span><button aria-label="Dismiss"><X size={14} /></button></div>)}</div> }

function PatientPortal({ patient, patients, onConfirm, onRequestReschedule, onBack, onSelectPatient }: { patient: Patient; patients: Patient[]; onConfirm: (id: string) => void; onRequestReschedule: (id: string, request: Omit<RescheduleRequest, 'id' | 'patientId' | 'status'>) => void; onBack: () => void; onSelectPatient: (id: string) => void }) { const [requested, setRequested] = useState(false); const [submitted, setSubmitted] = useState(false); const [confirmed, setConfirmed] = useState(patient.response === 'Confirmed'); const [date, setDate] = useState('28 Sep 2026'); const [time, setTime] = useState('Morning'); useEffect(() => { setConfirmed(patient.response === 'Confirmed'); setRequested(false); setSubmitted(false) }, [patient.id]); const handleConfirm = () => { onConfirm(patient.id); setConfirmed(true) }; const handleRequest = () => { onRequestReschedule(patient.id, { currentDate: patient.nextFollowup, currentTime: patient.time, requestedDate: date, requestedTime: time, received: 'Today · Now', message: 'Please move my follow-up to a different time.' }); setSubmitted(true) }; return <div className="portal-shell"><div className="portal-topbar"><button className="portal-brand" onClick={onBack}><img src="/careloop-logo.png" alt="CareLoop" /><span>CARELOOP</span></button><div className="portal-demo"><span className="status-dot" /> DEMO ENVIRONMENT</div><div className="portal-switcher"><span>Viewing as</span><select value={patient.id} onChange={(event) => onSelectPatient(event.target.value)}>{patients.map((p) => <option key={p.id}>{p.id}</option>)}</select></div></div><main className="portal-main"><div className="portal-intro"><span className="eyebrow">YOUR FOLLOW-UP</span><h1>Hello, {patient.name.split(' ')[0]}</h1><p>Review your upcoming appointment and let your care team know what works for you.</p></div>{confirmed ? <div className="portal-success"><div className="success-mark"><Check size={30} /></div><h2>Appointment confirmed</h2><p>Your care team has been notified.</p><div className="portal-appointment compact"><CalendarDays size={19} /><div><strong>{patient.nextFollowup}</strong><span>{patient.time} · Demo Clinic</span></div></div><button className="button button-primary full-button" onClick={onBack}>Return to CareLoop</button></div> : submitted ? <div className="portal-success"><div className="success-mark amber-mark"><Check size={30} /></div><h2>Your request has been sent</h2><p>Your care team will review the requested time and follow up with you.</p><button className="button button-secondary full-button" onClick={() => { setSubmitted(false); setRequested(true) }}>Review appointment</button></div> : <><section className="portal-appointment"><div className="appointment-date"><span>SEP</span><strong>{patient.nextFollowup.split(' ')[0]}</strong><small>2026</small></div><div><span className="appointment-label">UPCOMING APPOINTMENT</span><h2>{patient.nextFollowup}</h2><strong>{patient.time}</strong><p>Demo Clinic · Room 04</p></div><StatusBadge status={patient.status} /></section><p className="portal-message">Please confirm your appointment or request a different time.</p><div className="portal-actions"><button className="button button-primary full-button" onClick={handleConfirm}><CheckCircle2 size={18} /> Confirm appointment</button><button className="button button-secondary full-button" onClick={() => setRequested(true)}><RefreshCw size={18} /> Request a different time</button></div>{requested && !submitted && <div className="portal-request-form"><label className="field-label">Preferred date<input type="text" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="field-label">Preferred time<select value={time} onChange={(event) => setTime(event.target.value)}><option>Morning</option><option>Afternoon</option><option>Any time</option></select></label><button className="button button-primary full-button" onClick={handleRequest}>Submit request</button></div>}</>}</main><footer className="portal-footer"><img src="/careloop-logo.png" alt="" /> CareLoop helps care teams keep administrative follow-ups on track.</footer></div> }

export default App
