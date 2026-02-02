// Notification system for workflows and appraisals
import { addDays, addWeeks, addMonths, format, differenceInDays } from "date-fns"
import type {
  WorkflowAssignment,
  WorkflowTemplate,
  WorkflowMeeting,
  NotificationSettings,
  ReviewStage,
} from "./types"
import { getWorkflowTemplate, getEmployee } from "./workflow-data"

export type Notification = {
  id: string
  type: "meeting_reminder" | "form_reminder" | "meeting_scheduled" | "form_due"
  recipientId: string
  recipientEmail: string
  recipientName: string
  title: string
  message: string
  relatedEntityId: string // workflow assignment ID or meeting ID
  relatedEntityType: "workflow_assignment" | "meeting"
  scheduledDate: string
  sent: boolean
  sentDate?: string
  channels: ("email" | "in-app" | "sms")[]
  createdAt: string
}

// Calculate stage due date based on dueDateType and dueDateOffset
function calculateStepDueDate(stage: ReviewStage, startDate: Date, endDate?: Date): Date | null {
  if (!stage.dueDateType) return null

  switch (stage.dueDateType) {
    case "on_interval":
      return startDate
    case "before_interval":
      if (stage.dueDateOffset !== undefined) {
        return addWeeks(startDate, -stage.dueDateOffset)
      }
      return startDate
    case "after_interval":
      if (stage.dueDateOffset !== undefined) {
        return addWeeks(startDate, stage.dueDateOffset)
      }
      return endDate || startDate
    case "custom":
      if (stage.dueDateOffset !== undefined && stage.dueDateUnit) {
        const offset = stage.dueDateOffset
        switch (stage.dueDateUnit) {
          case "days":
            return addDays(startDate, offset)
          case "weeks":
            return addWeeks(startDate, offset)
          case "months":
            return addMonths(startDate, offset)
          default:
            return startDate
        }
      }
      return startDate
    default:
      return startDate
  }
}

// Calculate next meeting date based on frequency
export function calculateNextMeetingDate(
  lastMeetingDate: Date | null,
  frequency: WorkflowTemplate["meetingFrequencies"][0]["frequency"]
): Date {
  const now = new Date()
  const baseDate = lastMeetingDate || now

  switch (frequency.type) {
    case "daily":
      return addDays(baseDate, 1)
    case "weekly":
      return addDays(baseDate, 7)
    case "biweekly":
      return addDays(baseDate, 14)
    case "monthly":
      return addDays(baseDate, 30)
    case "quarterly":
      return addDays(baseDate, 90)
    case "biannually":
      return addDays(baseDate, 180)
    case "annually":
      return addDays(baseDate, 365)
    case "custom":
      if (frequency.value && frequency.unit) {
        const days = frequency.unit === "days" 
          ? frequency.value 
          : frequency.unit === "weeks" 
          ? frequency.value * 7 
          : frequency.value * 30
        return addDays(baseDate, days)
      }
      return addDays(baseDate, 30) // Default to monthly
    default:
      return addDays(baseDate, 30)
  }
}

