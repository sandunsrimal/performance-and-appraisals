import { type Notification } from "@/lib/types"
import { workflowAssignments, getWorkflowTemplate, getEmployee, getEffectiveManagers } from "@/lib/workflow-data"
import { isBefore, addDays, differenceInDays } from "date-fns"
import { demoNotifications } from "./data/demo-notifications"

// Generate notifications for a user based on workflow assignments
export function generateNotificationsForUser(userId: string): Notification[] {
  const notifications: Notification[] = []
  const now = new Date()

  // Add demo notifications for the user
  const userDemoNotifications = demoNotifications.filter((n) => n.userId === userId)
  notifications.push(...userDemoNotifications)

  // Get all assignments where the user is involved
  const relevantAssignments = workflowAssignments.filter((assignment) => {
    const employee = getEmployee(assignment.employeeId)
    if (!employee) return false

    // User is the employee
    if (assignment.employeeId === userId) return true

    // User is a manager
    const effectiveManagers = getEffectiveManagers(assignment)
    return effectiveManagers.some((manager) => manager.employeeId === userId)
  })

  for (const assignment of relevantAssignments) {
    const template = getWorkflowTemplate(assignment.workflowTemplateId)
    const employee = getEmployee(assignment.employeeId)
    if (!template || !employee) continue

    const effectiveManagers = getEffectiveManagers(assignment)
    const isEmployee = assignment.employeeId === userId
    const isManager = effectiveManagers.some((m) => m.employeeId === userId)
    const userManagerLevel = effectiveManagers.find((m) => m.employeeId === userId)?.level

    // Check each stage
    for (const stage of template.stages) {
      const completion = assignment.stageCompletions[stage.id]
      const isCompleted = completion?.completed || false
      const isUserInvolved = 
        (isEmployee && stage.attendees?.includes("employee")) ||
        (isManager && userManagerLevel && stage.attendees?.includes(`manager_level_${userManagerLevel}`))

      if (!isUserInvolved) continue

      // Evaluation pending
      if (stage.type === "evaluation" && !isCompleted && assignment.status === "in_progress") {
        const dueDate = calculateDueDate(assignment.startDate, stage)
        const daysUntilDue = differenceInDays(dueDate, now)
        
        if (daysUntilDue >= 0 && daysUntilDue <= 7) {
          notifications.push({
            id: `notif-${assignment.id}-${stage.id}-pending`,
            userId,
            category: "evaluation_pending",
            title: "Review Form Pending",
            message: `${isEmployee ? "Your" : `${employee.firstName} ${employee.lastName}'s`} ${stage.name} is due ${daysUntilDue === 0 ? "today" : `in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`}`,
            read: false,
            createdAt: new Date().toISOString(),
            link: `/forms/fill/${stage.evaluationFormId}?assignmentId=${assignment.id}&stageId=${stage.id}`,
            metadata: {
              assignmentId: assignment.id,
              stageId: stage.id,
              employeeId: assignment.employeeId,
              formId: stage.evaluationFormId,
            },
          })
        }
      }

      // Evaluation completed
      if (stage.type === "evaluation" && isCompleted && completion.completedDate) {
        const completedDate = new Date(completion.completedDate)
        const daysSinceCompleted = differenceInDays(now, completedDate)
        
        // Notify within 24 hours of completion
        if (daysSinceCompleted === 0) {
          notifications.push({
            id: `notif-${assignment.id}-${stage.id}-completed`,
            userId,
            category: "evaluation_completed",
            title: "Review Form Completed",
            message: `${isEmployee ? "Your" : `${employee.firstName} ${employee.lastName}'s`} ${stage.name} has been completed`,
            read: false,
            createdAt: new Date().toISOString(),
            link: `/appraisals?assignmentId=${assignment.id}`,
            metadata: {
              assignmentId: assignment.id,
              stageId: stage.id,
              employeeId: assignment.employeeId,
            },
          })
        }
      }

      // Action required (overdue evaluations, blocked stages)
      if (!isCompleted && assignment.status === "in_progress") {
        const dueDate = calculateDueDate(assignment.startDate, stage)
        
        if (isBefore(dueDate, now)) {
          notifications.push({
            id: `notif-${assignment.id}-${stage.id}-overdue`,
            userId,
            category: "action_required",
            title: "Action Required - Overdue",
            message: `${isEmployee ? "Your" : `${employee.firstName} ${employee.lastName}'s`} ${stage.name} step is overdue`,
            read: false,
            createdAt: new Date().toISOString(),
            link: stage.evaluationFormId ? `/forms/fill/${stage.evaluationFormId}?assignmentId=${assignment.id}&stageId=${stage.id}` : `/appraisals?assignmentId=${assignment.id}`,
            metadata: {
              assignmentId: assignment.id,
              stageId: stage.id,
              employeeId: assignment.employeeId,
            },
          })
        }

        // Check if stage is blocked by dependencies
        if (stage.requiredStageIds && stage.requiredStageIds.length > 0) {
          const allDependenciesCompleted = stage.requiredStageIds.every((requiredStageId) => {
            const requiredCompletion = assignment.stageCompletions[requiredStageId]
            return requiredCompletion?.completed || false
          })

          if (!allDependenciesCompleted) {
            const incompleteDependencies = stage.requiredStageIds.filter((requiredStageId) => {
              const requiredCompletion = assignment.stageCompletions[requiredStageId]
              return !requiredCompletion?.completed
            })

            if (incompleteDependencies.length > 0) {
              notifications.push({
                id: `notif-${assignment.id}-${stage.id}-blocked`,
                userId,
                category: "action_required",
                title: "Action Required - Dependencies",
                message: `${stage.name} cannot proceed until prerequisite steps are completed`,
                read: false,
                createdAt: new Date().toISOString(),
                link: `/appraisals?assignmentId=${assignment.id}`,
                metadata: {
                  assignmentId: assignment.id,
                  stageId: stage.id,
                  employeeId: assignment.employeeId,
                },
              })
            }
          }
        }
      }

      // Stage completed
      if (isCompleted && completion.completedDate) {
        const completedDate = new Date(completion.completedDate)
        const daysSinceCompleted = differenceInDays(now, completedDate)
        
        if (daysSinceCompleted === 0 && stage.type !== "evaluation") {
          notifications.push({
            id: `notif-${assignment.id}-${stage.id}-stage-completed`,
            userId,
            category: "stage_completed",
            title: "Step Completed",
            message: `${stage.name} step has been completed for ${employee.firstName} ${employee.lastName}`,
            read: false,
            createdAt: new Date().toISOString(),
            link: `/appraisals?assignmentId=${assignment.id}`,
            metadata: {
              assignmentId: assignment.id,
              stageId: stage.id,
              employeeId: assignment.employeeId,
            },
          })
        }
      }
    }

    // Assignment created
    if (assignment.status === "not_started") {
      const daysSinceCreated = differenceInDays(now, new Date(assignment.createdAt))
      if (daysSinceCreated === 0) {
        notifications.push({
          id: `notif-${assignment.id}-created`,
          userId,
          category: "assignment_created",
          title: "New Review Cycle Assigned",
          message: `A new ${template.name} review cycle has been assigned ${isEmployee ? "to you" : `to ${employee.firstName} ${employee.lastName}`}`,
          read: false,
          createdAt: new Date().toISOString(),
          link: `/appraisals?assignmentId=${assignment.id}`,
          metadata: {
            assignmentId: assignment.id,
            employeeId: assignment.employeeId,
          },
        })
      }
    }
  }

  // Sort by creation date (newest first)
  return notifications.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// Calculate due date for a stage based on assignment start date and stage configuration
function calculateDueDate(startDate: string, stage: { dueDateType?: string; dueDateOffset?: number; dueDateUnit?: string }): Date {
  const start = new Date(startDate)
  
  if (!stage.dueDateType || !stage.dueDateOffset) {
    return addDays(start, 30) // Default to 30 days
  }

  switch (stage.dueDateType) {
    case "before_interval":
      return addDays(start, -Math.abs(stage.dueDateOffset))
    case "on_interval":
      return addDays(start, 0)
    case "after_interval":
      return addDays(start, Math.abs(stage.dueDateOffset))
    case "custom":
      if (stage.dueDateUnit === "weeks") {
        return addDays(start, stage.dueDateOffset * 7)
      } else if (stage.dueDateUnit === "months") {
        return addDays(start, stage.dueDateOffset * 30)
      }
      return addDays(start, stage.dueDateOffset)
    default:
      return addDays(start, 30)
  }
}

// Get notification count for a user
export function getUnreadNotificationCount(userId: string): number {
  const notifications = generateNotificationsForUser(userId)
  return notifications.filter((n) => !n.read).length
}

// Mark notification as read
export function markNotificationAsRead(notificationId: string, userId: string): void {
  // In a real app, this would update a database
  // For now, we'll store read state in localStorage
  const readNotifications = JSON.parse(localStorage.getItem(`read-notifications-${userId}`) || "[]")
  if (!readNotifications.includes(notificationId)) {
    readNotifications.push(notificationId)
    localStorage.setItem(`read-notifications-${userId}`, JSON.stringify(readNotifications))
  }
}

// Mark all notifications as read for a user
export function markAllNotificationsAsRead(userId: string): void {
  const notifications = generateNotificationsForUser(userId)
  const readNotifications = notifications.map((n) => n.id)
  localStorage.setItem(`read-notifications-${userId}`, JSON.stringify(readNotifications))
}

// Get read notification IDs from localStorage
export function getReadNotificationIds(userId: string): string[] {
  return JSON.parse(localStorage.getItem(`read-notifications-${userId}`) || "[]")
}

// Apply read state to notifications
export function applyReadState(notifications: Notification[], userId: string): Notification[] {
  const readIds = getReadNotificationIds(userId)
  return notifications.map((n) => ({
    ...n,
    read: readIds.includes(n.id),
  }))
}
