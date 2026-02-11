// Shared types for Performance & Appraisal Management

export type ManagerLevel = {
  level: number
  employeeId?: string
  externalName?: string
  externalEmail?: string
  isExternal?: boolean
  isEvaluationResponsible?: boolean
}

export type Employee = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  position: string
  status: "Active" | "Inactive"
  hireDate: string
  address: string
  city: string
  state: string
  zipCode: string
  emergencyContact: string
  emergencyPhone: string
  managers?: ManagerLevel[]
  assignedWorkflowIds?: string[] // Multiple procedures can be assigned
}

// Evaluation Form Field Types
export type FormFieldType = 
  | "text" 
  | "textarea" 
  | "number" 
  | "rating" 
  | "dropdown" 
  | "checkbox" 
  | "date"
  | "file"

export type FormField = {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  options?: string[] // For dropdown/checkbox
  min?: number // For number/rating
  max?: number // For number/rating
  placeholder?: string
  helpText?: string
}

// Evaluation Form Template
export type EvaluationForm = {
  id: string
  name: string
  description: string
  fields: FormField[]
  createdAt: string
  updatedAt: string
}

// Meeting Frequency Types
export type FrequencyType = 
  | "daily"
  | "weekly" 
  | "biweekly"
  | "monthly" 
  | "quarterly" 
  | "biannually"
  | "annually"
  | "custom"

export type MeetingFrequency = {
  type: FrequencyType
  value?: number // For custom frequency (e.g., every N days/weeks/months)
  unit?: "days" | "weeks" | "months" // For custom frequency
}

// Manager Level Meeting Configuration
export type ManagerLevelMeeting = {
  managerLevel: number // 1 = primary manager, 2 = secondary, etc.
  frequency: MeetingFrequency
  required: boolean // Whether this meeting is required
  evaluationFormId?: string // Form to be filled before/after meeting
}

// Notification Settings
export type NotificationSettings = {
  meetingReminderDays: number // Days before meeting to send reminder (e.g., 7 for 1 week)
  formReminderDays: number // Days before form due date to send reminder
  enabled: boolean
  channels: ("email" | "in-app" | "sms")[]
}

// Review Stage
export type ReviewStage = {
  id: string
  name: string
  description: string
  order: number
  type: "evaluation" | "meeting" | "review" | "approval"
  evaluationFormId?: string
  managerLevel?: number // For manager-specific stages (deprecated, use responsiblePersons instead)
  attendees?: string[] // Who should attend/participate in this stage (e.g., ["employee", "manager_level_1", "manager_level_2"])
  dueDateType?: "before_interval" | "on_interval" | "after_interval" | "custom" // Relative to appraisal date
  dueDateOffset?: number // Days offset (negative for before, 0 for on, positive for after)
  dueDateUnit?: "days" | "weeks" | "months" // Unit for offset (only for custom)
  required: boolean
  requiredStageIds?: string[] // IDs of stages that must be completed before this stage can proceed (e.g., meeting requires both employee and manager evaluation forms)
  reminderSettings?: {
    enabled: boolean
    reminderDays: number // Days before due date to send reminder (e.g., 7 for 7 days before)
    channels?: ("email" | "in-app" | "sms")[] // Notification channels for this stage
  }
}

// Workflow Template
export type WorkflowTemplate = {
  id: string
  name: string
  description: string
  applicablePositions: string[] // e.g., ["Software Engineer", "Senior Software Engineer"]
  applicableDepartments: string[] // e.g., ["Engineering"]
  stages: ReviewStage[]
  meetingFrequencies: ManagerLevelMeeting[]
  notificationSettings: NotificationSettings
  interval: MeetingFrequency // How often this procedure runs (bi-weekly, monthly, quarterly, yearly, custom)
  managerLevels?: number[] // Available manager levels for this procedure (e.g., [1, 2, 3, 4])
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Workflow Assignment (Instance)
export type WorkflowAssignment = {
  id: string
  workflowTemplateId: string
  employeeId: string
  status: "not_started" | "in_progress" | "completed" | "cancelled"
  startDate: string
  endDate?: string
  currentStageId?: string
  stageCompletions: Record<string, {
    completed: boolean
    completedDate?: string
    completedBy?: string
    formData?: Record<string, unknown>
  }>
  meetings: WorkflowMeeting[]
  managerOverrides?: ManagerLevel[] // Assignment-specific manager overrides (takes precedence over employee's managers)
  createdAt: string
  updatedAt: string
}

// Workflow Meeting Instance
export type WorkflowMeeting = {
  id: string
  workflowAssignmentId: string
  managerLevel: number
  scheduledDate: string
  actualDate?: string
  status: "scheduled" | "completed" | "cancelled" | "rescheduled"
  attendees: string[] // Employee IDs
  notes?: string
  evaluationFormId?: string
  formCompleted: boolean
  formCompletedDate?: string
  notificationsSent: {
    meetingReminder?: string
    formReminder?: string
  }
}

// Appraisal (linked to workflow)
export type Appraisal = {
  id: string
  workflowAssignmentId: string
  employeeId: string
  employeeName: string
  employeeEmail: string
  department: string
  position: string
  reviewPeriod: string
  reviewType: "Annual" | "Mid-Year" | "Quarterly" | "Probationary" | "Custom"
  status: "Draft" | "In Progress" | "Under Review" | "Completed" | "Cancelled"
  overallRating: number | null
  reviewers: string[]
  startDate: string
  dueDate: string
  completedDate: string | null
  goals: string[]
  achievements: string[]
  areasForImprovement: string[]
  comments: string
  createdAt: string
  updatedAt: string
}

// Notification Types
export type NotificationCategory = 
  | "evaluation_pending"
  | "evaluation_completed"
  | "action_required"
  | "meeting_scheduled"
  | "meeting_reminder"
  | "form_due"
  | "form_overdue"
  | "stage_completed"
  | "assignment_created"
  | "system"

export type Notification = {
  id: string
  userId: string // User who should receive this notification
  category: NotificationCategory
  title: string
  message: string
  read: boolean
  createdAt: string
  link?: string // Optional link to relevant page
  metadata?: {
    assignmentId?: string
    stageId?: string
    employeeId?: string
    meetingId?: string
    formId?: string
    [key: string]: unknown
  }
}
