"use client"

import * as React from "react"
import {
  IconSearch,
  IconCalendar,
  IconFileText,
  IconMessageCircle,
  IconCheck,
  IconUsers,
  IconAlertCircle,
  IconGripVertical,
  IconExternalLink,
  IconDownload,
  IconEye,
  IconVideo,
  IconClipboardCheck,
  IconThumbUp,
} from "@tabler/icons-react"
import { format, addDays, addWeeks, addMonths, isBefore, isAfter, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useDroppable } from "@dnd-kit/core"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { demoEmployees } from "@/lib/data/demo-employees"
import {
  type WorkflowAssignment,
  type ReviewStage,
} from "@/lib/types"
import {
  workflowAssignments,
  getWorkflowTemplate,
  getEmployee,
  initializeWorkflowData,
  getEvaluationForm
} from "@/lib/workflow-data"
import { useRole } from "@/lib/role-context"
import { getTaskContext, formatTaskContextDisplay } from "@/lib/employee-role-utils"


// Task type representing individual steps from workflow assignments
type Task = {
  id: string
  assignmentId: string
  stepId: string
  employeeId: string
  employeeName: string
  procedureName: string
  stepName: string
  stepDescription: string
  stepType: "evaluation" | "meeting" | "review" | "approval"
  status: "pending" | "in_progress" | "completed" | "overdue" | "cancelled"
  dueDate: Date | null
  completedDate: string | null
  attendees: string[]
  evaluationFormId?: string
  evaluationFormName?: string
  isRequired: boolean
  formData?: Record<string, unknown>
  // Context information
  contextTitle?: string
  contextSubtitle?: string
  contextBadge?: string
}

