export type FollowupStatus = 'Reminder Pending' | 'Confirmed' | 'Reschedule Requested' | 'Staff Action Required' | 'Completed'
export type ReminderStatus = 'Not sent' | 'Sent'
export type ResponseStatus = 'Awaiting response' | 'Confirmed' | 'Reschedule requested' | 'No response'
export type TaskStatus = 'To Do' | 'In Progress' | 'Waiting' | 'Completed'

export type Patient = {
  id: string
  name: string
  initials: string
  nextFollowup: string
  time: string
  reminder: ReminderStatus
  response: ResponseStatus
  assigned: string
  status: FollowupStatus
  department: string
}

export type Followup = Patient & { type: 'Routine follow-up' | 'Post-visit review' | 'Scheduled review' }
export type Communication = {
  id: string
  patientId: string
  type: string
  created: string
  approvedBy: string
  sent: string
  response: string
  status: 'Awaiting Response' | 'Sent' | 'Responded' | 'Escalated'
}
export type Task = { id: string; patientId: string; task: string; owner: string; created: string; due: string; status: TaskStatus }
export type RescheduleRequest = { id: string; patientId: string; currentDate: string; currentTime: string; requestedDate: string; requestedTime: string; received: string; message: string; status: 'Pending Review' | 'Approved' | 'Contacted' }
export type Notification = { id: string; title: string; time: string; route: string; read: boolean }
export type Activity = { id: string; time: string; text: string; tone: 'blue' | 'green' | 'amber' | 'navy' }

export const staff = ['Coordinator A', 'Coordinator B', 'Coordinator C']

export const initialPatients: Patient[] = [
  { id: 'P-1042', name: 'Aarav Sharma', initials: 'AS', nextFollowup: '24 Sep 2026', time: '10:30 AM', reminder: 'Sent', response: 'Awaiting response', assigned: 'Coordinator A', status: 'Reminder Pending', department: 'General follow-up' },
  { id: 'P-1098', name: 'Ananya Mehta', initials: 'AM', nextFollowup: '22 Sep 2026', time: '11:15 AM', reminder: 'Sent', response: 'Confirmed', assigned: 'Coordinator B', status: 'Confirmed', department: 'Scheduled review' },
  { id: 'P-1177', name: 'Rohan Kapoor', initials: 'RK', nextFollowup: '28 Sep 2026', time: '10:30 AM', reminder: 'Sent', response: 'Reschedule requested', assigned: 'Coordinator A', status: 'Reschedule Requested', department: 'Post-visit review' },
  { id: 'P-1281', name: 'Ishita Verma', initials: 'IV', nextFollowup: '20 Sep 2026', time: '3:00 PM', reminder: 'Sent', response: 'No response', assigned: 'Coordinator C', status: 'Staff Action Required', department: 'Routine follow-up' },
  { id: 'P-1452', name: 'Kabir Malhotra', initials: 'KM', nextFollowup: '25 Sep 2026', time: '2:00 PM', reminder: 'Not sent', response: 'Awaiting response', assigned: 'Unassigned', status: 'Reminder Pending', department: 'Routine follow-up' },
]

export const initialCommunications: Communication[] = [
  { id: 'c1', patientId: 'P-1042', type: 'Follow-up reminder', created: '22 Sep · 09:12', approvedBy: 'Dr. Meera Rao', sent: '22 Sep · 09:32', response: 'Awaiting', status: 'Awaiting Response' },
  { id: 'c2', patientId: 'P-1098', type: 'Follow-up reminder', created: '21 Sep · 08:50', approvedBy: 'Dr. Meera Rao', sent: '21 Sep · 09:02', response: 'Confirmed', status: 'Responded' },
  { id: 'c3', patientId: 'P-1177', type: 'Follow-up reminder', created: '20 Sep · 09:02', approvedBy: 'Dr. Meera Rao', sent: '20 Sep · 09:12', response: 'Reschedule requested', status: 'Responded' },
  { id: 'c4', patientId: 'P-1281', type: 'Follow-up reminder', created: '22 Sep · 09:12', approvedBy: 'Dr. Meera Rao', sent: '22 Sep · 09:30', response: 'No response', status: 'Escalated' },
]

export const initialTasks: Task[] = [
  { id: 't1', patientId: 'P-1281', task: 'Contact patient regarding unanswered reminder', owner: 'Coordinator C', created: '22 Sep', due: 'Today', status: 'To Do' },
  { id: 't2', patientId: 'P-1177', task: 'Review reschedule request', owner: 'Coordinator A', created: '21 Sep', due: 'Today', status: 'In Progress' },
  { id: 't3', patientId: 'P-1098', task: 'Confirm appointment record', owner: 'Coordinator B', created: '21 Sep', due: 'Today', status: 'Completed' },
  { id: 't4', patientId: 'P-1452', task: 'Follow up with patient', owner: 'Unassigned', created: '21 Sep', due: 'Tomorrow', status: 'Waiting' },
]

export const initialReschedules: RescheduleRequest[] = [
  { id: 'r1', patientId: 'P-1177', currentDate: '21 Sep 2026', currentTime: '10:30 AM', requestedDate: '28 Sep 2026', requestedTime: 'Morning', received: '21 Sep · 08:42', message: 'Please move my appointment to next week in the morning.', status: 'Pending Review' },
  { id: 'r2', patientId: 'P-1452', currentDate: '23 Sep 2026', currentTime: '2:00 PM', requestedDate: '25 Sep 2026', requestedTime: 'Afternoon', received: '21 Sep · 07:58', message: 'Afternoon works better for me.', status: 'Pending Review' },
]

export const initialNotifications: Notification[] = [
  { id: 'n1', title: 'P-1177 requested a reschedule.', time: '12 min ago', route: '/reschedules', read: false },
  { id: 'n2', title: 'P-1281 has an unanswered reminder.', time: '28 min ago', route: '/escalations', read: false },
  { id: 'n3', title: 'P-1098 confirmed their appointment.', time: '1 hr ago', route: '/overview', read: false },
  { id: 'n4', title: '3 follow-ups are due tomorrow.', time: 'Yesterday', route: '/follow-ups', read: true },
]

export const initialActivity: Activity[] = [
  { id: 'a1', time: '09:42', text: 'P-1042 reminder sent', tone: 'blue' },
  { id: 'a2', time: '09:31', text: 'P-1098 confirmed', tone: 'green' },
  { id: 'a3', time: '09:12', text: 'P-1177 requested reschedule', tone: 'amber' },
  { id: 'a4', time: '08:54', text: 'P-1281 escalated to staff', tone: 'navy' },
]

export const followups: Followup[] = initialPatients.map((p, index) => ({ ...p, type: index === 1 ? 'Scheduled review' : index === 2 ? 'Post-visit review' : 'Routine follow-up' }))