// Generate notifications for workflow assignments
export function generateNotificationsForAssignment(
  assignment: WorkflowAssignment,
  template: WorkflowTemplate
): Notification[] {
  const notifications: Notification[] = []
  const employee = getEmployee(assignment.employeeId)
  if (!employee) return notifications

  const settings = template.notificationSettings
  if (!settings.enabled) return notifications

  const startDate = new Date(assignment.startDate)

  // Generate notifications for each review stage
  template.stages.forEach((stage) => {
    const dueDate = calculateStepDueDate(stage, startDate, assignment.endDate ? new Date(assignment.endDate) : undefined)
    if (dueDate) {
      const reminderDate = addDays(dueDate, -settings.formReminderDays)

      // Form reminder notification
      if (reminderDate >= new Date()) {
        notifications.push({
          id: `notif-${assignment.id}-${stage.id}-form-reminder`,
          type: "form_reminder",
          recipientId: assignment.employeeId,
          recipientEmail: employee.email,
          recipientName: `${employee.firstName} ${employee.lastName}`,
          title: `Evaluation Form Due Soon: ${stage.name}`,
          message: `Your evaluation form "${stage.name}" is due on ${format(dueDate, "MMM dd, yyyy")}. Please complete it before the due date.`,
          relatedEntityId: assignment.id,
          relatedEntityType: "workflow_assignment",
          scheduledDate: format(reminderDate, "yyyy-MM-dd"),
          sent: false,
          channels: settings.channels,
          createdAt: new Date().toISOString(),
        })
      }

      // Form due notification
      notifications.push({
        id: `notif-${assignment.id}-${stage.id}-form-due`,
        type: "form_due",
        recipientId: assignment.employeeId,
        recipientEmail: employee.email,
        recipientName: `${employee.firstName} ${employee.lastName}`,
        title: `Evaluation Form Due: ${stage.name}`,
        message: `Your evaluation form "${stage.name}" is due today. Please complete it as soon as possible.`,
        relatedEntityId: assignment.id,
        relatedEntityType: "workflow_assignment",
        scheduledDate: format(dueDate, "yyyy-MM-dd"),
        sent: false,
        channels: settings.channels,
        createdAt: new Date().toISOString(),
      })
    }
  })

  // Generate notifications for meetings
  template.meetingFrequencies.forEach((meetingFreq) => {
    const nextMeetingDate = calculateNextMeetingDate(null, meetingFreq.frequency)
    const reminderDate = addDays(nextMeetingDate, -settings.meetingReminderDays)

    // Meeting reminder notification
    if (reminderDate >= new Date()) {
      notifications.push({
        id: `notif-${assignment.id}-meeting-reminder-level-${meetingFreq.managerLevel}`,
        type: "meeting_reminder",
        recipientId: assignment.employeeId,
        recipientEmail: employee.email,
        recipientName: `${employee.firstName} ${employee.lastName}`,
        title: `Evaluation Meeting Scheduled: Level ${meetingFreq.managerLevel} Manager`,
        message: `You have an evaluation meeting scheduled with your Level ${meetingFreq.managerLevel} manager on ${format(nextMeetingDate, "MMM dd, yyyy")}. Please prepare accordingly.`,
        relatedEntityId: assignment.id,
        relatedEntityType: "workflow_assignment",
        scheduledDate: format(reminderDate, "yyyy-MM-dd"),
        sent: false,
        channels: settings.channels,
        createdAt: new Date().toISOString(),
      })
    }

    // Meeting scheduled notification
    notifications.push({
      id: `notif-${assignment.id}-meeting-scheduled-level-${meetingFreq.managerLevel}`,
      type: "meeting_scheduled",
      recipientId: assignment.employeeId,
      recipientEmail: employee.email,
      recipientName: `${employee.firstName} ${employee.lastName}`,
      title: `Evaluation Meeting Scheduled`,
      message: `An evaluation meeting has been scheduled for ${format(nextMeetingDate, "MMM dd, yyyy")} with your Level ${meetingFreq.managerLevel} manager.`,
      relatedEntityId: assignment.id,
      relatedEntityType: "workflow_assignment",
      scheduledDate: format(nextMeetingDate, "yyyy-MM-dd"),
      sent: false,
      channels: settings.channels,
      createdAt: new Date().toISOString(),
    })
  })

  return notifications
}

// Check if notification should be sent today
export function shouldSendNotification(notification: Notification): boolean {
  const today = new Date()
  const scheduledDate = new Date(notification.scheduledDate)
  
  return (
    !notification.sent &&
    differenceInDays(scheduledDate, today) <= 0 &&
    differenceInDays(today, scheduledDate) <= 1 // Allow 1 day grace period
  )
}

// Send notification (mock implementation - in real app, this would send emails/SMS)
export function sendNotification(notification: Notification): void {
  console.log(`Sending notification: ${notification.title}`)
  console.log(`To: ${notification.recipientEmail}`)
  console.log(`Channels: ${notification.channels.join(", ")}`)
  console.log(`Message: ${notification.message}`)
  
  // In a real application, you would:
  // 1. Send email via email service (SendGrid, AWS SES, etc.)
  // 2. Send SMS via SMS service (Twilio, AWS SNS, etc.)
  // 3. Create in-app notification record in database
  // 4. Update notification.sent = true and notification.sentDate
}
