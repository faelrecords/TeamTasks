import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { attachments as demoAttachments, checklists as demoChecklists, clients as demoClients, comments as demoComments, kanbanColumns as demoKanbanColumns, profiles as demoProfiles, projects as demoProjects, tasks as demoTasks } from './mockData'
import { hasSupabaseConfig, supabase } from './supabase'
import type { Attachment, Checklist, Client, Comment, KanbanColumn, Profile, Project, Task } from '../types/domain'

type WorkspaceData = {
  profiles: Profile[]
  clients: Client[]
  projects: Project[]
  kanbanColumns: KanbanColumn[]
  tasks: Task[]
  checklists: Checklist[]
  comments: Comment[]
  attachments: Attachment[]
  currentUser: Profile
  loading: boolean
  mode: 'supabase' | 'demo'
  session: Session | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  createClient: (input: Pick<Client, 'name' | 'segment' | 'stage' | 'status' | 'owner_id'>) => Promise<void>
  deleteClient: (id: string) => Promise<void>
  createProject: (input: Pick<Project, 'name' | 'client_id' | 'consultant_id' | 'vertical' | 'status' | 'start_date' | 'end_date'>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  createColumn: (projectId: string, title: string) => Promise<void>
  deleteColumn: (id: string) => Promise<void>
  createTask: (input: Pick<Task, 'project_id' | 'title' | 'description' | 'assignee_id' | 'priority' | 'status' | 'due_date'> & { column_id?: string | null }) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  moveTaskToColumn: (taskId: string, columnId: string) => Promise<void>
  updateTaskStatus: (taskId: string, status: Task['status']) => Promise<void>
}

export function useWorkspaceData(): WorkspaceData {
  const [profiles, setProfiles] = useState<Profile[]>(demoProfiles)
  const [clients, setClients] = useState<Client[]>(demoClients)
  const [projects, setProjects] = useState<Project[]>(demoProjects)
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>(demoKanbanColumns)
  const [tasks, setTasks] = useState<Task[]>(demoTasks)
  const [checklists, setChecklists] = useState<Checklist[]>(demoChecklists)
  const [comments, setComments] = useState<Comment[]>(demoComments)
  const [attachments, setAttachments] = useState<Attachment[]>(demoAttachments)
  const [currentUser, setCurrentUser] = useState<Profile>(demoProfiles[0])
  const [loading, setLoading] = useState(hasSupabaseConfig)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!supabase) return

    async function load() {
      setLoading(true)
      const { data: sessionData } = await supabase!.auth.getSession()
      setSession(sessionData.session)
      if (!sessionData.session) {
        setLoading(false)
        return
      }

      const { data: auth } = await supabase!.auth.getUser()
      const [profilesResult, clientsResult, projectsResult, columnsResult, tasksResult, checklistsResult, commentsResult, attachmentsResult] = await Promise.all([
        supabase!.from('profiles').select('*').order('name'),
        supabase!.from('clients').select('*').order('created_at', { ascending: false }),
        supabase!.from('projects').select('*').order('end_date'),
        supabase!.from('kanban_columns').select('*').order('position'),
        supabase!.from('tasks').select('*').order('due_date'),
        supabase!.from('checklists').select('*'),
        supabase!.from('comments').select('*').order('created_at', { ascending: false }).limit(30),
        supabase!.from('attachments').select('*').order('created_at', { ascending: false }),
      ])

      if (profilesResult.data?.length) {
        setProfiles(profilesResult.data)
        setCurrentUser(profilesResult.data.find((profile) => profile.id === auth.user?.id) ?? profilesResult.data[0])
      }
      if (clientsResult.data) setClients(clientsResult.data)
      if (projectsResult.data) setProjects(projectsResult.data)
      if (columnsResult.data) setKanbanColumns(columnsResult.data)
      if (tasksResult.data) setTasks(tasksResult.data)
      if (checklistsResult.data) setChecklists(checklistsResult.data)
      if (commentsResult.data) setComments(commentsResult.data)
      if (attachmentsResult.data) setAttachments(attachmentsResult.data)
      setLoading(false)
    }

    void load()

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) void load()
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!supabase) return
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null)
  }

  const today = () => new Date().toISOString().slice(0, 10)
  const id = () => crypto.randomUUID()

  const createClient = async (input: Pick<Client, 'name' | 'segment' | 'stage' | 'status' | 'owner_id'>) => {
    if (supabase) {
      const { data, error } = await supabase.from('clients').insert(input).select().single()
      if (error) throw error
      setClients((items) => [data, ...items])
      return
    }
    setClients((items) => [{ ...input, id: id(), created_at: today() }, ...items])
  }

  const deleteClient = async (clientId: string) => {
    setClients((items) => items.filter((client) => client.id !== clientId))
    if (supabase) {
      const { error } = await supabase.from('clients').delete().eq('id', clientId)
      if (error) throw error
    }
  }

  const createProject = async (input: Pick<Project, 'name' | 'client_id' | 'consultant_id' | 'vertical' | 'status' | 'start_date' | 'end_date'>) => {
    if (supabase) {
      const { data, error } = await supabase.from('projects').insert(input).select().single()
      if (error) throw error
      setProjects((items) => [data, ...items])
      const defaults = ['A fazer', 'Em andamento', 'Revisão', 'Concluído'].map((title, index) => ({ project_id: data.id, title, position: index + 1 }))
      const columnsResult = await supabase.from('kanban_columns').insert(defaults).select()
      if (columnsResult.error) throw columnsResult.error
      setKanbanColumns((items) => [...items, ...(columnsResult.data ?? [])])
      return
    }
    const project = { ...input, id: id(), created_at: today(), updated_at: today() }
    setProjects((items) => [project, ...items])
    setKanbanColumns((items) => [
      ...items,
      ...['A fazer', 'Em andamento', 'Revisão', 'Concluído'].map((title, index) => ({
        id: id(),
        project_id: project.id,
        title,
        position: index + 1,
        created_at: today(),
        updated_at: today(),
      })),
    ])
  }

  const deleteProject = async (projectId: string) => {
    setProjects((items) => items.filter((project) => project.id !== projectId))
    setTasks((items) => items.filter((task) => task.project_id !== projectId))
    setKanbanColumns((items) => items.filter((column) => column.project_id !== projectId))
    if (supabase) {
      const { error } = await supabase.from('projects').delete().eq('id', projectId)
      if (error) throw error
    }
  }

  const createColumn = async (projectId: string, title: string) => {
    const position = kanbanColumns.filter((column) => column.project_id === projectId).length + 1
    if (supabase) {
      const { data, error } = await supabase.from('kanban_columns').insert({ project_id: projectId, title, position }).select().single()
      if (error) throw error
      setKanbanColumns((items) => [...items, data])
      return
    }
    setKanbanColumns((items) => [...items, { id: id(), project_id: projectId, title, position, created_at: today(), updated_at: today() }])
  }

  const deleteColumn = async (columnId: string) => {
    setKanbanColumns((items) => items.filter((column) => column.id !== columnId))
    setTasks((items) => items.map((task) => (task.column_id === columnId ? { ...task, column_id: null } : task)))
    if (supabase) {
      const { error } = await supabase.from('kanban_columns').delete().eq('id', columnId)
      if (error) throw error
    }
  }

  const createTask = async (input: Pick<Task, 'project_id' | 'title' | 'description' | 'assignee_id' | 'priority' | 'status' | 'due_date'> & { column_id?: string | null }) => {
    if (supabase) {
      const { data, error } = await supabase.from('tasks').insert(input).select().single()
      if (error) throw error
      setTasks((items) => [data, ...items])
      return
    }
    setTasks((items) => [{ ...input, id: id(), created_at: today(), updated_at: today(), completed_at: null }, ...items])
  }

  const deleteTask = async (taskId: string) => {
    setTasks((items) => items.filter((task) => task.id !== taskId))
    if (supabase) {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) throw error
    }
  }

  const moveTaskToColumn = async (taskId: string, columnId: string) => {
    setTasks((items) => items.map((task) => (task.id === taskId ? { ...task, column_id: columnId, updated_at: today() } : task)))
    if (supabase) {
      const { error } = await supabase.from('tasks').update({ column_id: columnId }).eq('id', taskId)
      if (error) throw error
    }
  }

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    const completed_at = status === 'concluido' ? new Date().toISOString().slice(0, 10) : null
    setTasks((items) => items.map((task) => (task.id === taskId ? { ...task, status, completed_at, updated_at: today() } : task)))

    if (supabase) {
      const { error } = await supabase.from('tasks').update({ status, completed_at }).eq('id', taskId)
      if (error) throw error
    }
  }

  return {
    profiles,
    clients,
    projects,
    kanbanColumns,
    tasks,
    checklists,
    comments,
    attachments,
    currentUser,
    loading,
    mode: hasSupabaseConfig ? 'supabase' : 'demo',
    session,
    signIn,
    signOut,
    createClient,
    deleteClient,
    createProject,
    deleteProject,
    createColumn,
    deleteColumn,
    createTask,
    deleteTask,
    moveTaskToColumn,
    updateTaskStatus,
  }
}
