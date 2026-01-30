// Shared workflow data store
// In a real app, this would be replaced with API calls or a database

import type {
  WorkflowTemplate,
  WorkflowAssignment,
  EvaluationForm,
  Employee,
} from "./types"
import { demoWorkflowTemplates } from "./data/demo-workflow-templates"
import { demoEvaluationForms } from "./data/demo-evaluation-forms"
import { filterStepsByEmployeeRole } from "./employee-role-utils"

// In-memory data stores (would be replaced with API/database in production)
export let workflowTemplates: WorkflowTemplate[] = []
export let workflowAssignments: WorkflowAssignment[] = []
// Initialize evaluation forms immediately since they don't depend on employees
export let evaluationForms: EvaluationForm[] = demoEvaluationForms
export let employees: Employee[] = []

// Initialize with sample data
export function initializeWorkflowData(initialEmployees: Employee[] = []) {
  // Ensure employees array is initialized
  if (!initialEmployees || !Array.isArray(initialEmployees)) {
    employees = []
    workflowAssignments = []
    return
  }
  
  employees = initialEmployees || []
  
  // Load workflow templates from demo data first (needed for filtering)
  workflowTemplates = demoWorkflowTemplates
  
  // Generate workflow assignments based on employees' assigned procedures
  workflowAssignments = []
  const now = new Date()
  
  initialEmployees.forEach((employee) => {
    if (employee.assignedWorkflowIds && employee.assignedWorkflowIds.length > 0) {
      employee.assignedWorkflowIds.forEach((workflowId, index) => {
        const template = workflowTemplates.find((t) => t.id === workflowId)
        if (!template) return
        
        // Filter steps based on employee role
        const allowedSteps = filterStepsByEmployeeRole(template.steps, employee, initialEmployees)
        if (allowedSteps.length === 0) return // Skip if no steps are allowed for this employee
        
        // Calculate dates based on interval
        const startDate = new Date(now)
        startDate.setMonth(startDate.getMonth() - index) // Stagger assignments
        
        let endDate: Date | undefined
        const interval = template.interval
        
        switch (interval.type) {
          case "quarterly":
            endDate = new Date(startDate)
            endDate.setMonth(endDate.getMonth() + 3)
            break
          case "monthly":
            endDate = new Date(startDate)
            endDate.setMonth(endDate.getMonth() + 1)
            break
          case "annually":
            endDate = new Date(startDate)
            endDate.setFullYear(endDate.getFullYear() + 1)
            break
          case "biannually":
            endDate = new Date(startDate)
            endDate.setMonth(endDate.getMonth() + 6)
            break
          case "biweekly":
            endDate = new Date(startDate)
            endDate.setDate(endDate.getDate() + 14)
            break
          case "weekly":
            endDate = new Date(startDate)
            endDate.setDate(endDate.getDate() + 7)
            break
          case "daily":
            endDate = new Date(startDate)
            endDate.setDate(endDate.getDate() + 1)
            break
          case "custom":
            endDate = interval.value && interval.unit
              ? (() => {
                  const customEnd = new Date(startDate)
                  if (interval.unit === "days") customEnd.setDate(customEnd.getDate() + interval.value)
                  else if (interval.unit === "weeks") customEnd.setDate(customEnd.getDate() + interval.value * 7)
                  else if (interval.unit === "months") customEnd.setMonth(customEnd.getMonth() + interval.value)
                  else if (interval.unit === "years") customEnd.setFullYear(customEnd.getFullYear() + interval.value)
                  return customEnd
                })()
              : undefined
            break
        }
        
        // Determine status based on dates
        let status: "not_started" | "in_progress" | "completed" | "cancelled" = "not_started"
        if (endDate && endDate < now) {
          status = Math.random() > 0.3 ? "completed" : "in_progress" // Mix of completed and in progress
        } else if (startDate <= now) {
          status = Math.random() > 0.2 ? "in_progress" : "not_started"
        }
        
        // If employee is inactive, mark as cancelled
        if (employee.status === "Inactive" && status !== "completed") {
          status = "cancelled"
        }
        
        // Helper function to generate realistic form data based on form ID
        const generateFormData = (formId: string, stepType: string, isEmployee: boolean): Record<string, unknown> => {
          const form = evaluationForms.find((f) => f.id === formId)
          if (!form) return {}
          
          const formData: Record<string, unknown> = {}
          
          form.fields.forEach((field) => {
            switch (field.type) {
              case "rating":
                // Realistic ratings: employees rate themselves 3-4, managers rate employees 3-5
                formData[field.id] = isEmployee 
                  ? Math.floor(Math.random() * 2) + 3 // 3-4 for self-evaluation
                  : Math.floor(Math.random() * 3) + 3 // 3-5 for manager evaluation
                break
              case "textarea":
                // Realistic text responses based on field label
                if (field.label.toLowerCase().includes("achievement")) {
                  formData[field.id] = "Successfully completed multiple projects on time. Led the implementation of new features and improved code quality. Collaborated effectively with cross-functional teams."
                } else if (field.label.toLowerCase().includes("challenge")) {
                  formData[field.id] = "Faced some technical challenges with legacy systems. Worked through them by seeking guidance from senior team members and additional research."
                } else if (field.label.toLowerCase().includes("improvement") || field.label.toLowerCase().includes("development")) {
                  formData[field.id] = "Would like to improve leadership skills and take on more mentoring responsibilities. Interested in learning new technologies and frameworks."
                } else if (field.label.toLowerCase().includes("goal")) {
                  formData[field.id] = "Continue to deliver high-quality work. Take on more complex projects. Mentor junior team members. Contribute to architectural decisions."
                } else if (field.label.toLowerCase().includes("feedback")) {
                  formData[field.id] = isEmployee
                    ? "Appreciate the support and guidance from management. Would like more opportunities for professional development."
                    : "Employee shows strong technical skills and good collaboration. Recommend for promotion consideration. Areas for growth: leadership and strategic thinking."
                } else {
                  formData[field.id] = "This is a comprehensive response covering all relevant aspects of the evaluation criteria."
                }
                break
              case "checkbox":
                // Select 2-4 random options
                const selectedOptions: string[] = []
                if (field.options) {
                  const shuffled = [...field.options].sort(() => Math.random() - 0.5)
                  const count = Math.floor(Math.random() * 3) + 2 // 2-4 options
                  selectedOptions.push(...shuffled.slice(0, Math.min(count, field.options.length)))
                }
                formData[field.id] = selectedOptions
                break
              default:
                formData[field.id] = "Response"
            }
          })
          
          return formData
        }

        // Initialize step completions with realistic data (only for allowed steps)
        const stepCompletions: Record<string, { completed: boolean; completedDate?: string; completedBy?: string; formData?: Record<string, unknown> }> = {}
        allowedSteps.forEach((step, stepIndex) => {
          const isCompleted = status === "completed" || (status === "in_progress" && stepIndex < template.steps.length - 1 && Math.random() > 0.3)
          
          // Determine who completed this step
          let completedBy: string | undefined
          if (step.attendees?.includes("employee")) {
            completedBy = employee.id
          } else if (step.attendees) {
            // Find manager level from attendees
            const managerLevelMatch = step.attendees.find(a => a.startsWith("manager_level_"))?.match(/manager_level_(\d+)/)
            if (managerLevelMatch && employee.managers) {
              const level = Number.parseInt(managerLevelMatch[1], 10)
              const manager = employee.managers.find((m) => m.level === level)
              if (manager?.employeeId) {
                completedBy = manager.employeeId
              }
            }
          }
          
          // Generate realistic form data if step has a form
          const formData = isCompleted && step.evaluationFormId
            ? generateFormData(step.evaluationFormId, step.type, step.attendees?.includes("employee") || false)
            : undefined
          
          stepCompletions[step.id] = {
            completed: isCompleted,
            completedDate: isCompleted 
              ? new Date(startDate.getTime() + (stepIndex + 1) * (endDate ? (endDate.getTime() - startDate.getTime()) / template.steps.length : 86400000)).toISOString()
              : undefined,
            completedBy,
            formData,
          }
        })
        
        // Find current step (first incomplete step from allowed steps)
        const currentStep = allowedSteps.find((step) => !stepCompletions[step.id]?.completed)
        
        const assignment: WorkflowAssignment = {
          id: `assignment-${employee.id}-${workflowId}-${index}`,
          workflowTemplateId: workflowId,
          employeeId: employee.id,
          status,
          startDate: startDate.toISOString(),
          endDate: endDate?.toISOString(),
          currentStepId: currentStep?.id,
          stepCompletions,
          meetings: [],
          createdAt: startDate.toISOString(),
          updatedAt: status === "completed" && endDate ? endDate.toISOString() : now.toISOString(),
        }
        
        workflowAssignments.push(assignment)
      })
    }
  })
  
  // Ensure evaluation forms are loaded (they're already initialized above, but refresh if needed)
  if (evaluationForms.length === 0) {
    evaluationForms = demoEvaluationForms
  }
}

// Helper functions
export function getWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((w) => w.id === id)
}

export function getWorkflowAssignmentsForEmployee(
  employeeId: string
): WorkflowAssignment[] {
  return workflowAssignments.filter((a) => a.employeeId === employeeId)
}

export function getEvaluationForm(id: string): EvaluationForm | undefined {
  return evaluationForms.find((f) => f.id === id)
}

export function getEmployee(id: string): Employee | undefined {
  return employees.find((e) => e.id === id)
}