// Helper function to calculate due date from step configuration
const calculateDueDate = (
  stage: ReviewStage,
  assignmentStartDate: string,
  assignmentEndDate?: string
): Date | null => {
  const startDate = new Date(assignmentStartDate)
  const endDate = assignmentEndDate ? new Date(assignmentEndDate) : null

  if (!stage.dueDateType) return null

  switch (stage.dueDateType) {
    case "on_interval":
      return startDate
    case "before_interval":
      if (stage.dueDateOffset) {
        return addWeeks(startDate, -stage.dueDateOffset)
      }
      return startDate
    case "after_interval":
      if (stage.dueDateOffset) {
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

// Hardcoded tasks for demo users (admin-1, eng-manager-1, eng-1)
// Based on their workflow assignments from appraisals demo data
const getHardcodedTasks = (
  currentEmployeeId: string
): Task[] => {
  const tasks: Task[] = []
  
  // Static dates for consistency
  const baseDate = new Date("2024-01-15")
  const threeMonthsLater = new Date("2024-04-15")
  
  // Helper to create a task
  const createTask = (taskData: {
    id: string
    assignmentId: string
    stepId: string
    employeeId: string
    employeeName: string
    procedureName: string
    stepName: string
    stepDescription: string
    stepType: Task["stepType"]
    status: Task["status"]
    dueDate: Date | null
    completedDate: string | null
    attendees: string[]
    evaluationFormId?: string
    evaluationFormName?: string
    isRequired?: boolean
    contextTitle?: string
    contextSubtitle?: string
    contextBadge?: string
  }): Task => ({
    id: taskData.id,
    assignmentId: taskData.assignmentId,
    stepId: taskData.stepId,
    employeeId: taskData.employeeId,
    employeeName: taskData.employeeName,
    procedureName: taskData.procedureName,
    stepName: taskData.stepName,
    stepDescription: taskData.stepDescription,
    stepType: taskData.stepType,
    status: taskData.status,
    dueDate: taskData.dueDate,
    completedDate: taskData.completedDate,
    attendees: taskData.attendees,
    evaluationFormId: taskData.evaluationFormId,
    evaluationFormName: taskData.evaluationFormName,
    isRequired: taskData.isRequired ?? true,
    contextTitle: taskData.contextTitle,
    contextSubtitle: taskData.contextSubtitle,
    contextBadge: taskData.contextBadge,
  })

  // ADMIN ROLE (admin-1 - Nimali Perera)
  if (currentEmployeeId === "admin-1") {
    // Admin's own tasks from workflow-complete-evaluation
    const adminAssignmentId = "assignment-admin-1-workflow-complete-evaluation-0"
    
    // Task 1: Employee Self-Evaluation (for admin as employee) - COMPLETED
    tasks.push(createTask({
      id: `${adminAssignmentId}-stage-employee-self-eval`,
      assignmentId: adminAssignmentId,
      stepId: "stage-employee-self-eval",
      employeeId: "admin-1",
      employeeName: "Nimali Perera",
      procedureName: "Semi-Annual Performance Appraisal",
      stepName: "Employee Self-Evaluation",
      stepDescription: "Employee completes a comprehensive self-evaluation form assessing their performance, achievements, skills development, and goals for the review period.",
      stepType: "evaluation",
      status: "completed",
      dueDate: new Date("2024-01-08"), // 1 week before
      completedDate: "2024-01-07T10:30:00Z",
      attendees: ["Nimali Perera"],
      evaluationFormId: "form-employee-self",
      evaluationFormName: "Employee Self-Evaluation Form",
      isRequired: true,
      contextTitle: "Complete Your Self-Evaluation",
      contextSubtitle: "For: Nimali Perera",
      contextBadge: "Your Task"
    }))

    // Task 2: Performance Discussion Meeting (for admin as employee) - COMPLETED
    tasks.push(createTask({
      id: `${adminAssignmentId}-stage-evaluation-meeting`,
      assignmentId: adminAssignmentId,
      stepId: "stage-evaluation-meeting",
      employeeId: "admin-1",
      employeeName: "Nimali Perera",
      procedureName: "Semi-Annual Performance Appraisal",
      stepName: "Performance Discussion Meeting",
      stepDescription: "One-on-one meeting between employee and their direct manager to discuss the self-evaluation, performance, feedback, goals, and development opportunities.",
      stepType: "meeting",
      status: "completed",
      dueDate: baseDate,
      completedDate: "2024-01-15T14:00:00Z",
      attendees: ["Nimali Perera", "Manager Level 1"],
      contextTitle: "Attend Performance Discussion",
      contextSubtitle: "For: Nimali Perera",
      contextBadge: "Your Task"
    }))

    // Manager tasks for eng-1 (Kavindu Silva)
    const eng1AssignmentId = "assignment-eng-1-workflow-complete-evaluation-0"
    
    // Task 3: Manager Evaluation for eng-1 (admin as level 2 manager)
    tasks.push(createTask({
      id: `${eng1AssignmentId}-stage-manager-evaluation`,
      assignmentId: eng1AssignmentId,
      stepId: "stage-manager-evaluation",
      employeeId: "eng-1",
      employeeName: "Kavindu Silva",
      procedureName: "Semi-Annual Performance Appraisal",
      stepName: "Manager Evaluation",
      stepDescription: "Direct manager completes a comprehensive evaluation form rating the employee's performance across multiple criteria, providing feedback, and making recommendations.",
      stepType: "evaluation",
      status: "pending",
      dueDate: new Date("2024-01-22"), // 1 week after meeting
      completedDate: null,
      attendees: ["Manager Level 1 (Rajitha Wickramasinghe)"],
      evaluationFormId: "form-manager-evaluation",
      evaluationFormName: "Manager Evaluation Form",
      contextTitle: "Evaluate: Kavindu Silva",
      contextSubtitle: "Semi-Annual Performance Appraisal",
      contextBadge: "Manager Task"
    }))

    // Task 4: Senior Manager Approval for eng-1 (admin as level 2 manager)
    tasks.push(createTask({
      id: `${eng1AssignmentId}-stage-senior-approval`,
      assignmentId: eng1AssignmentId,
      stepId: "stage-senior-approval",
      employeeId: "eng-1",
      employeeName: "Kavindu Silva",
      procedureName: "Semi-Annual Performance Appraisal",
      stepName: "Senior Manager Approval",
      stepDescription: "Senior manager (Level 2) reviews the complete appraisal including employee self-evaluation and manager evaluation, then approves or provides feedback on ratings, recommendations, and compensation decisions.",
      stepType: "approval",
      status: "pending",
      dueDate: new Date("2024-01-29"), // 2 weeks after meeting
      completedDate: null,
      attendees: ["Manager Level 2 (Nimali Perera)"],
      evaluationFormId: "form-approval",
      evaluationFormName: "Approval Form",
      contextTitle: "Approve: Kavindu Silva",
      contextSubtitle: "Semi-Annual Performance Appraisal",
      contextBadge: "Approval Task"
    }))
  }

  // MANAGER ROLE (eng-manager-1 - Rajitha Wickramasinghe)
  if (currentEmployeeId === "eng-manager-1") {
    // Manager's own tasks from workflow-simple-meeting
    const simpleMeetingAssignmentId = "assignment-eng-manager-1-workflow-simple-meeting-0"
    
    // Task 1: Evaluation Meeting (from simple meeting procedure) - COMPLETED
    tasks.push(createTask({
      id: `${simpleMeetingAssignmentId}-stage-meeting-only`,
      assignmentId: simpleMeetingAssignmentId,
      stepId: "stage-meeting-only",
      employeeId: "eng-manager-1",
      employeeName: "Rajitha Wickramasinghe",
      procedureName: "Quarterly Evaluation Meeting",
      stepName: "Evaluation Meeting with Manager",
      stepDescription: "Direct one-on-one evaluation meeting between employee and their manager to discuss performance, achievements, challenges, and goals. Manager will document the meeting notes.",
      stepType: "meeting",
      status: "completed",
      dueDate: threeMonthsLater,
      completedDate: "2024-04-15T11:00:00Z",
      attendees: ["Rajitha Wickramasinghe", "Manager Level 1 (Nimali Perera)"],
      evaluationFormId: "form-meeting-notes",
      evaluationFormName: "Meeting Notes Form",
      contextTitle: "Attend Evaluation Meeting",
      contextSubtitle: "For: Rajitha Wickramasinghe",
      contextBadge: "Your Task"
    }))

    // Manager's own tasks from workflow-complete-evaluation
    const managerAssignmentId = "assignment-eng-manager-1-workflow-complete-evaluation-0"
    
    // Task 2: Employee Self-Evaluation (for manager as employee) - COMPLETED
    tasks.push(createTask({
      id: `${managerAssignmentId}-stage-employee-self-eval`,
      assignmentId: managerAssignmentId,
      stepId: "stage-employee-self-eval",
      employeeId: "eng-manager-1",
      employeeName: "Rajitha Wickramasinghe",
      procedureName: "Semi-Annual Performance Appraisal",
      stepName: "Employee Self-Evaluation",
      stepDescription: "Employee completes a comprehensive self-evaluation form assessing their performance, achievements, skills development, and goals for the review period.",
      stepType: "evaluation",
      status: "completed",
      dueDate: new Date("2024-01-08"),
      completedDate: "2024-01-07T09:15:00Z",
      attendees: ["Rajitha Wickramasinghe"],
      evaluationFormId: "form-employee-self",
      evaluationFormName: "Employee Self-Evaluation Form",
      contextTitle: "Complete Your Self-Evaluation",
      contextSubtitle: "For: Rajitha Wickramasinghe",
      contextBadge: "Your Task"
    }))

    // Task 3: Performance Discussion Meeting (for manager as employee)
    tasks.push(createTask({
      id: `${managerAssignmentId}-stage-evaluation-meeting`,
      assignmentId: managerAssignmentId,
      stepId: "stage-evaluation-meeting",
      employeeId: "eng-manager-1",
      employeeName: "Rajitha Wickramasinghe",
      procedureName: "Semi-Annual Performance Appraisal",
      stepName: "Performance Discussion Meeting",
      stepDescription: "One-on-one meeting between employee and their direct manager to discuss the self-evaluation, performance, feedback, goals, and development opportunities.",
      stepType: "meeting",
      status: "pending",
      dueDate: baseDate,
      completedDate: null,
      attendees: ["Rajitha Wickramasinghe", "Manager Level 1 (Nimali Perera)"],
      contextTitle: "Attend Performance Discussion",
      contextSubtitle: "For: Rajitha Wickramasinghe",
      contextBadge: "Your Task"
    }))

    // Manager tasks for eng-1 (Kavindu Silva)
    const eng1AssignmentId = "assignment-eng-1-workflow-complete-evaluation-0"
    
    // Task 4: Performance Discussion Meeting for eng-1 (manager as level 1)
    tasks.push(createTask({
      id: `${eng1AssignmentId}-stage-evaluation-meeting`,
      assignmentId: eng1AssignmentId,
      stepId: "stage-evaluation-meeting",
      employeeId: "eng-1",
      employeeName: "Kavindu Silva",
      procedureName: "Semi-Annual Performance Appraisal",
      stepName: "Performance Discussion Meeting",
      stepDescription: "One-on-one meeting between employee and their direct manager to discuss the self-evaluation, performance, feedback, goals, and development opportunities.",
      stepType: "meeting",
      status: "pending",
      dueDate: baseDate,
      completedDate: null,
      attendees: ["Kavindu Silva", "Manager Level 1 (Rajitha Wickramasinghe)"],
      contextTitle: "Conduct Meeting: Kavindu Silva",
      contextSubtitle: "Semi-Annual Performance Appraisal",
      contextBadge: "Manager Task"
    }))

    // Task 5: Manager Evaluation for eng-1 (manager as level 1) - COMPLETED
    tasks.push(createTask({
      id: `${eng1AssignmentId}-stage-manager-evaluation`,
      assignmentId: eng1AssignmentId,
      stepId: "stage-manager-evaluation",
      employeeId: "eng-1",
      employeeName: "Kavindu Silva",
      procedureName: "Semi-Annual Performance Appraisal",
      stepName: "Manager Evaluation",
      stepDescription: "Direct manager completes a comprehensive evaluation form rating the employee's performance across multiple criteria, providing feedback, and making recommendations.",
      stepType: "evaluation",
      status: "completed",
      dueDate: new Date("2024-01-22"),
      completedDate: "2024-01-21T16:45:00Z",
      attendees: ["Manager Level 1 (Rajitha Wickramasinghe)"],
      evaluationFormId: "form-manager-evaluation",
      evaluationFormName: "Manager Evaluation Form",
      contextTitle: "Evaluate: Kavindu Silva",
      contextSubtitle: "Semi-Annual Performance Appraisal",
      contextBadge: "Manager Task"
    }))
  }

  // EMPLOYEE ROLE (eng-1 - Kavindu Silva)
  if (currentEmployeeId === "eng-1") {
    const eng1AssignmentId = "assignment-eng-1-workflow-complete-evaluation-0"
    
    // Task 1: Employee Self-Evaluation - COMPLETED
    tasks.push(createTask({
      id: `${eng1AssignmentId}-stage-employee-self-eval`,
      assignmentId: eng1AssignmentId,
      stepId: "stage-employee-self-eval",
      employeeId: "eng-1",
      employeeName: "Kavindu Silva",
      procedureName: "Semi-Annual Performance Appraisal",
      stepName: "Employee Self-Evaluation",
      stepDescription: "Employee completes a comprehensive self-evaluation form assessing their performance, achievements, skills development, and goals for the review period.",
      stepType: "evaluation",
      status: "completed",
      dueDate: new Date("2024-01-08"),
      completedDate: "2024-01-06T13:20:00Z",
      attendees: ["Kavindu Silva"],
      evaluationFormId: "form-employee-self",
      evaluationFormName: "Employee Self-Evaluation Form",
      contextTitle: "Complete Your Self-Evaluation",
      contextSubtitle: "For: Kavindu Silva",
      contextBadge: "Your Task"
    }))

    // Task 2: Performance Discussion Meeting
    tasks.push(createTask({
      id: `${eng1AssignmentId}-stage-evaluation-meeting`,
      assignmentId: eng1AssignmentId,
      stepId: "stage-evaluation-meeting",
      employeeId: "eng-1",
      employeeName: "Kavindu Silva",
      procedureName: "Semi-Annual Performance Appraisal",
      stepName: "Performance Discussion Meeting",
      stepDescription: "One-on-one meeting between employee and their direct manager to discuss the self-evaluation, performance, feedback, goals, and development opportunities.",
      stepType: "meeting",
      status: "pending",
      dueDate: baseDate,
      completedDate: null,
      attendees: ["Kavindu Silva", "Manager Level 1 (Rajitha Wickramasinghe)"],
      contextTitle: "Attend Performance Discussion",
      contextSubtitle: "For: Kavindu Silva",
      contextBadge: "Your Task"
    }))
  }

  // Sort tasks by status priority, then due date, then ID for consistent order
  return tasks.sort((a, b) => {
    const statusPriority = { "pending": 0, "in_progress": 1, "overdue": 2, "completed": 3, "cancelled": 4 }
    const statusDiff = (statusPriority[a.status] || 5) - (statusPriority[b.status] || 5)
    if (statusDiff !== 0) return statusDiff
    
    if (a.dueDate && b.dueDate) {
      const dateDiff = a.dueDate.getTime() - b.dueDate.getTime()
      if (dateDiff !== 0) return dateDiff
    } else if (a.dueDate) return -1
    else if (b.dueDate) return 1
    
    return a.id.localeCompare(b.id)
  })
}

// Convert workflow assignments to tasks (for current employee and employees they manage)
// NOTE: This function is kept for backward compatibility but hardcoded tasks are used for demo users
const convertAssignmentsToTasks = (
  assignments: WorkflowAssignment[],
  currentEmployeeId: string,
  currentUserName: string,
  currentRole: "admin" | "employee" | "manager"
): Task[] => {
  // Use hardcoded tasks for demo users (admin-1, eng-manager-1, eng-1)
  if (currentEmployeeId === "admin-1" || currentEmployeeId === "eng-manager-1" || currentEmployeeId === "eng-1") {
    return getHardcodedTasks(currentEmployeeId)
  }

  const tasks: Task[] = []
  const now = new Date()

  // Sort assignments by a stable key (ID) to ensure consistent order
  const sortedAssignments = [...assignments].sort((a, b) => a.id.localeCompare(b.id))

  sortedAssignments.forEach((assignment) => {
    const template = getWorkflowTemplate(assignment.workflowTemplateId)
    const employee = getEmployee(assignment.employeeId)

    if (!template || !employee) return

    // Helper function to create task from stage
    const createTaskFromStage = (stage: ReviewStage, skipCompletionCheck: boolean = false): void => {
      // Skip stages that don't exist in stageCompletions (they were filtered out during initialization)
      // Exception: Admin can see all stages, so skip this check for admin
      if (!skipCompletionCheck && !(stage.id in assignment.stageCompletions)) return

      // Get context information
      const context = getTaskContext(employee, currentEmployeeId, currentUserName, stage, template.name)
      const contextDisplay = formatTaskContextDisplay(context)
      const completion = assignment.stageCompletions[stage.id]
      const isCompleted = completion?.completed || false
      const dueDate = calculateDueDate(
        stage,
        assignment.startDate,
        assignment.endDate
      )

      // Determine task status
      let status: Task["status"] = "pending"
      if (assignment.status === "cancelled") {
        status = "cancelled"
      } else if (isCompleted) {
        status = "completed"
      } else if (dueDate && isBefore(dueDate, now) && !isCompleted) {
        status = "overdue"
      } else if (assignment.currentStageId === stage.id) {
        status = "in_progress"
      }

      // Get evaluation form name if exists
      const form = stage.evaluationFormId
        ? getEvaluationForm(stage.evaluationFormId)
        : null

      // Format attendees
      const attendees: string[] = []
      if (stage.attendees) {
        stage.attendees.forEach((attendee) => {
          if (attendee === "employee") {
            attendees.push(`${employee.firstName} ${employee.lastName}`)
          } else {
            const levelMatch = attendee.match(/manager_level_(\d+)/)
            if (levelMatch && employee.managers) {
              const level = Number.parseInt(levelMatch[1], 10)
              const manager = employee.managers.find((m) => m.level === level)
              if (manager) {
                if (manager.isExternal && manager.externalName) {
                  attendees.push(
                    `Manager L${level} (${manager.externalName})`
                  )
                } else if (manager.employeeId) {
                  const managerEmp = getEmployee(manager.employeeId)
                  if (managerEmp) {
                    attendees.push(
                      `Manager L${level} (${managerEmp.firstName} ${managerEmp.lastName})`
                    )
                  }
                }
              }
            }
          }
        })
      }

      const task: Task = {
        id: `${assignment.id}-${stage.id}`,
        assignmentId: assignment.id,
        stepId: stage.id,
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        procedureName: template.name,
        stepName: stage.name,
        stepDescription: stage.description || "",
        stepType: stage.type,
        status,
        dueDate,
        completedDate: completion?.completedDate || null,
        attendees,
        evaluationFormId: stage.evaluationFormId,
        evaluationFormName: form?.name,
        isRequired: stage.required,
        formData: completion?.formData,
        // Add context information
        contextTitle: contextDisplay.title,
        contextSubtitle: contextDisplay.subtitle,
        contextBadge: contextDisplay.badge,
      }

      tasks.push(task)
    }

    // ADMIN ROLE: Only show tasks where admin is involved (as employee or manager)
    if (currentRole === "admin") {
      // Check if admin is the employee for this assignment
      const isAdminEmployee = assignment.employeeId === currentEmployeeId
      
      // Check if admin manages this employee
      const adminManagesEmployee = employee.managers?.some(
        (m) => m.employeeId === currentEmployeeId
      )

      // Skip if admin is not involved in this assignment
      if (!isAdminEmployee && !adminManagesEmployee) return

      // Sort stages by order to ensure consistent processing order
      const sortedStages = [...template.stages].sort((a, b) => a.order - b.order)
      sortedStages.forEach((stage) => {
        // Skip stages that don't exist in stageCompletions (they were filtered out during initialization)
        if (!(stage.id in assignment.stageCompletions)) return
        
        // Check if admin is involved in this stage
        let isAdminInvolved = false
        
        if (isAdminEmployee) {
          // Admin is the employee - show if stage involves employee
          isAdminInvolved = stage.attendees?.includes("employee") || false
        } else if (adminManagesEmployee && stage.attendees) {
          // Admin is a manager - check if they're involved in this stage
          stage.attendees.forEach((attendee) => {
            if (attendee.startsWith("manager_level_")) {
              const levelMatch = attendee.match(/manager_level_(\d+)/)
              if (levelMatch && employee.managers) {
                const level = Number.parseInt(levelMatch[1], 10)
                const manager = employee.managers.find((m) => m.level === level)
                if (manager?.employeeId === currentEmployeeId) {
                  isAdminInvolved = true
                }
              }
            }
          })
        }
        
        // Skip if admin is not involved in this stage
        if (!isAdminInvolved) return
        
        createTaskFromStage(stage)
      })
      return // Continue to next assignment
    }

    // EMPLOYEE ROLE: Only show tasks where current user is the employee
    if (currentRole === "employee") {
      // Only process if this assignment belongs to the current employee
      if (assignment.employeeId !== currentEmployeeId) return

      // Sort stages by order to ensure consistent processing order
      const sortedStages = [...template.stages].sort((a, b) => a.order - b.order)
      sortedStages.forEach((stage) => {
        // Employee only sees stages where they are an attendee
        const isCurrentUserInvolved = stage.attendees?.includes("employee") || false
        if (!isCurrentUserInvolved) return
        
        createTaskFromStage(stage)
      })
      return // Continue to next assignment
    }

    // MANAGER ROLE: Only show tasks for employees they manage
    if (currentRole === "manager") {
      // Check if current user manages this employee
      const currentUserManagesEmployee = employee.managers?.some(
        (m) => m.employeeId === currentEmployeeId
      )

      // Skip if current user doesn't manage this employee
      if (!currentUserManagesEmployee) return

      // Sort stages by order to ensure consistent processing order
      const sortedStages = [...template.stages].sort((a, b) => a.order - b.order)
      sortedStages.forEach((stage) => {
        // Check if current user (manager) is involved in this stage
        let isCurrentUserInvolved = false
        
        if (stage.attendees) {
          stage.attendees.forEach((attendee) => {
            if (attendee.startsWith("manager_level_")) {
              const levelMatch = attendee.match(/manager_level_(\d+)/)
              if (levelMatch && employee.managers) {
                const level = Number.parseInt(levelMatch[1], 10)
                const manager = employee.managers.find((m) => m.level === level)
                if (manager?.employeeId === currentEmployeeId) {
                  isCurrentUserInvolved = true
                }
              }
            }
          })
        }
        
        // Skip if current user is not involved in this stage
        if (!isCurrentUserInvolved) return
        
        // For managers, skip the stageCompletions check (like admin) so they can see
        // approval stages and other stages even if they're not in stageCompletions yet
        createTaskFromStage(stage, true)
      })
      return // Continue to next assignment
    }
  })

  return tasks
}

const getStatusBadgeVariant = (status: Task["status"]) => {
  switch (status) {
    case "completed":
      return "default"
    case "in_progress":
      return "secondary"
    case "overdue":
      return "destructive"
    case "cancelled":
      return "outline"
    case "pending":
      return "outline"
    default:
      return "outline"
  }
}

const getStepTypeIcon = (type: Task["stepType"]) => {
  switch (type) {
    case "evaluation":
      return <IconFileText className="size-4" />
    case "meeting":
      return <IconMessageCircle className="size-4" />
    case "review":
      return <IconCheck className="size-4" />
    case "approval":
      return <IconCheck className="size-4" />
    default:
      return <IconFileText className="size-4" />
  }
}

const getStepTypeColor = (type: Task["stepType"]) => {
  switch (type) {
    case "evaluation":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "meeting":
      return "bg-purple-50 text-purple-700 border-purple-200"
    case "review":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "approval":
      return "bg-green-50 text-green-700 border-green-200"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

// Droppable Column Component
function DroppableColumn({
  id,
  title,
  tasks,
  children,
}: Readonly<{
  id: string
  title: string
  tasks: Task[]
  children: React.ReactNode
}>) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[600px] rounded-lg border-2 p-4 transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

// Draggable Task Card Component
function DraggableTaskCard({
  task,
  onClick,
}: Readonly<{
  task: Task
  onClick: () => void
}>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isOverdue =
    task.status !== "completed" &&
    task.status !== "cancelled" &&
    task.dueDate &&
    isBefore(task.dueDate, new Date())

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/50 ${
        isDragging ? "ring-2 ring-primary" : ""
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none"
              >
                <IconGripVertical className="size-4 text-muted-foreground" />
              </div>
              {getStepTypeIcon(task.stepType)}
              <CardTitle className="text-lg">{task.contextTitle || task.stepName}</CardTitle>
            </div>
            {task.contextSubtitle && (
              <CardDescription className="line-clamp-2 font-medium text-foreground">
                {task.contextSubtitle}
              </CardDescription>
            )}
            {!task.contextSubtitle && (
              <CardDescription className="line-clamp-2">
                {task.stepDescription || task.procedureName}
              </CardDescription>
            )}
          </div>
          <Badge
            variant={getStatusBadgeVariant(task.status)}
            className="shrink-0"
          >
            {task.status === "in_progress"
              ? "In Progress"
              : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Context Badge and Task Type */}
        <div className="flex items-center gap-2 flex-wrap">
          {task.contextBadge && (
            <Badge variant="secondary" className="text-xs font-semibold">
              {task.contextBadge}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={`${getStepTypeColor(task.stepType)} text-xs capitalize`}
          >
            {task.stepType}
          </Badge>
          {task.isRequired && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
          {task.evaluationFormName && (
            <Badge variant="outline" className="text-xs">
              <IconFileText className="size-3 mr-1" />
              Form
            </Badge>
          )}
        </div>

        {/* Employee and Procedure Info */}
        <div className="space-y-1 text-sm">
          <div className="text-muted-foreground">
            <span className="font-medium">For Employee:</span> {task.employeeName}
          </div>
          <div className="text-muted-foreground">
            <span className="font-medium">Procedure:</span> {task.procedureName}
          </div>
        </div>

        {/* Due Date */}
        {task.dueDate && (
          <div className="flex items-center gap-2 text-sm">
            <IconCalendar
              className={`size-4 ${
                isOverdue ? "text-destructive" : "text-muted-foreground"
              }`}
            />
            <span className={isOverdue ? "text-destructive font-medium" : ""}>
              Due: {format(task.dueDate, "MMM dd, yyyy")}
            </span>
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                <IconAlertCircle className="size-3 mr-1" />
                Overdue
              </Badge>
            )}
          </div>
        )}

        {/* Attendees */}
        {task.attendees.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <IconUsers className="size-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {task.attendees.slice(0, 2).map((attendee) => (
                <Badge key={attendee} variant="outline" className="text-xs">
                  {attendee}
                </Badge>
              ))}
              {task.attendees.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{task.attendees.length - 2} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Completed Date */}
        {task.completedDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconCheck className="size-4" />
            <span>
              Completed: {format(new Date(task.completedDate), "MMM dd, yyyy")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function TasksPage() {
  const { currentUserId, currentUserName, currentRole } = useRole()

  const [assignments, setAssignments] = React.useState<WorkflowAssignment[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [completedDateFrom, setCompletedDateFrom] = React.useState<Date | undefined>(undefined)
  const [completedDateTo, setCompletedDateTo] = React.useState<Date | undefined>(undefined)
  const [detailSheetOpen, setDetailSheetOpen] = React.useState(false)
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null)
  const [isMounted, setIsMounted] = React.useState(false)
  const [activeTask, setActiveTask] = React.useState<Task | null>(null)
  const isUpdatingFromDrag = React.useRef(false)

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Initialize workflow data
  React.useEffect(() => {
    setIsMounted(true)
    initializeWorkflowData(demoEmployees)
    setAssignments(workflowAssignments)
  }, [])

  // Convert assignments to tasks (for current user and employees they manage)
  React.useEffect(() => {
    // Skip regeneration if we're updating from drag-and-drop to preserve order
    if (isUpdatingFromDrag.current) {
      isUpdatingFromDrag.current = false
      return
    }
    
    const convertedTasks = convertAssignmentsToTasks(
      assignments,
      currentUserId,
      currentUserName,
      currentRole
    )
    // Sort tasks by a stable key to maintain consistent order:
    // 1. Status (pending/in_progress first, then completed)
    // 2. Due date (earliest first, nulls last)
    // 3. Task ID (for consistent ordering)
    const sortedTasks = [...convertedTasks].sort((a, b) => {
      // First sort by status priority
      const statusPriority = { "pending": 0, "in_progress": 1, "overdue": 2, "completed": 3, "cancelled": 4 }
      const statusDiff = (statusPriority[a.status] || 5) - (statusPriority[b.status] || 5)
      if (statusDiff !== 0) return statusDiff
      
      // Then by due date (earliest first)
      if (a.dueDate && b.dueDate) {
        const dateDiff = a.dueDate.getTime() - b.dueDate.getTime()
        if (dateDiff !== 0) return dateDiff
      } else if (a.dueDate) return -1
      else if (b.dueDate) return 1
      
      // Finally by task ID for stable ordering
      return a.id.localeCompare(b.id)
    })
    setTasks(sortedTasks)
  }, [assignments, currentUserId, currentUserName, currentRole])

  // Filter tasks
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((task) => {
      const matchesType = typeFilter === "all" || task.stepType === typeFilter
      const matchesSearch =
        globalFilter === "" ||
        task.stepName.toLowerCase().includes(globalFilter.toLowerCase()) ||
        task.procedureName.toLowerCase().includes(globalFilter.toLowerCase()) ||
        task.stepDescription.toLowerCase().includes(globalFilter.toLowerCase())

      return matchesType && matchesSearch
    })
  }, [tasks, typeFilter, globalFilter])

  // Separate tasks into columns
  const pendingTasks = React.useMemo(() => {
    return filteredTasks.filter(
      (task) =>
        task.status !== "completed" && task.status !== "cancelled"
    )
  }, [filteredTasks])

  const completedTasks = React.useMemo(() => {
    return filteredTasks.filter((task) => {
      if (task.status !== "completed") return false
      
      // Filter by date range if dates are set
      if (completedDateFrom || completedDateTo) {
        if (!task.completedDate) return false
        
        const completedDate = startOfDay(new Date(task.completedDate))
        const fromDate = completedDateFrom ? startOfDay(completedDateFrom) : null
        const toDate = completedDateTo ? endOfDay(completedDateTo) : null
        
        if (fromDate && toDate) {
          return isWithinInterval(completedDate, { start: fromDate, end: toDate })
        } else if (fromDate) {
          return !isBefore(completedDate, fromDate)
        } else if (toDate) {
          return !isAfter(completedDate, toDate)
        }
      }
      
      return true
    })
  }, [filteredTasks, completedDateFrom, completedDateTo])

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveTask(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // Find the task being dragged
    const draggedTask = tasks.find((t) => t.id === activeId)
    if (!draggedTask) {
      setActiveTask(null)
      return
    }

    // Check if dropped on a column
    if (overId === "pending-column" || overId === "completed-column") {
      const newStatus: Task["status"] =
        overId === "completed-column" ? "completed" : "pending"

      // Only update if status actually changed
      if (draggedTask.status !== newStatus) {
        // Set flag to prevent task regeneration
        isUpdatingFromDrag.current = true
        
        // Update task status
        const updatedTasks = tasks.map((task) => {
          if (task.id === activeId) {
            return {
              ...task,
              status: newStatus,
              completedDate:
                newStatus === "completed"
                  ? new Date().toISOString()
                  : task.completedDate,
            }
          }
          return task
        })
        setTasks(updatedTasks)

        // Update assignment in the backend (simulated)
        setAssignments((prevAssignments) => {
          return prevAssignments.map((assignment) => {
            if (assignment.id === draggedTask.assignmentId) {
              const updatedStageCompletions = {
                ...assignment.stageCompletions,
                [draggedTask.stepId]: {
                  ...assignment.stageCompletions[draggedTask.stepId],
                  completed: newStatus === "completed",
                  completedDate:
                    newStatus === "completed"
                      ? new Date().toISOString()
                      : assignment.stageCompletions[draggedTask.stepId]
                          ?.completedDate,
                  completedBy:
                    newStatus === "completed"
                      ? currentUserId
                      : assignment.stageCompletions[draggedTask.stepId]
                          ?.completedBy,
                },
              }

              return {
                ...assignment,
                stageCompletions: updatedStageCompletions,
                updatedAt: new Date().toISOString(),
              }
            }
            return assignment
          })
        })

        toast.success(
          `Task moved to ${newStatus === "completed" ? "Completed" : "Pending"}`
        )
      }
    } else {
      // Reordering within the same column
      const activeColumn =
        draggedTask.status === "completed" ? "completed-column" : "pending-column"
      const overColumn = overId.includes("completed-column")
        ? "completed-column"
        : "pending-column"

      if (activeColumn === overColumn) {
        // Same column reordering
        const columnTasks =
          activeColumn === "completed-column" ? completedTasks : pendingTasks
        const oldIndex = columnTasks.findIndex((t) => t.id === activeId)
        const newIndex = columnTasks.findIndex((t) => t.id === overId)

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(columnTasks, oldIndex, newIndex)
          const otherColumnTasks =
            activeColumn === "completed-column" ? pendingTasks : completedTasks

          setTasks([...reordered, ...otherColumnTasks])
        }
      }
    }

    setActiveTask(null)
  }

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-4 md:py-4">
        <div className="px-4 lg:px-6">
          <h2 className="text-2xl font-semibold">My Tasks</h2>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  const currentEmployee = getEmployee(currentUserId)

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-4 md:py-4">
      {/* Header */}
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">My Tasks</h2>
            <p className="text-muted-foreground mt-2">
              {currentEmployee
                ? `Tasks assigned to ${currentEmployee.firstName} ${currentEmployee.lastName}`
                : "View and manage your appraisal-related tasks"}
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Task Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="evaluation">Evaluation</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="approval">Approval</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Completed Tasks Date Range Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <IconCalendar className="mr-2 size-4" />
                  {completedDateFrom || completedDateTo ? (
                    <>
                      {completedDateFrom && format(completedDateFrom, "MMM dd, yyyy")}
                      {completedDateFrom && completedDateTo && " - "}
                      {completedDateTo && format(completedDateTo, "MMM dd, yyyy")}
                    </>
                  ) : (
                    <span>Completed Date Range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">From Date</Label>
                    <Calendar
                      mode="single"
                      selected={completedDateFrom}
                      onSelect={setCompletedDateFrom}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">To Date</Label>
                    <Calendar
                      mode="single"
                      selected={completedDateTo}
                      onSelect={setCompletedDateTo}
                      disabled={(date) => completedDateFrom ? isBefore(date, completedDateFrom) : false}
                    />
                  </div>
                  {(completedDateFrom || completedDateTo) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setCompletedDateFrom(undefined)
                        setCompletedDateTo(undefined)
                      }}
                    >
                      Clear Filter
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Kanban Board - 2 Columns */}
      <div className="px-4 lg:px-6">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <IconFileText className="size-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No tasks found
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {globalFilter || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "You don't have any tasks assigned yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event) => {
              const task = tasks.find((t) => t.id === event.active.id)
              setActiveTask(task || null)
            }}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Column */}
              <DroppableColumn
                id="pending-column"
                title="Pending"
                tasks={pendingTasks}
              >
                <SortableContext
                  items={pendingTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {pendingTasks.map((task) => (
                    <DraggableTaskCard
                      key={task.id}
                      task={task}
                      onClick={() => {
                        setSelectedTask(task)
                        setDetailSheetOpen(true)
                      }}
                    />
                  ))}
                </SortableContext>
              </DroppableColumn>

              {/* Completed Column */}
              <DroppableColumn
                id="completed-column"
                title="Completed"
                tasks={completedTasks}
              >
                <SortableContext
                  items={completedTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {completedTasks.map((task) => (
                    <DraggableTaskCard
                      key={task.id}
                      task={task}
                      onClick={() => {
                        setSelectedTask(task)
                        setDetailSheetOpen(true)
                      }}
                    />
                  ))}
                </SortableContext>
              </DroppableColumn>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeTask ? (
                <Card className="opacity-90 rotate-3 shadow-lg border-2 border-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStepTypeIcon(activeTask.stepType)}
                          <CardTitle className="text-lg">
                            {activeTask.stepName}
                          </CardTitle>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {activeTask.stepDescription || activeTask.procedureName}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Task Detail Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-4">
          <SheetHeader>
            <SheetTitle>Task Details</SheetTitle>
            <SheetDescription>
              View detailed information about this task
            </SheetDescription>
          </SheetHeader>

          {selectedTask && (
            <div className="space-y-6 mt-6">
              {/* Task Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Task Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Task Name
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStepTypeIcon(selectedTask.stepType)}
                        <p className="text-base font-semibold">
                          {selectedTask.stepName}
                        </p>
                        <Badge
                          variant="outline"
                          className={`${getStepTypeColor(selectedTask.stepType)} capitalize`}
                        >
                          {selectedTask.stepType}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Status
                      </p>
                      <Badge
                        variant={getStatusBadgeVariant(selectedTask.status)}
                        className="mt-1"
                      >
                        {selectedTask.status === "in_progress"
                          ? "In Progress"
                          : selectedTask.status.charAt(0).toUpperCase() +
                            selectedTask.status.slice(1)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Procedure
                      </p>
                      <p className="text-base">{selectedTask.procedureName}</p>
                    </div>
                    {selectedTask.dueDate && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Due Date
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <IconCalendar className="size-4 text-muted-foreground" />
                          <p className="text-sm">
                            {format(selectedTask.dueDate, "MMM dd, yyyy")}
                          </p>
                          {selectedTask.status !== "completed" &&
                            selectedTask.status !== "cancelled" &&
                            isBefore(selectedTask.dueDate, new Date()) && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                        </div>
                      </div>
                    )}
                    {selectedTask.completedDate && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Completed Date
                        </p>
                        <p className="text-sm">
                          {format(
                            new Date(selectedTask.completedDate),
                            "MMM dd, yyyy"
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedTask.stepDescription && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Description
                      </p>
                      <p className="text-sm">{selectedTask.stepDescription}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Attendees */}
              {selectedTask.attendees.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Attendees</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.attendees.map((attendee) => (
                        <Badge key={attendee} variant="outline">
                          {attendee}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Task Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* View in Appraisals Link - Always show this */}
                  <div className="pb-3 border-b">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        // Navigate to appraisals page and open the corresponding appraisal
                        // The assignmentId is the workflowAssignmentId used in appraisals
                        window.location.href = `/appraisals?assignmentId=${selectedTask.assignmentId}&stepId=${selectedTask.stepId}`
                      }}
                    >
                      <IconFileText className="size-4 mr-2" />
                      View in Appraisals & Review Steps
                      <IconExternalLink className="size-4 ml-2" />
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      View this task in the context of the full appraisal review process
                    </p>
                  </div>
                  
                  {/* Evaluation Task Actions */}
                  {selectedTask.stepType === "evaluation" && (
                    <div className="space-y-3">
                      {selectedTask.evaluationFormName && (
                        <div>
                          <p className="text-sm font-medium mb-2">
                            {selectedTask.evaluationFormName}
                          </p>
                        </div>
                      )}
                      {selectedTask.status === "completed" ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="default"
                            className="flex-1 min-w-[120px]"
                            onClick={() => {
                              // Navigate to form view page
                              const formUrl = `/forms/view/${selectedTask.evaluationFormId}?assignmentId=${selectedTask.assignmentId}&stepId=${selectedTask.stepId}`
                              window.open(formUrl, "_blank")
                            }}
                          >
                            <IconEye className="size-4 mr-2" />
                            View Form
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 min-w-[120px]"
                            onClick={() => {
                              // Download form data as PDF/JSON
                              const formData = selectedTask.formData || {}
                              const dataStr = JSON.stringify(formData, null, 2)
                              const dataBlob = new Blob([dataStr], { type: "application/json" })
                              const url = URL.createObjectURL(dataBlob)
                              const link = document.createElement("a")
                              link.href = url
                              link.download = `${selectedTask.evaluationFormName || "form"}-${selectedTask.stepName}-${format(new Date(), "yyyy-MM-dd")}.json`
                              link.click()
                              URL.revokeObjectURL(url)
                              toast.success("Form data downloaded")
                            }}
                          >
                            <IconDownload className="size-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="default"
                          className="w-full"
                          onClick={() => {
                            // Navigate to form fill page
                            const formUrl = `/forms/fill/${selectedTask.evaluationFormId}?assignmentId=${selectedTask.assignmentId}&stepId=${selectedTask.stepId}`
                            window.open(formUrl, "_blank")
                          }}
                        >
                          <IconFileText className="size-4 mr-2" />
                          Fill Form
                          <IconExternalLink className="size-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Meeting Task Actions */}
                  {selectedTask.stepType === "meeting" && (
                    <div className="space-y-3">
                      {selectedTask.status === "completed" ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <IconCheck className="size-5 text-green-600" />
                            <p className="text-sm font-medium text-green-600">
                              Meeting Completed
                            </p>
                          </div>
                          {selectedTask.completedDate && (
                            <p className="text-xs text-muted-foreground">
                              Completed on {format(new Date(selectedTask.completedDate), "MMM dd, yyyy 'at' h:mm a")}
                            </p>
                          )}
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              // View meeting notes/summary
                              toast.info("Meeting notes and summary would be displayed here")
                            }}
                          >
                            <IconEye className="size-4 mr-2" />
                            View Meeting Notes
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Button
                            variant="default"
                            className="w-full"
                            onClick={() => {
                              // Join meeting (could be Zoom, Teams, etc.)
                              const meetingUrl = `/meetings/join/${selectedTask.assignmentId}/${selectedTask.stepId}`
                              window.open(meetingUrl, "_blank")
                            }}
                          >
                            <IconVideo className="size-4 mr-2" />
                            Join Meeting
                            <IconExternalLink className="size-4 ml-2" />
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              // View meeting details
                              toast.info("Meeting details and agenda would be displayed here")
                            }}
                          >
                            <IconCalendar className="size-4 mr-2" />
                            View Meeting Details
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Review Task Actions */}
                  {selectedTask.stepType === "review" && (
                    <div className="space-y-3">
                      {selectedTask.status === "completed" ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <IconCheck className="size-5 text-green-600" />
                            <p className="text-sm font-medium text-green-600">
                              Review Completed
                            </p>
                          </div>
                          {selectedTask.completedDate && (
                            <p className="text-xs text-muted-foreground">
                              Completed on {format(new Date(selectedTask.completedDate), "MMM dd, yyyy")}
                            </p>
                          )}
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              // View review details
                              const reviewUrl = `/reviews/view/${selectedTask.assignmentId}/${selectedTask.stepId}`
                              window.open(reviewUrl, "_blank")
                            }}
                          >
                            <IconEye className="size-4 mr-2" />
                            View Review
                            <IconExternalLink className="size-4 ml-2" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="default"
                          className="w-full"
                          onClick={() => {
                            // Start review process
                            const reviewUrl = `/reviews/start/${selectedTask.assignmentId}/${selectedTask.stepId}`
                            window.open(reviewUrl, "_blank")
                          }}
                        >
                          <IconClipboardCheck className="size-4 mr-2" />
                          Start Review
                          <IconExternalLink className="size-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Approval Task Actions */}
                  {selectedTask.stepType === "approval" && (
                    <div className="space-y-3">
                      {selectedTask.status === "completed" ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <IconCheck className="size-5 text-green-600" />
                            <p className="text-sm font-medium text-green-600">
                              Approval Completed
                            </p>
                          </div>
                          {selectedTask.completedDate && (
                            <p className="text-xs text-muted-foreground">
                              Approved on {format(new Date(selectedTask.completedDate), "MMM dd, yyyy")}
                            </p>
                          )}
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              // View approval details
                              const approvalUrl = `/approvals/view/${selectedTask.assignmentId}/${selectedTask.stepId}`
                              window.open(approvalUrl, "_blank")
                            }}
                          >
                            <IconEye className="size-4 mr-2" />
                            View Approval
                            <IconExternalLink className="size-4 ml-2" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Button
                            variant="default"
                            className="w-full"
                            onClick={() => {
                              // Review and approve
                              const approvalUrl = `/approvals/review/${selectedTask.assignmentId}/${selectedTask.stepId}`
                              window.open(approvalUrl, "_blank")
                            }}
                          >
                            <IconThumbUp className="size-4 mr-2" />
                            Review & Approve
                            <IconExternalLink className="size-4 ml-2" />
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Review the appraisal details before approving
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
