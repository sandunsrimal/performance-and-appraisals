// Utility functions for determining employee roles and filtering workflow steps

import type { Employee, WorkflowStep } from "./types"
import { getEmployee } from "./workflow-data"

/**
 * Determines the role category of an employee based on their manager hierarchy
 */
export type EmployeeRoleCategory = 
  | "no_managers" // Employee with no managers (probably manager level 2 or 3)
  | "one_manager" // Employee with exactly one manager
  | "two_managers" // Employee with exactly two managers
  | "manages_others" // Employee who manages other employees

/**
 * Get the role category for an employee
 * @param employee - The employee to check
 * @param allEmployees - Array of all employees to check if this employee manages others
 */
export function getEmployeeRoleCategory(
  employee: Employee,
  allEmployees: Employee[] = []
): EmployeeRoleCategory {
  // Check if employee manages others
  const managesOthers = allEmployees.some((emp) => 
    emp.managers?.some((m) => m.employeeId === employee.id)
  )
  
  if (managesOthers) {
    return "manages_others"
  }
  
  // Count managers
  const managerCount = employee.managers?.filter(
    (m) => m.employeeId || m.externalName
  ).length || 0
  
  if (managerCount === 0) {
    return "no_managers"
  } else if (managerCount === 1) {
    return "one_manager"
  } else {
    return "two_managers"
  }
}

/**
 * Check if a step type is allowed for an employee role category
 */
export function isStepTypeAllowedForRole(
  stepType: WorkflowStep["type"],
  roleCategory: EmployeeRoleCategory
): boolean {
  switch (roleCategory) {
    case "no_managers":
      // Can have: meetings, review, approval
      return stepType === "meeting" || stepType === "review" || stepType === "approval"
    
    case "one_manager":
    case "two_managers":
      // Can have: form fill (evaluation), meetings
      return stepType === "evaluation" || stepType === "meeting"
    
    case "manages_others":
      // Can have: all steps except approval
      return stepType !== "approval"
    
    default:
      return false
  }
}

/**
 * Filter workflow steps based on employee role
 * @param steps - Array of workflow steps to filter
 * @param employee - The employee to check role for
 * @param allEmployees - Array of all employees (optional, for checking if employee manages others)
 */
export function filterStepsByEmployeeRole(
  steps: WorkflowStep[],
  employee: Employee,
  allEmployees: Employee[] = []
): WorkflowStep[] {
  const roleCategory = getEmployeeRoleCategory(employee, allEmployees)
  
  return steps.filter((step) => 
    isStepTypeAllowedForRole(step.type, roleCategory)
  )
}

/**
 * Get context information for displaying forms/meetings/tasks
 */
export interface TaskContext {
  employeeName: string // Name of the employee this task is for
  employeeId: string
  currentUserName: string // Name of the current user viewing the task
  currentUserId: string
  stepName: string
  stepType: WorkflowStep["type"]
  procedureName: string
  isForCurrentUser: boolean // Whether this task is for the current user
  userRoleInStep: "employee" | "manager" | "reviewer" | "approver" // What role the current user has in this step
}

/**
 * Get context information for a workflow step
 */
export function getTaskContext(
  employee: Employee,
  currentUserId: string,
  currentUserName: string,
  step: WorkflowStep,
  procedureName: string
): TaskContext {
  const employeeName = `${employee.firstName} ${employee.lastName}`
  const isForCurrentUser = employee.id === currentUserId
  
  // Determine user's role in this step
  let userRoleInStep: TaskContext["userRoleInStep"] = "employee"
  
  if (step.attendees) {
    if (step.attendees.includes("employee") && isForCurrentUser) {
      userRoleInStep = "employee"
    } else if (step.attendees.some((a) => a.startsWith("manager_level_"))) {
      // Check if current user is a manager for this employee
      const managerLevelMatch = step.attendees
        .find((a) => a.startsWith("manager_level_"))
        ?.match(/manager_level_(\d+)/)
      
      if (managerLevelMatch && employee.managers) {
        const level = Number.parseInt(managerLevelMatch[1], 10)
        const manager = employee.managers.find((m) => m.level === level)
        
        if (manager?.employeeId === currentUserId) {
          if (step.type === "review") {
            userRoleInStep = "reviewer"
          } else if (step.type === "approval") {
            userRoleInStep = "approver"
          } else {
            userRoleInStep = "manager"
          }
        }
      }
    }
  }
  
  return {
    employeeName,
    employeeId: employee.id,
    currentUserName,
    currentUserId,
    stepName: step.name,
    stepType: step.type,
    procedureName,
    isForCurrentUser,
    userRoleInStep,
  }
}

/**
 * Format context information for display
 */
export function formatTaskContextDisplay(context: TaskContext): {
  title: string
  subtitle: string
  badge: string
} {
  const { employeeName, currentUserName, stepName, stepType, procedureName, isForCurrentUser, userRoleInStep } = context
  
  let title = ""
  let subtitle = ""
  let badge = ""
  
  if (isForCurrentUser) {
    title = `${stepName} - ${procedureName}`
    subtitle = `For: ${employeeName} (You)`
    badge = `Your ${stepType}`
  } else {
    title = `${stepName} - ${procedureName}`
    subtitle = `For: ${employeeName} | Your Role: ${userRoleInStep.charAt(0).toUpperCase() + userRoleInStep.slice(1)}`
    badge = `${userRoleInStep.charAt(0).toUpperCase() + userRoleInStep.slice(1)} ${stepType}`
  }
  
  return { title, subtitle, badge }
}
