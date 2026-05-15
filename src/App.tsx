import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  ListChecks,
  Lock,
  Plus,
  Shield,
  SlidersHorizontal,
  Trash2,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { consultantLoad, daysUntil, isDueSoon, isOverdue } from './lib/metrics'
import { useWorkspaceData } from './lib/useWorkspaceData'
import type { Client, ClientStage, ClientStatus, Priority, Profile, Project, ProjectStatus, Task, TaskStatus, Vertical } from './types/domain'

type Tab = 'dashboard' | 'projetos' | 'tarefas' | 'clientes' | 'desempenho' | 'acesso'
type ProjectView = 'kanban' | 'lista'
type SortKey = 'created_at' | 'updated_at' | 'end_date'

const navItems: Array<[Tab, string, LucideIcon]> = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['projetos', 'Projetos', BriefcaseBusiness],
  ['tarefas', 'Tarefas', ListChecks],
  ['clientes', 'Clientes', Users],
  ['desempenho', 'Desempenho', SlidersHorizontal],
  ['acesso', 'Acesso', Shield],
]

const statusLabels: Record<TaskStatus, string> = {
  a_fazer: 'A fazer',
  em_andamento: 'Em andamento',
  revisao: 'Revisão',
  concluido: 'Concluído',
}

const taskStatuses: TaskStatus[] = ['a_fazer', 'em_andamento', 'revisao', 'concluido']
const verticals: Vertical[] = ['financeiro', 'pessoas', 'vendas', 'marketing', 'processos']
const clientStages: ClientStage[] = ['prospeccao', 'proposta', 'contrato', 'em_andamento', 'encerrado']

function nameById(profiles: Profile[], id: string) {
  return profiles.find((profile) => profile.id === id)?.name ?? 'Sem dono'
}

function clientById(clients: Client[], id: string) {
  return clients.find((client) => client.id === id)?.name ?? 'Cliente removido'
}

function canEditTask(user: Profile, task: Task) {
  return user.role === 'admin' || task.assignee_id === user.id
}

function canEditProject(user: Profile, project: Project) {
  return user.role === 'admin' || project.consultant_id === user.id
}

function projectCanWrite(user: Profile, consultantId: string) {
  return user.role === 'admin' || user.id === consultantId
}

function priorityClass(priority: Priority) {
  return {
    baixa: 'border-slate-200 bg-slate-50 text-slate-600',
    media: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    alta: 'border-amber-200 bg-amber-50 text-amber-800',
    critica: 'border-red-200 bg-red-50 text-red-700',
  }[priority]
}

function dateValue(value?: string) {
  return value ? new Date(value).getTime() : 0
}

