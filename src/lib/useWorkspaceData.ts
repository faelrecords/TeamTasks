import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { attachments as demoAttachments, checklists as demoChecklists, clients as demoClients, comments as demoComments, profiles as demoProfiles, projects as demoProjects, tasks as demoTasks } from './mockData'
import { hasSupabaseConfig, supabase } from './supabase'
import type { Attachment, Checklist, Client, Comment, Profile, Project, Task } from '../types/domain'

type WorkspaceData = {
  profiles: Profile[]
  clients: Client[]
  projects: Project[]
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
  updateTaskStatus: (taskId: string, status: Task['status']) => Promise<void>
}

export function useWorkspaceData(): WorkspaceData {
  const [profiles, setProfiles] = useState<Profile[]>(demoProfiles)
  const [clients, setClients] = useState<Client[]>(demoClients)
  const [projects, setProjects] = useState<Project[]>(demoProjects)
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
      const [profilesResult, clientsResult, projectsResult, tasksResult, checklistsResult, commentsResult, attachmentsResult] = await Promise.all([
        supabase!.from('profiles').select('*').order('name'),
        supabase!.from('clients').select('*').order('created_at', { ascending: false }),
        supabase!.from('projects').select('*').order('end_date'),
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

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    const completed_at = status === 'concluido' ? new Date().toISOString().slice(0, 10) : null
    setTasks((items) => items.map((task) => (task.id === taskId ? { ...task, status, completed_at } : task)))

    if (supabase) {
      const { error } = await supabase.from('tasks').update({ status, completed_at }).eq('id', taskId)
      if (error) throw error
    }
  }

  return useMemo(
    () => ({
      profiles,
      clients,
      projects,
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
      updateTaskStatus,
    }),
    [profiles, clients, projects, tasks, checklists, comments, attachments, currentUser, loading, session],
  )
}
