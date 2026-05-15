export type Role = 'admin' | 'consultant'
export type Vertical = 'financeiro' | 'pessoas' | 'vendas' | 'marketing' | 'processos'
export type ClientStage = 'prospeccao' | 'proposta' | 'contrato' | 'em_andamento' | 'encerrado'
export type ClientStatus = 'lead' | 'ativo' | 'encerrado'
export type ProjectStatus = 'planejado' | 'em_andamento' | 'em_risco' | 'encerrado'
export type TaskStatus = 'a_fazer' | 'em_andamento' | 'revisao' | 'concluido'
export type Priority = 'baixa' | 'media' | 'alta' | 'critica'

export type Profile = {
  id: string
  name: string
  role: Role
  vertical: Vertical
}

export type Client = {
  id: string
  name: string
  segment: string
  stage: ClientStage
  status: ClientStatus
  owner_id: string
  created_at: string
}

export type Project = {
  id: string
  client_id: string
  consultant_id: string
  vertical: Vertical
  name: string
  status: ProjectStatus
  start_date: string
  end_date: string
  created_at?: string
  updated_at?: string
}

export type KanbanColumn = {
  id: string
  project_id: string
  title: string
  position: number
  created_at?: string
  updated_at?: string
}

export type Task = {
  id: string
  project_id: string
  title: string
  description: string
  assignee_id: string
  priority: Priority
  status: TaskStatus
  column_id?: string | null
  due_date: string
  created_at: string
  updated_at?: string
  completed_at: string | null
}

export type Checklist = {
  id: string
  task_id: string
  item: string
  done: boolean
}

export type Comment = {
  id: string
  task_id: string
  user_id: string
  body: string
  created_at: string
}

export type Attachment = {
  id: string
  task_id: string
  storage_path: string
  uploaded_by: string
  created_at: string
}
