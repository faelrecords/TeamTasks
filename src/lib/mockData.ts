import type { Attachment, Checklist, Client, Comment, Profile, Project, Task } from '../types/domain'

export const profiles: Profile[] = [
  { id: 'u-admin', name: 'Marina Alves', role: 'admin', vertical: 'processos' },
  { id: 'u-fin', name: 'Rafael Costa', role: 'consultant', vertical: 'financeiro' },
  { id: 'u-pes', name: 'Bianca Torres', role: 'consultant', vertical: 'pessoas' },
  { id: 'u-ven', name: 'Caio Mendes', role: 'consultant', vertical: 'vendas' },
  { id: 'u-mar', name: 'Nina Rocha', role: 'consultant', vertical: 'marketing' },
  { id: 'u-pro', name: 'Igor Lima', role: 'consultant', vertical: 'processos' },
]

export const clients: Client[] = [
  { id: 'c-1', name: 'Atlas Foods', segment: 'Alimentos', stage: 'em_andamento', status: 'ativo', owner_id: 'u-pro', created_at: '2026-01-12' },
  { id: 'c-2', name: 'Clínica Nexo', segment: 'Saúde', stage: 'contrato', status: 'ativo', owner_id: 'u-fin', created_at: '2026-02-04' },
  { id: 'c-3', name: 'Vitta Homes', segment: 'Imobiliário', stage: 'proposta', status: 'lead', owner_id: 'u-ven', created_at: '2026-03-09' },
  { id: 'c-4', name: 'Aurum Tech', segment: 'SaaS B2B', stage: 'em_andamento', status: 'ativo', owner_id: 'u-mar', created_at: '2026-01-25' },
]

export const projects: Project[] = [
  { id: 'p-1', client_id: 'c-1', consultant_id: 'u-pro', vertical: 'processos', name: 'Padronização operacional', status: 'em_risco', start_date: '2026-03-01', end_date: '2026-06-30' },
  { id: 'p-2', client_id: 'c-2', consultant_id: 'u-fin', vertical: 'financeiro', name: 'DRE gerencial', status: 'em_andamento', start_date: '2026-04-01', end_date: '2026-07-15' },
  { id: 'p-3', client_id: 'c-3', consultant_id: 'u-ven', vertical: 'vendas', name: 'Máquina comercial', status: 'planejado', start_date: '2026-05-20', end_date: '2026-08-20' },
  { id: 'p-4', client_id: 'c-4', consultant_id: 'u-mar', vertical: 'marketing', name: 'Reposicionamento B2B', status: 'em_andamento', start_date: '2026-03-15', end_date: '2026-06-20' },
  { id: 'p-5', client_id: 'c-1', consultant_id: 'u-pes', vertical: 'pessoas', name: 'Trilha de liderança', status: 'em_andamento', start_date: '2026-05-01', end_date: '2026-07-30' },
]

export const tasks: Task[] = [
  { id: 't-1', project_id: 'p-1', title: 'Mapear fluxo de pedidos', description: 'Levantar gargalos entre comercial e operação.', assignee_id: 'u-pro', priority: 'critica', status: 'em_andamento', due_date: '2026-05-12', created_at: '2026-04-20', completed_at: null },
  { id: 't-2', project_id: 'p-1', title: 'Validar matriz RACI', description: 'Revisar papéis com liderança.', assignee_id: 'u-pro', priority: 'alta', status: 'revisao', due_date: '2026-05-15', created_at: '2026-05-02', completed_at: null },
  { id: 't-3', project_id: 'p-2', title: 'Importar plano de contas', description: 'Consolidar centros de custo.', assignee_id: 'u-fin', priority: 'alta', status: 'concluido', due_date: '2026-05-10', created_at: '2026-04-25', completed_at: '2026-05-09' },
  { id: 't-4', project_id: 'p-2', title: 'Modelar indicadores', description: 'Margem, EBITDA, CAC e break-even.', assignee_id: 'u-fin', priority: 'media', status: 'a_fazer', due_date: '2026-05-17', created_at: '2026-05-05', completed_at: null },
  { id: 't-5', project_id: 'p-3', title: 'Desenhar funil outbound', description: 'Etapas, SLA e gatilhos de follow-up.', assignee_id: 'u-ven', priority: 'media', status: 'a_fazer', due_date: '2026-05-22', created_at: '2026-05-10', completed_at: null },
  { id: 't-6', project_id: 'p-4', title: 'Auditar aquisição paga', description: 'Revisar contas, UTMs e conversões.', assignee_id: 'u-mar', priority: 'critica', status: 'em_andamento', due_date: '2026-05-14', created_at: '2026-05-01', completed_at: null },
  { id: 't-7', project_id: 'p-5', title: 'Criar matriz de competências', description: 'Níveis esperados por função.', assignee_id: 'u-pes', priority: 'alta', status: 'revisao', due_date: '2026-05-20', created_at: '2026-05-06', completed_at: null },
  { id: 't-8', project_id: 'p-4', title: 'Reposicionar mensagens', description: 'Nova narrativa para decisores.', assignee_id: 'u-mar', priority: 'media', status: 'concluido', due_date: '2026-05-08', created_at: '2026-04-28', completed_at: '2026-05-11' },
]

export const checklists: Checklist[] = [
  { id: 'cl-1', task_id: 't-1', item: 'Entrevistar líder operacional', done: true },
  { id: 'cl-2', task_id: 't-1', item: 'Desenhar SIPOC', done: false },
  { id: 'cl-3', task_id: 't-2', item: 'Coletar validações', done: true },
  { id: 'cl-4', task_id: 't-6', item: 'Checar pixel', done: false },
]

export const comments: Comment[] = [
  { id: 'cm-1', task_id: 't-1', user_id: 'u-admin', body: 'Risco alto: dependência de dados operacionais.', created_at: '2026-05-13T10:00:00Z' },
  { id: 'cm-2', task_id: 't-6', user_id: 'u-mar', body: 'Cliente enviou acesso parcial.', created_at: '2026-05-14T14:30:00Z' },
]

export const attachments: Attachment[] = [
  { id: 'a-1', task_id: 't-1', storage_path: 'task-attachments/t-1/fluxo.pdf', uploaded_by: 'u-pro', created_at: '2026-05-12T09:00:00Z' },
  { id: 'a-2', task_id: 't-6', storage_path: 'task-attachments/t-6/auditoria.xlsx', uploaded_by: 'u-mar', created_at: '2026-05-14T11:00:00Z' },
]
