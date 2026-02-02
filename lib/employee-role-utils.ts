// Utility functions for determining employee roles and filtering review stages

import type { Employee, ReviewStage } from "./types"
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
 * Check if a stage type is allowed for an employee role category
 */
export function isStageTypeAllowedForRole(
  stageType: ReviewStage["type"],
  roleCategory: EmployeeRoleCategory
): boolean {
  switch (roleCategory) {
    case "no_managers":
      // Can have: meetings, review, approval
      return stageType === "meeting" || stageType === "review" || stageType === "approval"
    
    case "one_manager":
    case "two_managers":
      // Can have: form fill (evaluation), meetings
      return stageType === "evaluation" || stageType === "meeting"
    
    case "manages_others":
      // Can have: all stages except approval
      return stageType !== "approval"
    
    default:
      return false
  }
}

/**
 * Filter review stages based on employee role
 * @param stages - Array of review stages to filter
 * @param employee - The employee to check role for
 * @param allEmployees - Array of all employees (optional, for checking if employee manages others)
 */
export function filterStagesByEmployeeRole(
  stages: ReviewStage[],
  employee: Employee,
  allEmployees: Employee[] = []
): ReviewStage[] {
  const roleCategory = getEmployeeRoleCategory(employee, allEmployees)
  
  return stages.filter((stage) => 
    isStageTypeAllowedForRole(stage.type, roleCategory)
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
  stageName: string
  stageType: ReviewStage["type"]
  procedureName: string
  isForCurrentUser: boolean // Whether this task is for the current user
  userRoleInStage: "employee" | "manager" | "reviewer" | "approver" // What role the current user has in this stage
}

/**
 * Get context information for a review stage
 */
export function getTaskContext(
  employee: Employee,
  currentUserId: string,
  currentUserName: string,
  stage: ReviewStage,
  procedureName: string
): TaskContext {
  const employeeName = `${employee.firstName} ${employee.lastName}`
  const isForCurrentUser = employee.id === currentUserId
  
  // Determine user's role in this stage
  let userRoleInStage: TaskContext["userRoleInStage"] = "employee"
  
  if (stage.attendees) {
    if (stage.attendees.includes("employee") && isForCurrentUser) {
      userRoleInStage = "employee"
    } else if (stage.attendees.some((a) => a.startsWith("manager_level_"))) {
      // Check if current user is a manager for this employee
      const managerLevelMatch = stage.attendees
        .find((a) => a.startsWith("manager_level_"))
        ?.match(/manager_level_(\d+)/)
      
      if (managerLevelMatch && employee.managers) {
        const level = Number.parseInt(managerLevelMatch[1], 10)
        const manager = employee.managers.find((m) => m.level === level)
        
        if (manager?.employeeId === currentUserId) {
          if (stage.type === "review") {
            userRoleInStage = "reviewer"
          } else if (stage.type === "approval") {
            userRoleInStage = "approver"
          } else {
            userRoleInStage = "manager"
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
    stageName: stage.name,
    stageType: stage.type,
    procedureName,
    isForCurrentUser,
    userRoleInStage,
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
  const { employeeName, currentUserName, stageName, stageType, procedureName, isForCurrentUser, userRoleInStage } = context
  
  let title = ""
  let subtitle = ""
  let badge = ""
  
  if (isForCurrentUser) {
    title = `${stageName} - ${procedureName}`
    subtitle = `For: ${employeeName} (You)`
    badge = `Your ${stageType}`
  } else {
    title = `${stageName} - ${procedureName}`
    subtitle = `For: ${employeeName} | Your Role: ${userRoleInStage.charAt(0).toUpperCase() + userRoleInStage.slice(1)}`
    badge = `${userRoleInStage.charAt(0).toUpperCase() + userRoleInStage.slice(1)} ${stageType}`
  }
  
  return { title, subtitle, badge }
}
