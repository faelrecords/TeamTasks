import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Paperclip,
  LayoutDashboard,
  ListChecks,
  Lock,
  Shield,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { consultantLoad, daysUntil, isDueSoon, isOverdue } from './lib/metrics'
import { useWorkspaceData } from './lib/useWorkspaceData'
import type { Client, Profile, Project, Task, TaskStatus } from './types/domain'

const statusLabels: Record<TaskStatus, string> = {
  a_fazer: 'A fazer',
  em_andamento: 'Em andamento',
  revisao: 'Revisão',
  concluido: 'Concluído',
}

const columns: TaskStatus[] = ['a_fazer', 'em_andamento', 'revisao', 'concluido']
const navItems: Array<[string, LucideIcon]> = [
  ['Dashboard geral', LayoutDashboard],
  ['Projetos', BriefcaseBusiness],
  ['Tarefas', ListChecks],
  ['Clientes', Users],
  ['Desempenho', SlidersHorizontal],
  ['Acesso', Shield],
]

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

function priorityClass(priority: Task['priority']) {
  return {
    baixa: 'border-slate-200 bg-slate-50 text-slate-600',
    media: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    alta: 'border-amber-200 bg-amber-50 text-amber-800',
    critica: 'border-red-200 bg-red-50 text-red-700',
  }[priority]
}