export default function App() {
  const data = useWorkspaceData()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [accent, setAccent] = useState('#e30613')

  if (data.mode === 'supabase' && !data.session) return <AuthScreen signIn={data.signIn} accent={accent} />

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
          <div className="grid size-9 place-items-center rounded-lg text-white" style={{ backgroundColor: accent }}>
            <BriefcaseBusiness size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">TeamTasks CRM</p>
            <p className="text-xs text-slate-500">Consultoria interna</p>
          </div>
        </div>

        <nav className="space-y-1 px-4 py-5 text-sm font-medium">
          {navItems.map(([tab, label, Icon]) => (
            <button
              key={tab}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left"
              style={activeTab === tab ? { backgroundColor: accent, color: '#fff' } : { color: '#475569' }}
              onClick={() => setActiveTab(tab)}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 space-y-3 border-t border-slate-200 p-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cor Hex
            <input className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" value={accent} onChange={(event) => setAccent(event.target.value)} />
          </label>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sessão</p>
            <p className="mt-1 text-sm font-semibold">{data.currentUser.name}</p>
            <p className="text-xs text-slate-500">{data.currentUser.role === 'admin' ? 'Admin' : data.currentUser.vertical}</p>
          </div>
        </div>
      </aside>

      <section className="lg:pl-72">
        <Header data={data} activeTab={activeTab} accent={accent} setActiveTab={setActiveTab} />
        <div className="p-4 md:p-8">
          {activeTab === 'dashboard' && <Dashboard data={data} accent={accent} />}
          {activeTab === 'projetos' && <ProjectsTab data={data} accent={accent} />}
          {activeTab === 'tarefas' && <TasksTab data={data} accent={accent} />}
          {activeTab === 'clientes' && <ClientsTab data={data} accent={accent} />}
          {activeTab === 'desempenho' && <PerformanceTab data={data} accent={accent} />}
          {activeTab === 'acesso' && <AccessTab data={data} accent={accent} />}
        </div>
      </section>
    </main>
  )
}

function Header({ data, activeTab, accent, setActiveTab }: { data: ReturnType<typeof useWorkspaceData>; activeTab: Tab; accent: string; setActiveTab: (tab: Tab) => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
      <div className="flex h-16 items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{navItems.find(([tab]) => tab === activeTab)?.[1]}</h1>
          <p className="text-xs text-slate-500">{data.loading ? 'Carregando dados' : data.mode === 'supabase' ? 'Supabase conectado' : 'Modo demo sem variáveis'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700">
            <Bell size={17} />
            <span className="absolute right-2 top-2 size-2 rounded-full" style={{ backgroundColor: accent }} />
          </button>
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm md:flex">
            <Shield size={16} />
            {data.currentUser.role === 'admin' ? 'Permissão total' : 'Edição restrita'}
          </div>
          {data.mode === 'supabase' && (
            <button className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" onClick={() => void data.signOut()}>
              Sair
            </button>
          )}
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-3 lg:hidden">
        {navItems.map(([tab, label]) => (
          <button key={tab} className="shrink-0 rounded-lg px-3 py-2 text-sm" style={activeTab === tab ? { backgroundColor: accent, color: '#fff' } : { backgroundColor: '#f1f5f9' }} onClick={() => setActiveTab(tab)}>
            {label}
          </button>
        ))}
      </nav>
    </header>
  )
}

function Dashboard({ data, accent }: { data: ReturnType<typeof useWorkspaceData>; accent: string }) {
  const overdueTasks = data.tasks.filter(isOverdue)
  const soonTasks = data.tasks.filter(isDueSoon)
  const loads = consultantLoad(data.profiles, data.projects, data.tasks)
  const openTasks = data.tasks.filter((task) => task.status !== 'concluido')
  const doneTasks = data.tasks.filter((task) => task.status === 'concluido')
  const projectRisks = data.projects.filter((project) => data.tasks.some((task) => task.project_id === project.id && isOverdue(task)))
  const notifications = [
    ...overdueTasks.map((task) => ({ kind: 'Atrasada', task })),
    ...soonTasks.map((task) => ({ kind: daysUntil(task.due_date) === 0 ? 'Vence hoje' : 'D-2', task })),
  ]

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {([
          ['Projetos ativos', data.projects.filter((project) => project.status !== 'encerrado').length, BriefcaseBusiness],
          ['Tarefas abertas', openTasks.length, Clock3],
          ['Em risco', projectRisks.length, AlertTriangle],
          ['Concluídas', doneTasks.length, CheckCircle2],
        ] as Array<[string, number, LucideIcon]>).map(([label, value, Icon]) => (
          <article key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{label}</p>
              <Icon className="text-slate-500" size={18} />
            </div>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-base font-semibold">Projetos em andamento</h2>
            <p className="text-sm text-slate-500">Todos veem tudo</p>
          </div>
          <ProjectTable data={data} projects={data.projects.slice(0, 6)} />
        </article>
        <aside className="space-y-6">
          <Card title="Sino interno" icon={Bell}>
            <div className="space-y-3">
              {notifications.slice(0, 5).map(({ kind, task }) => (
                <div key={`${kind}-${task.id}`} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{task.title}</p>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs">{kind}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{task.due_date} · {nameById(data.profiles, task.assignee_id)}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Carga por consultor">
            <LoadBars loads={loads} accent={accent} />
          </Card>
        </aside>
      </section>
    </div>
  )
}

function ProjectsTab({ data, accent }: { data: ReturnType<typeof useWorkspaceData>; accent: string }) {
  const [view, setView] = useState<ProjectView>('kanban')
  const [selectedProjectId, setSelectedProjectId] = useState(data.projects[0]?.id ?? '')
  const [sort, setSort] = useState<SortKey>('updated_at')
  const [cardTitle, setCardTitle] = useState('')
  const [columnTitle, setColumnTitle] = useState('')
  const [projectForm, setProjectForm] = useState({
    name: '',
    client_id: data.clients[0]?.id ?? '',
    consultant_id: data.currentUser.role === 'admin' ? data.profiles.find((profile) => profile.role === 'consultant')?.id ?? data.currentUser.id : data.currentUser.id,
    vertical: data.currentUser.vertical,
    status: 'planejado' as ProjectStatus,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
  })
  const selectedProject = data.projects.find((project) => project.id === selectedProjectId) ?? data.projects[0]
  const columns = data.kanbanColumns.filter((column) => column.project_id === selectedProject?.id).sort((a, b) => a.position - b.position)
  const sortedProjects = [...data.projects].sort((a, b) => dateValue(b[sort]) - dateValue(a[sort]))

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!projectCanWrite(data.currentUser, projectForm.consultant_id)) return
    await data.createProject(projectForm)
    setProjectForm((form) => ({ ...form, name: '' }))
  }

  async function submitColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedProject || !columnTitle.trim()) return
    await data.createColumn(selectedProject.id, columnTitle.trim())
    setColumnTitle('')
  }

  async function submitCard(event: FormEvent<HTMLFormElement>, columnId: string) {
    event.preventDefault()
    if (!selectedProject || !cardTitle.trim()) return
    await data.createTask({
      project_id: selectedProject.id,
      title: cardTitle.trim(),
      description: '',
      assignee_id: selectedProject.consultant_id,
      priority: 'media',
      status: 'a_fazer',
      column_id: columnId,
      due_date: new Date().toISOString().slice(0, 10),
    })
    setCardTitle('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['kanban', 'lista'] as const).map((item) => (
            <button key={item} className="rounded-lg px-3 py-2 text-sm" style={view === item ? { backgroundColor: accent, color: '#fff' } : { backgroundColor: '#f1f5f9' }} onClick={() => setView(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select className="h-10 rounded-lg border border-slate-200 px-3 text-sm" value={selectedProject?.id ?? ''} onChange={(event) => setSelectedProjectId(event.target.value)}>
            {data.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select className="h-10 rounded-lg border border-slate-200 px-3 text-sm" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="updated_at">Última atualização</option>
            <option value="created_at">Criação</option>
            <option value="end_date">Prazo</option>
          </select>
        </div>
      </div>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr_auto]" onSubmit={submitProject}>
        <input className="h-10 rounded-lg border border-slate-200 px-3 text-sm" placeholder="Novo projeto" value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} required />
        <select className="h-10 rounded-lg border border-slate-200 px-3 text-sm" value={projectForm.client_id} onChange={(event) => setProjectForm({ ...projectForm, client_id: event.target.value })}>
          {data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        <select className="h-10 rounded-lg border border-slate-200 px-3 text-sm" value={projectForm.consultant_id} onChange={(event) => setProjectForm({ ...projectForm, consultant_id: event.target.value })}>
          {data.profiles.filter((profile) => profile.role === 'consultant').map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
        </select>
        <select className="h-10 rounded-lg border border-slate-200 px-3 text-sm" value={projectForm.vertical} onChange={(event) => setProjectForm({ ...projectForm, vertical: event.target.value as Vertical })}>
          {verticals.map((vertical) => <option key={vertical} value={vertical}>{vertical}</option>)}
        </select>
        <input className="h-10 rounded-lg border border-slate-200 px-3 text-sm" type="date" value={projectForm.start_date} onChange={(event) => setProjectForm({ ...projectForm, start_date: event.target.value })} />
        <input className="h-10 rounded-lg border border-slate-200 px-3 text-sm" type="date" value={projectForm.end_date} onChange={(event) => setProjectForm({ ...projectForm, end_date: event.target.value })} />
        <AccentButton accent={accent} label="Criar" icon={Plus} />
      </form>

      {view === 'lista' && (
        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <ProjectTable data={data} projects={sortedProjects} onDelete={data.deleteProject} />
        </article>
      )}

      {view === 'kanban' && selectedProject && (
        <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{selectedProject.name}</h2>
              <p className="text-sm text-slate-500">{clientById(data.clients, selectedProject.client_id)} · {nameById(data.profiles, selectedProject.consultant_id)}</p>
            </div>
            {!canEditProject(data.currentUser, selectedProject) && <span className="inline-flex items-center gap-2 text-sm text-slate-500"><Lock size={15} /> somente leitura</span>}
          </div>
          <div className="flex min-h-[520px] gap-4">
            {columns.map((column) => (
              <div key={column.id} className="w-80 shrink-0 rounded-lg bg-slate-50 p-3" onDragOver={(event) => event.preventDefault()} onDrop={(event) => void data.moveTaskToColumn(event.dataTransfer.getData('task-id'), column.id)}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{column.title}</h3>
                  {canEditProject(data.currentUser, selectedProject) && (
                    <button className="grid size-8 place-items-center rounded-md hover:bg-white" onClick={() => void data.deleteColumn(column.id)}><Trash2 size={15} /></button>
                  )}
                </div>
                <div className="space-y-3">
                  {data.tasks.filter((task) => task.project_id === selectedProject.id && task.column_id === column.id).map((task) => (
                    <TaskCard key={task.id} data={data} task={task} accent={accent} draggable />
                  ))}
                </div>
                {canEditProject(data.currentUser, selectedProject) && (
                  <form className="mt-3 flex gap-2" onSubmit={(event) => void submitCard(event, column.id)}>
                    <input className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm" placeholder="Novo card" value={cardTitle} onChange={(event) => setCardTitle(event.target.value)} />
                    <button className="grid size-10 place-items-center rounded-lg text-white" style={{ backgroundColor: accent }}><Plus size={16} /></button>
                  </form>
                )}
              </div>
            ))}
            {canEditProject(data.currentUser, selectedProject) && (
              <form className="w-72 shrink-0 rounded-lg border border-dashed border-slate-300 bg-white p-3" onSubmit={submitColumn}>
                <input className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Nova fila" value={columnTitle} onChange={(event) => setColumnTitle(event.target.value)} />
                <button className="mt-2 h-10 w-full rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: accent }}>Criar fila</button>
              </form>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function TasksTab({ data, accent }: { data: ReturnType<typeof useWorkspaceData>; accent: string }) {
  const [projectId, setProjectId] = useState(data.projects[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const project = data.projects.find((item) => item.id === projectId)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!project || !title.trim()) return
    await data.createTask({
      project_id: project.id,
      title,
      description: '',
      assignee_id: project.consultant_id,
      priority: 'media',
      status: 'a_fazer',
      column_id: data.kanbanColumns.find((column) => column.project_id === project.id)?.id,
      due_date: new Date().toISOString().slice(0, 10),
    })
    setTitle('')
  }

  return (
    <div className="space-y-6">
      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]" onSubmit={submit}>
        <select className="h-10 rounded-lg border border-slate-200 px-3 text-sm" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          {data.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <input className="h-10 rounded-lg border border-slate-200 px-3 text-sm" placeholder="Nova tarefa" value={title} onChange={(event) => setTitle(event.target.value)} />
        <AccentButton accent={accent} label="Criar" icon={Plus} />
      </form>
      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {data.tasks.map((task) => (
            <div key={task.id} className="grid gap-3 p-5 text-sm md:grid-cols-[1fr_130px_130px_150px_80px] md:items-center">
              <div>
                <p className="font-semibold">{task.title}</p>
                <p className="text-slate-500">{clientById(data.clients, data.projects.find((projectItem) => projectItem.id === task.project_id)?.client_id ?? '')}</p>
              </div>
              <span className={`w-fit rounded-md border px-2 py-1 text-xs font-semibold ${priorityClass(task.priority)}`}>{task.priority}</span>
              <span className={isOverdue(task) ? 'font-semibold text-red-600' : 'text-slate-500'}>{task.due_date}</span>
              <select disabled={!canEditTask(data.currentUser, task)} className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs disabled:opacity-50" value={task.status} onChange={(event) => void data.updateTaskStatus(task.id, event.target.value as TaskStatus)}>
                {taskStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
              </select>
              {canEditTask(data.currentUser, task) && <button className="grid size-9 place-items-center rounded-md hover:bg-slate-100" onClick={() => void data.deleteTask(task.id)}><Trash2 size={16} /></button>}
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}

function ClientsTab({ data, accent }: { data: ReturnType<typeof useWorkspaceData>; accent: string }) {
  const [form, setForm] = useState({ name: '', segment: '', stage: 'prospeccao' as ClientStage, status: 'lead' as ClientStatus, owner_id: data.currentUser.id })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await data.createClient(form)
    setForm({ ...form, name: '', segment: '' })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submit}>
        <h2 className="text-base font-semibold">Novo cliente</h2>
        <div className="mt-4 space-y-3">
          <input className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Razão social" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <input className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Segmento" value={form.segment} onChange={(event) => setForm({ ...form, segment: event.target.value })} required />
          <select className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as ClientStage })}>
            {clientStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
          </select>
          <select className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" value={form.owner_id} onChange={(event) => setForm({ ...form, owner_id: event.target.value })}>
            {data.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select>
          <AccentButton accent={accent} label="Cadastrar" icon={Plus} wide />
        </div>
      </form>
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">Pipeline CRM</h2>
        <div className="mt-5 space-y-3">
          {data.clients.map((client) => (
            <div key={client.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
              <div>
                <p className="font-semibold">{client.name}</p>
                <p className="text-sm text-slate-500">{client.segment} · {client.status} · {nameById(data.profiles, client.owner_id)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">{client.stage.replaceAll('_', ' ')}</span>
                {(data.currentUser.role === 'admin' || data.currentUser.id === client.owner_id) && <button className="grid size-9 place-items-center rounded-md hover:bg-slate-100" onClick={() => void data.deleteClient(client.id)}><Trash2 size={16} /></button>}
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}

function PerformanceTab({ data, accent }: { data: ReturnType<typeof useWorkspaceData>; accent: string }) {
  const loads = consultantLoad(data.profiles, data.projects, data.tasks)
  return (
    <div className="space-y-6">
      <Card title="Carga e performance">
        <LoadBars loads={loads} accent={accent} />
      </Card>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {loads.map((load) => (
          <article key={load.profile.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="font-semibold">{load.profile.name}</p>
            <p className="text-sm capitalize text-slate-500">{load.profile.vertical}</p>
            <div className="mt-4 space-y-2 text-sm">
              <p className="flex justify-between"><span>Abertas</span><strong>{load.openTasks}</strong></p>
              <p className="flex justify-between"><span>Concluídas</span><strong>{load.doneTasks}</strong></p>
              <p className="flex justify-between"><span>No prazo</span><strong>{load.onTimeRate}%</strong></p>
              <p className="flex justify-between"><span>Média</span><strong>{load.avgCompletion}d</strong></p>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

function AccessTab({ data, accent }: { data: ReturnType<typeof useWorkspaceData>; accent: string }) {
  return (
    <Card title="Controle de acesso" icon={Shield}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.profiles.map((profile) => (
          <div key={profile.id} className="rounded-lg border border-slate-200 p-4">
            <p className="font-semibold">{profile.name}</p>
            <p className="text-sm capitalize text-slate-500">{profile.role} · {profile.vertical}</p>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full" style={{ width: profile.role === 'admin' ? '100%' : '55%', backgroundColor: accent }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ProjectTable({ data, projects, onDelete }: { data: ReturnType<typeof useWorkspaceData>; projects: Project[]; onDelete?: (id: string) => Promise<void> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">Projeto</th>
            <th className="px-5 py-3">Cliente</th>
            <th className="px-5 py-3">Consultor</th>
            <th className="px-5 py-3">Vertical</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Criado</th>
            <th className="px-5 py-3">Atualizado</th>
            <th className="px-5 py-3">Prazo</th>
            <th className="px-5 py-3">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {projects.map((project) => {
            const risky = data.tasks.some((task) => task.project_id === project.id && isOverdue(task))
            return (
              <tr key={project.id} className={risky ? 'bg-red-50/60' : 'bg-white'}>
                <td className="px-5 py-4 font-medium">{project.name}</td>
                <td className="px-5 py-4 text-slate-600">{clientById(data.clients, project.client_id)}</td>
                <td className="px-5 py-4 text-slate-600">{nameById(data.profiles, project.consultant_id)}</td>
                <td className="px-5 py-4 capitalize text-slate-600">{project.vertical}</td>
                <td className="px-5 py-4"><span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">{risky ? 'em risco' : project.status.replaceAll('_', ' ')}</span></td>
                <td className="px-5 py-4 text-slate-600">{project.created_at?.slice(0, 10) ?? '-'}</td>
                <td className="px-5 py-4 text-slate-600">{project.updated_at?.slice(0, 10) ?? '-'}</td>
                <td className="px-5 py-4 text-slate-600">{project.end_date}</td>
                <td className="px-5 py-4 text-slate-600">
                  {onDelete && canEditProject(data.currentUser, project) ? <button className="grid size-9 place-items-center rounded-md hover:bg-slate-100" onClick={() => void onDelete(project.id)}><Trash2 size={16} /></button> : canEditProject(data.currentUser, project) ? 'editar' : <Lock size={15} />}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TaskCard({ data, task, accent, draggable }: { data: ReturnType<typeof useWorkspaceData>; task: Task; accent: string; draggable?: boolean }) {
  return (
    <article draggable={draggable} onDragStart={(event) => event.dataTransfer.setData('task-id', task.id)} className={`rounded-lg border bg-white p-4 shadow-sm ${isOverdue(task) ? 'border-red-300' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold">{task.title}</h4>
        {isOverdue(task) && <AlertTriangle className="shrink-0 text-red-600" size={16} />}
      </div>
      <p className="mt-2 text-sm text-slate-500">{task.description || 'Sem descrição'}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${priorityClass(task.priority)}`}>{task.priority}</span>
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"><CalendarDays size={13} /> {task.due_date}</span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-500">{nameById(data.profiles, task.assignee_id)}</span>
        {canEditTask(data.currentUser, task) && <button className="grid size-8 place-items-center rounded-md hover:bg-slate-100" onClick={() => void data.deleteTask(task.id)}><Trash2 size={15} color={accent} /></button>}
      </div>
    </article>
  )
}

function LoadBars({ loads, accent }: { loads: ReturnType<typeof consultantLoad>; accent: string }) {
  return (
    <div className="space-y-4">
      {loads.map((load) => (
        <div key={load.profile.id}>
          <div className="flex justify-between text-sm">
            <span className="font-medium">{load.profile.name}</span>
            <span className="text-slate-500">{load.openTasks} tarefas</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full" style={{ width: `${Math.min(100, load.openTasks * 18)}%`, backgroundColor: accent }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Card({ title, icon: Icon, children }: { title: string; icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {Icon && <Icon size={18} />}
      </div>
      {children}
    </article>
  )
}

function AccentButton({ accent, label, icon: Icon, wide }: { accent: string; label: string; icon: LucideIcon; wide?: boolean }) {
  return (
    <button className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white ${wide ? 'w-full' : ''}`} style={{ backgroundColor: accent }}>
      <Icon size={16} />
      {label}
    </button>
  )
}

function AuthScreen({ signIn, accent }: { signIn: (email: string, password: string) => Promise<void>; accent: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login')
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7f9] p-4">
      <form className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm" onSubmit={submit}>
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg text-white" style={{ backgroundColor: accent }}>
            <BriefcaseBusiness size={18} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">TeamTasks CRM</h1>
            <p className="text-sm text-slate-500">Acesso interno</p>
          </div>
        </div>
        <label className="text-sm font-medium">
          Email
          <input className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="mt-4 block text-sm font-medium">
          Senha
          <input className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button className="mt-6 h-11 w-full rounded-lg px-4 text-sm font-semibold text-white" style={{ backgroundColor: accent }} type="submit">
          Entrar
        </button>
      </form>
    </main>
  )
}
