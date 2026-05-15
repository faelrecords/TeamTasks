import type { Profile, Project, Task } from '../types/domain'

const MS_PER_DAY = 86_400_000

export function daysUntil(date: string, now = new Date('2026-05-15T12:00:00-03:00')) {
  const due = new Date(`${date}T23:59:59-03:00`)
  return Math.ceil((due.getTime() - now.getTime()) / MS_PER_DAY)
}

export function isOverdue(task: Task) {
  return task.status !== 'concluido' && daysUntil(task.due_date) < 0
}

export function isDueSoon(task: Task) {
  const days = daysUntil(task.due_date)
  return task.status !== 'concluido' && days >= 0 && days <= 2
}

export function completionDays(task: Task) {
  if (!task.completed_at) return null
  const start = new Date(task.created_at).getTime()
  const done = new Date(task.completed_at).getTime()
  return Math.max(1, Math.round((done - start) / MS_PER_DAY))
}

export function consultantLoad(profiles: Profile[], projects: Project[], tasks: Task[]) {
  return profiles
    .filter((profile) => profile.role === 'consultant')
    .map((profile) => {
      const ownedProjects = projects.filter((project) => project.consultant_id === profile.id)
      const openTasks = tasks.filter((task) => task.assignee_id === profile.id && task.status !== 'concluido')
      const doneTasks = tasks.filter((task) => task.assignee_id === profile.id && task.status === 'concluido')
      const onTimeDone = doneTasks.filter((task) => task.completed_at && task.completed_at <= task.due_date)
      const completionValues = doneTasks
        .map(completionDays)
        .filter((value): value is number => typeof value === 'number')
      const avgCompletion = completionValues.reduce((sum, value) => sum + value, 0) / Math.max(1, doneTasks.length)

      return {
        profile,
        projectCount: ownedProjects.length,
        openTasks: openTasks.length,
        doneTasks: doneTasks.length,
        onTimeRate: Math.round((onTimeDone.length / Math.max(1, doneTasks.length)) * 100),
        avgCompletion: Math.round(avgCompletion),
      }
    })
}
