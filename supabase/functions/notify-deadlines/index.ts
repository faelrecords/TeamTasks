import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
const senderEmail = Deno.env.get('NOTIFICATION_FROM_EMAIL') ?? 'TeamTasks <alerts@example.com>'

const supabase = createClient(supabaseUrl, serviceRoleKey)

serve(async () => {
  const { error: enqueueError } = await supabase.rpc('enqueue_deadline_notifications')
  if (enqueueError) {
    return Response.json({ ok: false, error: enqueueError.message }, { status: 500 })
  }

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, title, body, profiles!notifications_user_id_fkey(name), tasks!notifications_task_id_fkey(due_date, assignee_id)')
    .is('sent_at', null)
    .limit(50)

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })

  const sentIds: string[] = []

  for (const notification of notifications ?? []) {
    const assigneeId = notification.tasks?.assignee_id
    if (!assigneeId || !resendApiKey) continue

    const { data: user } = await supabase.auth.admin.getUserById(assigneeId)
    const email = user.user?.email
    if (!email) continue

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderEmail,
        to: email,
        subject: notification.title,
        text: `${notification.body}\nPrazo: ${notification.tasks?.due_date ?? ''}`,
      }),
    })

    if (response.ok) sentIds.push(notification.id)
  }

  if (sentIds.length) {
    await supabase.from('notifications').update({ sent_at: new Date().toISOString() }).in('id', sentIds)
  }

  return Response.json({ ok: true, queued: notifications?.length ?? 0, sent: sentIds.length })
})