export default function App() {
  const { profiles, clients, projects, tasks, checklists, comments, attachments, currentUser, loading, mode, session, signIn, signOut, updateTaskStatus } = useWorkspaceData()
  const [selectedConsultant, setSelectedConsultant] = useState('todos')
  const [selectedProject, setSelectedProject] = useState(projects[0]?.id ?? '')
  const [view, setView] = useState<'kanban' | 'lista' | 'calendario'>('kanban')

  const selectedProjectData = projects.find((project) => project.id === selectedProject) ?? projects[0]
  const filteredProjects = selectedConsultant === 'todos' ? projects : projects.filter((project) => project.consultant_id === selectedConsultant)
  const selectedTasks = tasks.filter((task) => task.project_id === selectedProjectData?.id)
  const overdueTasks = tasks.filter(isOverdue)
  const soonTasks = tasks.filter(isDueSoon)
  const loads = consultantLoad(profiles, projects, tasks)
  const openTasks = tasks.filter((task) => task.status !== 'concluido')
  const doneTasks = tasks.filter((task) => task.status === 'concluido')
  const projectRisks = projects.filter((project) => tasks.some((task) => task.project_id === project.id && isOverdue(task)))

  const notifications = useMemo(
    () => [
      ...overdueTasks.map((task) => ({ kind: 'Atrasada', task })),
      ...soonTasks.map((task) => ({ kind: daysUntil(task.due_date) === 0 ? 'Vence hoje' : 'D-2', task })),
    ],
    [overdueTasks, soonTasks],
  )

  async function moveTask(task: Task, status: TaskStatus) {
    if (!canEditTask(currentUser, task)) return
    await updateTaskStatus(task.id, status)
  }

  if (mode === 'supabase' && !session) {
    return <AuthScreen signIn={signIn} />
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
          <div className="grid size-9 place-items-center rounded-lg bg-slate-950 text-white">
            <BriefcaseBusiness size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">TeamTasks CRM</p>
            <p className="text-xs text-slate-500">Consultoria interna</p>
          </div>
        </div>

        <nav className="space-y-1 px-4 py-5 text-sm font-medium text-slate-600">
          {navItems.map(([label, Icon]) => (
            <a key={String(label)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-100" href={`#${String(label).toLowerCase().replaceAll(' ', '-')}`}>
              <Icon size={17} />
              {label}
            </a>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sessão</p>
            <p className="mt-1 text-sm font-semibold">{currentUser.name}</p>
            <p className="text-xs text-slate-500">{currentUser.role === 'admin' ? 'Admin' : currentUser.vertical}</p>
          </div>
        </div>
      </aside>

      <section className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <div>
            <h1 className="text-lg font-semibold">Operação de consultoria</h1>
            <p className="text-xs text-slate-500">{loading ? 'Carregando dados' : mode === 'supabase' ? 'Supabase conectado' : 'Modo demo sem variáveis'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700">
              <Bell size={17} />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500" />
            </button>
            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm md:flex">
              <Shield size={16} />
              {currentUser.role === 'admin' ? 'Permissão total' : 'Edição restrita'}
            </div>
            {mode === 'supabase' && (
              <button className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" onClick={() => void signOut()}>
                Sair
              </button>
            )}
          </div>
        </header>

        <div className="space-y-6 p-4 md:p-8">
          <section id="dashboard-geral" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {([
              ['Projetos ativos', projects.filter((project) => project.status !== 'encerrado').length, BriefcaseBusiness],
              ['Tarefas abertas', openTasks.length, Clock3],
              ['Em risco', projectRisks.length, AlertTriangle],
              ['Concluídas', doneTasks.length, CheckCircle2],
            ] as Array<[string, number, LucideIcon]>).map(([label, value, Icon]) => (
              <article key={String(label)} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{label}</p>
                  <Icon className="text-slate-500" size={18} />
                </div>
                <p className="mt-3 text-3xl font-semibold">{value}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
            <article className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold">Projetos da consultoria</h2>
                  <p className="text-sm text-slate-500">Visibilidade total, escrita por dono</p>
                </div>
                <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={selectedConsultant} onChange={(event) => setSelectedConsultant(event.target.value)}>
                  <option value="todos">Todos consultores</option>
                  {profiles.filter((profile) => profile.role === 'consultant').map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.name}</option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Projeto</th>
                      <th className="px-5 py-3">Cliente</th>
                      <th className="px-5 py-3">Consultor</th>
                      <th className="px-5 py-3">Vertical</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Prazo</th>
                      <th className="px-5 py-3">Acesso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProjects.map((project) => {
                      const risky = tasks.some((task) => task.project_id === project.id && isOverdue(task))
                      return (
                        <tr key={project.id} className={risky ? 'bg-red-50/60' : 'bg-white'}>
                          <td className="px-5 py-4 font-medium">{project.name}</td>
                          <td className="px-5 py-4 text-slate-600">{clientById(clients, project.client_id)}</td>
                          <td className="px-5 py-4 text-slate-600">{nameById(profiles, project.consultant_id)}</td>
                          <td className="px-5 py-4 capitalize text-slate-600">{project.vertical}</td>
                          <td className="px-5 py-4">
                            <span className={risky ? 'rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700' : 'rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700'}>
                              {risky ? 'em risco' : project.status.replaceAll('_', ' ')}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{project.end_date}</td>
                          <td className="px-5 py-4 text-slate-600">{canEditProject(currentUser, project) ? 'editar' : <Lock size={15} />}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </article>

            <aside className="space-y-6">
              <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">Sino interno</h2>
                  <Bell size={18} />
                </div>
                <div className="mt-4 space-y-3">
                  {notifications.slice(0, 5).map(({ kind, task }) => (
                    <div key={`${kind}-${task.id}`} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{task.title}</p>
                        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs">{kind}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{task.due_date} · {nameById(profiles, task.assignee_id)}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold">Carga por consultor</h2>
                <div className="mt-4 space-y-4">
                  {loads.map((load) => (
                    <div key={load.profile.id}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{load.profile.name}</span>
                        <span className="text-slate-500">{load.openTasks} tarefas</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-slate-900" style={{ width: `${Math.min(100, load.openTasks * 18)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </aside>
          </section>

          <section id="tarefas" className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold">Quadro de tarefas</h2>
                <p className="text-sm text-slate-500">Kanban, lista e calendário</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={selectedProjectData?.id} onChange={(event) => setSelectedProject(event.target.value)}>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {(['kanban', 'lista', 'calendario'] as const).map((item) => (
                    <button key={item} className={`rounded-md px-3 py-2 text-sm ${view === item ? 'bg-white shadow-sm' : 'text-slate-500'}`} onClick={() => setView(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {view === 'kanban' && (
              <div className="grid gap-4 p-5 xl:grid-cols-4">
                {columns.map((column) => (
                  <div key={column} className="rounded-lg bg-slate-50 p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{statusLabels[column]}</h3>
                      <span className="rounded-md bg-white px-2 py-1 text-xs text-slate-500">{selectedTasks.filter((task) => task.status === column).length}</span>
                    </div>
                    <div className="space-y-3">
                      {selectedTasks.filter((task) => task.status === column).map((task) => (
                        <article key={task.id} className={`rounded-lg border bg-white p-4 shadow-sm ${isOverdue(task) ? 'border-red-300' : 'border-slate-200'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm font-semibold">{task.title}</h4>
                            {isOverdue(task) && <AlertTriangle className="shrink-0 text-red-600" size={16} />}
                          </div>
                          <p className="mt-2 text-sm text-slate-500">{task.description}</p>
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${priorityClass(task.priority)}`}>{task.priority}</span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"><CalendarDays size={13} /> {task.due_date}</span>
                          </div>
                          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <ListChecks size={13} />
                              {checklists.filter((item) => item.task_id === task.id && item.done).length}/{checklists.filter((item) => item.task_id === task.id).length}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Paperclip size={13} />
                              {attachments.filter((item) => item.task_id === task.id).length}
                            </span>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs text-slate-500">{nameById(profiles, task.assignee_id)}</span>
                            <select disabled={!canEditTask(currentUser, task)} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs disabled:opacity-50" value={task.status} onChange={(event) => void moveTask(task, event.target.value as TaskStatus)}>
                              {columns.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
                            </select>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {view === 'lista' && (
              <div className="divide-y divide-slate-100">
                {selectedTasks.map((task) => (
                  <div key={task.id} className="grid gap-3 p-5 text-sm md:grid-cols-[1fr_140px_140px_160px] md:items-center">
                    <div>
                      <p className="font-semibold">{task.title}</p>
                      <p className="text-slate-500">{task.description}</p>
                    </div>
                    <span className={`w-fit rounded-md border px-2 py-1 text-xs font-semibold ${priorityClass(task.priority)}`}>{task.priority}</span>
                    <span className={isOverdue(task) ? 'font-semibold text-red-600' : 'text-slate-500'}>{task.due_date}</span>
                    <span className="text-slate-600">{statusLabels[task.status]}</span>
                  </div>
                ))}
              </div>
            )}

            {view === 'calendario' && (
              <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
                {selectedTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{task.due_date}</p>
                    <p className="mt-2 font-semibold">{task.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{statusLabels[task.status]}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="clientes" className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold">Pipeline CRM</h2>
              <div className="mt-5 space-y-3">
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                    <div>
                      <p className="font-semibold">{client.name}</p>
                      <p className="text-sm text-slate-500">{client.segment} · {client.status}</p>
                    </div>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">{client.stage.replaceAll('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold">Histórico de interações</h2>
              <div className="mt-5 space-y-4">
                {comments.map((comment) => {
                  const task = tasks.find((item) => item.id === comment.task_id)
                  return (
                    <div key={comment.id} className="border-l-2 border-slate-900 pl-4">
                      <p className="text-sm font-semibold">{task?.title ?? 'Tarefa removida'}</p>
                      <p className="mt-1 text-sm text-slate-600">{comment.body}</p>
                      <p className="mt-1 text-xs text-slate-500">{nameById(profiles, comment.user_id)} · {new Date(comment.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  )
                })}
              </div>
            </article>
          </section>

          <section id="desempenho" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Dashboard de desempenho</h2>
                <p className="text-sm text-slate-500">Dados calculados por tarefas reais</p>
              </div>
              <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Últimos 90 dias</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {loads.map((load) => (
                <article key={load.profile.id} className="rounded-lg border border-slate-200 p-4">
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
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

function AuthScreen({ signIn }: { signIn: (email: string, password: string) => Promise<void> }) {
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
          <div className="grid size-10 place-items-center rounded-lg bg-slate-950 text-white">
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
        <button className="mt-6 h-11 w-full rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
          Entrar
        </button>
      </form>
    </main>
  )
}
