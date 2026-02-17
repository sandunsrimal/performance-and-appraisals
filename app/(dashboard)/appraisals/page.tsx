"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { IconCalendar, IconCheck, IconClock, IconFileText, IconUsers, IconEye, IconDownload, IconStarFilled, IconBell, IconEdit, IconX, IconPlus } from "@tabler/icons-react"
import { demoEmployees } from "@/lib/data/demo-employees"
import { type Appraisal, type WorkflowAssignment, type EvaluationForm } from "@/lib/types"
import { workflowAssignments, getWorkflowTemplate, getEmployee, initializeWorkflowData, getEvaluationForm, getEffectiveManagers } from "@/lib/workflow-data"
import { useRole } from "@/lib/role-context"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Input } from "@/components/ui/input"
import type { ManagerLevel } from "@/lib/types"

// Helper function to calculate form completion status by role
const getFormCompletionStatus = (assignment: WorkflowAssignment, template: ReturnType<typeof getWorkflowTemplate>) => {
  if (!template) return { employeeForms: { completed: 0, total: 0 }, managerForms: { completed: 0, total: 0 } }
  
  let employeeFormsCompleted = 0
  let employeeFormsTotal = 0
  let managerFormsCompleted = 0
  let managerFormsTotal = 0
  
  template.stages.forEach((stage) => {
    // Only count stages with evaluation forms
    if (!stage.evaluationFormId || stage.type !== "evaluation") return
    
    const completion = assignment.stageCompletions[stage.id]
    const isCompleted = completion?.completed || false
    
    // Check if employee should complete this form
    const isEmployeeForm = stage.attendees?.includes("employee") ?? false
    // Check if manager should complete this form
    const isManagerForm = stage.attendees?.some(a => a.startsWith("manager_level_")) ?? false
    
    // Count employee forms
    if (isEmployeeForm) {
      employeeFormsTotal++
      if (isCompleted) {
        employeeFormsCompleted++
      }
    }
    
    // Count manager forms
    if (isManagerForm) {
      managerFormsTotal++
      if (isCompleted) {
        managerFormsCompleted++
      }
    }
  })
  
  return {
    employeeForms: { completed: employeeFormsCompleted, total: employeeFormsTotal },
    managerForms: { completed: managerFormsCompleted, total: managerFormsTotal },
  }
}

// Helper function to convert WorkflowAssignment to Appraisal
const convertAssignmentToAppraisal = (assignment: WorkflowAssignment): Appraisal | null => {
  const employee = getEmployee(assignment.employeeId)
  const template = getWorkflowTemplate(assignment.workflowTemplateId)
  
  if (!employee || !template) return null

  // Map workflow assignment status to appraisal status
  const statusMap: Record<WorkflowAssignment["status"], Appraisal["status"]> = {
    not_started: "Draft",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  }

  // Get current stage info
  const currentStage = template.stages.find((s) => s.id === assignment.currentStageId)
  const completedStages = Object.keys(assignment.stageCompletions).filter(
    (stageId) => assignment.stageCompletions[stageId].completed
  ).length
  
  // Check if all stages are completed
  // Get all stages that should be in stageCompletions (filtered stages for this employee)
  const allStagesInCompletions = Object.keys(assignment.stageCompletions)
  const allStagesCompleted = allStagesInCompletions.length > 0 && 
    allStagesInCompletions.every((stageId) => assignment.stageCompletions[stageId].completed)

  // Determine review type from interval
  const reviewTypeMap: Record<string, Appraisal["reviewType"]> = {
    annually: "Annual",
    biannually: "Mid-Year",
    quarterly: "Quarterly",
    monthly: "Custom",
    biweekly: "Custom",
    weekly: "Custom",
    daily: "Custom",
    custom: "Custom",
  }

  // Generate review period from start date and interval
  const startDate = new Date(assignment.startDate)
  const interval = template.interval
  const reviewPeriod = `${format(startDate, "MMM yyyy")} - ${assignment.endDate ? format(new Date(assignment.endDate), "MMM yyyy") : "Ongoing"}`

  // Get reviewers (managers) from employee or template stages - use effective managers (assignment overrides or employee's managers)
  const effectiveManagers = getEffectiveManagers(assignment)
  const reviewers: string[] = []
  template.stages.forEach((stage) => {
    if (stage.managerLevel) {
      const manager = effectiveManagers.find((m) => m.level === stage.managerLevel)
      if (manager) {
        if (manager.isExternal && manager.externalName) {
          reviewers.push(manager.externalName)
        } else if (manager.employeeId) {
          const managerEmp = getEmployee(manager.employeeId)
          if (managerEmp) {
            reviewers.push(`${managerEmp.firstName} ${managerEmp.lastName}`)
          }
        }
      }
    }
  })

  // Calculate overall rating from completed stage form data
  let overallRating: number | null = null
  const ratings: number[] = []
  Object.values(assignment.stageCompletions).forEach((completion) => {
    if (completion.formData) {
      Object.values(completion.formData).forEach((value) => {
        if (typeof value === "number" && value >= 1 && value <= 5) {
          ratings.push(value)
        }
      })
    }
  })
  if (ratings.length > 0) {
    overallRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
  }

  // Determine final status: if all stages are completed, mark as Completed
  let finalStatus: Appraisal["status"] = statusMap[assignment.status]
  if (allStagesCompleted && assignment.status !== "cancelled") {
    finalStatus = "Completed"
  }

  return {
    id: assignment.id,
    workflowAssignmentId: assignment.id,
    employeeId: assignment.employeeId,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    employeeEmail: employee.email,
    department: employee.department,
    position: employee.position,
    reviewPeriod,
    reviewType: reviewTypeMap[interval.type] || "Custom",
    status: finalStatus,
    overallRating,
    reviewers: [...new Set(reviewers)], // Remove duplicates
    startDate: assignment.startDate,
    dueDate: assignment.endDate || assignment.startDate,
    completedDate: allStagesCompleted ? (assignment.endDate || assignment.updatedAt) : (assignment.status === "completed" ? assignment.endDate || assignment.updatedAt : null),
    goals: [],
    achievements: [],
    areasForImprovement: [],
    comments: allStagesCompleted 
      ? `All steps completed (${completedStages}/${allStagesInCompletions.length})`
      : currentStage 
        ? `Current step: ${currentStage.name} (${completedStages}/${allStagesInCompletions.length} completed)` 
        : `No active step (${completedStages}/${allStagesInCompletions.length} completed)`,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  }
}

// Appraisals are now generated from workflow assignments


const getStatusBadgeVariant = (status: Appraisal["status"]) => {
  switch (status) {
    case "Completed":
      return "default"
    case "In Progress":
      return "secondary"
    case "Under Review":
      return "outline"
    case "Draft":
      return "secondary"
    case "Cancelled":
      return "destructive"
    default:
      return "secondary"
  }
}

const getRatingDisplay = (rating: number | null) => {
  if (rating === null) return "N/A"
  return `${rating.toFixed(1)} / 5.0`
}

// Helper function to download form response
const downloadFormResponse = (
  form: EvaluationForm,
  formData: Record<string, unknown>,
  stepName: string,
  completedDate: string | undefined,
  appraisal: Appraisal
) => {
  // Create a formatted text document
  let content = `FORM RESPONSE\n`
  content += `================\n\n`
  content += `Employee: ${appraisal.employeeName}\n`
  content += `Position: ${appraisal.position}\n`
  content += `Department: ${appraisal.department}\n`
  content += `Appraisal Period: ${appraisal.reviewPeriod}\n`
  content += `Review Step: ${stepName}\n`
  content += `Form: ${form.name}\n`
  if (completedDate) {
    content += `Completed Date: ${format(new Date(completedDate), "MMM dd, yyyy")}\n`
  }
  content += `\n${"=".repeat(50)}\n\n`
  
  // Add form fields and responses
  form.fields.forEach((field) => {
    const fieldValue = formData[field.id]
    if (fieldValue === undefined || fieldValue === null) return
    
    content += `${field.label}${field.required ? " *" : ""}\n`
    content += `${"-".repeat(30)}\n`
    
    if (field.type === "rating" && typeof fieldValue === "number") {
      content += `Rating: ${fieldValue} out of ${field.max || 5}\n`
      content += `Visual: ${"★".repeat(fieldValue)}${"☆".repeat((field.max || 5) - fieldValue)}\n`
    } else if (field.type === "checkbox" && Array.isArray(fieldValue)) {
      content += `${fieldValue.join(", ")}\n`
    } else {
      content += `${String(fieldValue)}\n`
    }
    
    if (field.helpText) {
      content += `Note: ${field.helpText}\n`
    }
    
    content += `\n`
  })
  
  // Create and download the file
  const blob = new Blob([content], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${form.name.replace(/\s+/g, "_")}_${appraisal.employeeName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function AppraisalsPageContent() {
  const { currentUserId, currentRole } = useRole()
  const searchParams = useSearchParams()
  const [assignments, setAssignments] = React.useState<WorkflowAssignment[]>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [reviewTypeFilter, setReviewTypeFilter] = React.useState<string>("all")
  const [employeeFilter, setEmployeeFilter] = React.useState<string>("all")
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined)
  const [detailSheetOpen, setDetailSheetOpen] = React.useState(false)
  const [selectedAppraisal, setSelectedAppraisal] = React.useState<Appraisal | null>(null)
  const [highlightedStepId, setHighlightedStepId] = React.useState<string | null>(null)
  const [isMounted, setIsMounted] = React.useState(false)
  const [formViewSheetOpen, setFormViewSheetOpen] = React.useState(false)
  const [selectedFormData, setSelectedFormData] = React.useState<{
    form: EvaluationForm
    formData: Record<string, unknown>
    stepName: string
    completedDate?: string
  } | null>(null)

  // Edit manager state
  const [editingAssignmentId, setEditingAssignmentId] = React.useState<string | null>(null)
  const [isEditManagerSheetOpen, setIsEditManagerSheetOpen] = React.useState(false)
  const [selectedManagers, setSelectedManagers] = React.useState<ManagerLevel[]>([])
  const [managerSearchValues, setManagerSearchValues] = React.useState<Record<number, string>>({})
  const [managerSourceType, setManagerSourceType] = React.useState<Record<number, "existing" | "external">>({})

  // Initialize workflow data with employees
  React.useEffect(() => {
    setIsMounted(true)
    initializeWorkflowData(demoEmployees)
    setAssignments(workflowAssignments)
  }, [])

  // Handle query parameters to open specific appraisal and highlight step
  React.useEffect(() => {
    if (!isMounted || assignments.length === 0) return
    
    const assignmentId = searchParams?.get("assignmentId")
    const stepId = searchParams?.get("stepId")
    
    if (assignmentId) {
      // Find the appraisal for this assignment
      const assignment = assignments.find((a) => a.id === assignmentId)
      if (assignment) {
        const appraisal = convertAssignmentToAppraisal(assignment)
        if (appraisal) {
          setSelectedAppraisal(appraisal)
          setDetailSheetOpen(true)
          
          // Highlight the specific step if stepId is provided
          if (stepId) {
            setHighlightedStepId(stepId)
            // Scroll to the highlighted step after a short delay to allow sheet to open
            setTimeout(() => {
              const element = document.getElementById(`stage-${stepId}`)
              if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" })
              }
            }, 300)
          }
        }
      }
    }
  }, [isMounted, assignments, searchParams])

  // Get employees managed by current user (for managers)
  const managedEmployeeIds = React.useMemo(() => {
    if (currentRole === "admin") {
      // Admin sees all
      return null
    }
    if (currentRole === "employee") {
      // Employee sees only their own
      return [currentUserId]
    }
    // Manager sees their own + employees they manage
    const managerEmployee = getEmployee(currentUserId)
    if (!managerEmployee) return [currentUserId]
    
    const managedIds = [currentUserId] // Include their own
    // Find employees who have this manager
    demoEmployees.forEach((emp) => {
      if (emp.managers?.some((m) => m.employeeId === currentUserId)) {
        managedIds.push(emp.id)
      }
    })
    return managedIds
  }, [currentUserId, currentRole])

  // Get available employees as managers
  const availableManagers = React.useMemo(() => {
    return demoEmployees
      .filter((emp) => emp.status === "Active")
      .map((emp) => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
      }))
  }, [])

  // Get manager name by ID
  const getManagerName = (employeeId: string) => {
    const manager = availableManagers.find((m) => m.id === employeeId)
    return manager ? manager.name : ""
  }

  // Filter managers based on search for each level
  const getFilteredManagersForLevel = (level: number) => {
    const searchValue = managerSearchValues[level] || ""
    const selectedAtOtherLevels = new Set(
      selectedManagers
        .filter((m) => m.level !== level && m.employeeId)
        .map((m) => m.employeeId)
    )
    
    return availableManagers.filter((manager) => {
      const matchesSearch =
        !searchValue ||
        manager.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        manager.email.toLowerCase().includes(searchValue.toLowerCase())
      
      const isSelectedAtOtherLevel = selectedAtOtherLevels.has(manager.id)
      
      return matchesSearch && !isSelectedAtOtherLevel
    })
  }

  // Handle edit manager assignment
  const handleEditManagerAssignment = (assignment: WorkflowAssignment) => {
    setEditingAssignmentId(assignment.id)
    // Load existing manager overrides or use employee's managers
    const employee = getEmployee(assignment.employeeId)
    const managers = assignment.managerOverrides || employee?.managers || []
    setSelectedManagers(managers)
    
    // Set manager search values and source types
    const searchValues: Record<number, string> = {}
    const sourceTypes: Record<number, "existing" | "external"> = {}
    managers.forEach((manager) => {
      if (manager.isExternal) {
        sourceTypes[manager.level] = "external"
      } else {
        sourceTypes[manager.level] = "existing"
        if (manager.employeeId) {
          searchValues[manager.level] = getManagerName(manager.employeeId)
        }
      }
    })
    setManagerSearchValues(searchValues)
    setManagerSourceType(sourceTypes)
    setIsEditManagerSheetOpen(true)
  }

  // Manager management functions
  const addManagerLevel = () => {
    const nextLevel = selectedManagers.length > 0 
      ? Math.max(...selectedManagers.map((m) => m.level)) + 1 
      : 1
    setSelectedManagers((prev) => [...prev, { level: nextLevel, employeeId: "", isExternal: false }])
    setManagerSourceType((prev) => ({ ...prev, [nextLevel]: "existing" }))
  }

  const removeManagerLevel = (level: number) => {
    setSelectedManagers((prev) => {
      const updated = prev.filter((m) => m.level !== level)
      return updated.map((m, index) => ({ ...m, level: index + 1 }))
    })
    setManagerSearchValues((prev) => {
      const updated = { ...prev }
      delete updated[level]
      return updated
    })
  }

  const selectManagerForLevel = (level: number, employeeId: string) => {
    const selectedManager = availableManagers.find((m) => m.id === employeeId)
    if (!selectedManager) return

    setSelectedManagers((prev) => {
      const existingManager = prev.find((m) => m.level === level)
      const updated = prev.map((m) =>
        m.level === level 
          ? { ...m, employeeId, isExternal: false, externalName: undefined, externalEmail: undefined } 
          : m
      )
      setManagerSearchValues((prevSearch) => ({
        ...prevSearch,
        [level]: selectedManager.name,
      }))
      setManagerSourceType((prev) => ({ ...prev, [level]: "existing" }))
      return updated
    })
  }

  const updateExternalManager = (level: number, name: string, email: string) => {
    setSelectedManagers((prev) => {
      const existingManager = prev.find((m) => m.level === level)
      const updated = prev.map((m) =>
        m.level === level 
          ? { ...m, externalName: name, externalEmail: email, isExternal: true, employeeId: undefined } 
          : m
      )
      return updated
    })
  }

  const removeManagerFromLevel = (level: number) => {
    setSelectedManagers((prev) => {
      const updated = prev.map((m) =>
        m.level === level 
          ? { ...m, employeeId: undefined, externalName: undefined, externalEmail: undefined, isExternal: false } 
          : m
      )
      setManagerSearchValues((prev) => {
        const updated = { ...prev }
        updated[level] = ""
        return updated
      })
      return updated
    })
  }

  const toggleEvaluationResponsible = (level: number) => {
    setSelectedManagers((prev) =>
      prev.map((m) =>
        m.level === level ? { ...m, isEvaluationResponsible: !m.isEvaluationResponsible } : m
      )
    )
  }

  // Save manager changes
  const handleSaveManagerChanges = () => {
    if (!editingAssignmentId) return

    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.id === editingAssignmentId
          ? {
              ...assignment,
              managerOverrides: selectedManagers.filter((m) => m.employeeId || m.externalName),
              updatedAt: new Date().toISOString(),
            }
          : assignment
      )
    )

    toast.success("Manager assignment updated successfully!")
    setIsEditManagerSheetOpen(false)
    setEditingAssignmentId(null)
    setSelectedManagers([])
    setManagerSearchValues({})
    setManagerSourceType({})
  }

  // Convert workflow assignments to appraisals
  const appraisals = React.useMemo(() => {
    let filteredAssignments = assignments
    
    // Filter by user role
    if (managedEmployeeIds !== null) {
      filteredAssignments = assignments.filter((assignment) =>
        managedEmployeeIds.includes(assignment.employeeId)
      )
    }
    
    return filteredAssignments
      .map(convertAssignmentToAppraisal)
      .filter((a): a is Appraisal => a !== null)
  }, [assignments, managedEmployeeIds])

  // Get unique employees from workflow assignments for filtering
  const uniqueEmployees = React.useMemo(() => {
    const employeeMap = new Map<string, { id: string; name: string }>()
    assignments.forEach((assignment) => {
      const employee = getEmployee(assignment.employeeId)
      if (employee && !employeeMap.has(employee.id)) {
        employeeMap.set(employee.id, {
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
        })
      }
    })
    return Array.from(employeeMap.values())
  }, [assignments])

  // Filter appraisals
  const filteredAppraisals = React.useMemo(() => {
    return appraisals.filter((appraisal) => {
      const matchesStatus = statusFilter === "all" || appraisal.status === statusFilter
      const matchesReviewType = reviewTypeFilter === "all" || appraisal.reviewType === reviewTypeFilter
      const matchesEmployee = employeeFilter === "all" || appraisal.employeeId === employeeFilter
      const matchesSearch =
        globalFilter === "" ||
        appraisal.employeeName.toLowerCase().includes(globalFilter.toLowerCase()) ||
        appraisal.reviewPeriod.toLowerCase().includes(globalFilter.toLowerCase()) ||
        appraisal.department.toLowerCase().includes(globalFilter.toLowerCase())

      const matchesDateRange = (() => {
        if (!dateFrom && !dateTo) return true
        const appraisalDueDate = new Date(appraisal.dueDate)
        if (dateFrom && dateTo) {
          return appraisalDueDate >= dateFrom && appraisalDueDate <= dateTo
        }
        if (dateFrom) {
          return appraisalDueDate >= dateFrom
        }
        if (dateTo) {
          return appraisalDueDate <= dateTo
        }
        return true
      })()

      return matchesStatus && matchesReviewType && matchesEmployee && matchesSearch && matchesDateRange
    })
  }, [appraisals, statusFilter, reviewTypeFilter, employeeFilter, globalFilter, dateFrom, dateTo])

  const columns: ColumnDef<Appraisal>[] = React.useMemo(
    () => [
      {
        accessorKey: "employeeName",
        header: "Employee",
        cell: ({ row }) => {
          const appraisal = row.original
          return (
            <div className="flex flex-col">
              <span className="font-medium">{appraisal.employeeName}</span>
              <span className="text-sm text-muted-foreground">{appraisal.position}</span>
              <span className="text-xs text-muted-foreground">{appraisal.department}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "reviewPeriod",
        header: "Review Cycle & Period",
        cell: ({ row }) => {
          const assignment = assignments.find((a) => a.id === row.original.workflowAssignmentId)
          const template = assignment ? getWorkflowTemplate(assignment.workflowTemplateId) : null
          
          return (
            <div className="flex flex-col">
              {template && (
                <span className="font-medium text-sm">{template.name}</span>
              )}
              <span className="text-sm">{row.original.reviewPeriod}</span>
              <span className="text-xs text-muted-foreground">{row.original.reviewType}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "status",
        header: "Status & Progress",
        cell: ({ row }) => {
          const status = row.original.status
          const assignment = assignments.find((a) => a.id === row.original.workflowAssignmentId)
          const template = assignment ? getWorkflowTemplate(assignment.workflowTemplateId) : null
          
          return (
            <div className="flex flex-col gap-1">
              <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
              {assignment && template && (
                <div className="text-xs text-muted-foreground">
                  {Object.keys(assignment.stageCompletions).filter(
                    (stageId) => assignment.stageCompletions[stageId].completed
                  ).length} / {template.stages.length} steps
                </div>
              )}
            </div>
          )
        },
      },
      {
        id: "formCompletion",
        header: "Form Completion",
        cell: ({ row }) => {
          const assignment = assignments.find((a) => a.id === row.original.workflowAssignmentId)
          const template = assignment ? getWorkflowTemplate(assignment.workflowTemplateId) : null
          
          if (!assignment || !template) {
            return <span className="text-sm text-muted-foreground">N/A</span>
          }
          
          const completionStatus = getFormCompletionStatus(assignment, template)
          const employeeComplete = completionStatus.employeeForms.total === 0 || 
                                  completionStatus.employeeForms.completed === completionStatus.employeeForms.total
          const managerComplete = completionStatus.managerForms.total === 0 || 
                                 completionStatus.managerForms.completed === completionStatus.managerForms.total
          
          return (
            <div className="flex flex-col gap-1.5">
              {completionStatus.employeeForms.total > 0 && (
                <div className="flex items-center gap-2">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full ${
                    employeeComplete ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {employeeComplete ? (
                      <IconCheck className="size-3" />
                    ) : (
                      <span className="text-xs font-semibold">E</span>
                    )}
                  </div>
                  <span className="text-xs">
                    Employee: {completionStatus.employeeForms.completed}/{completionStatus.employeeForms.total}
                  </span>
                </div>
              )}
              {completionStatus.managerForms.total > 0 && (
                <div className="flex items-center gap-2">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full ${
                    managerComplete ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {managerComplete ? (
                      <IconCheck className="size-3" />
                    ) : (
                      <span className="text-xs font-semibold">M</span>
                    )}
                  </div>
                  <span className="text-xs">
                    Manager: {completionStatus.managerForms.completed}/{completionStatus.managerForms.total}
                  </span>
                </div>
              )}
              {completionStatus.employeeForms.total === 0 && completionStatus.managerForms.total === 0 && (
                <span className="text-xs text-muted-foreground">No forms</span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "overallRating",
        header: "Rating",
        cell: ({ row }) => {
          const rating = row.original.overallRating
          return (
            <div className="flex items-center gap-2">
              {rating !== null ? (
                <>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-sm ${
                        star <= Math.round(rating)
                          ? "text-yellow-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                  <span className="text-sm font-medium">{rating.toFixed(1)}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">N/A</span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "startDate",
        header: "Start Date",
        cell: ({ row }) => {
          return format(new Date(row.original.startDate), "MMM dd, yyyy")
        },
      },
      {
        accessorKey: "dueDate",
        header: "Due Date",
        cell: ({ row }) => {
          const dueDate = new Date(row.original.dueDate)
          const isOverdue = dueDate < new Date() && row.original.status !== "Completed" && row.original.status !== "Cancelled"
          return (
            <div className="flex flex-col">
              <span className={isOverdue ? "text-destructive font-medium" : ""}>
                {format(dueDate, "MMM dd, yyyy")}
                  </span>
              {isOverdue && (
                <span className="text-xs text-destructive">Overdue</span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "completedDate",
        header: "Completed",
        cell: ({ row }) => {
          const completedDate = row.original.completedDate
          return completedDate ? (
            <span className="text-sm">{format(new Date(completedDate), "MMM dd, yyyy")}</span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const assignment = assignments.find((a) => a.id === row.original.workflowAssignmentId)
          return (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedAppraisal(row.original)
                  setDetailSheetOpen(true)
                }}
              >
                <IconEye className="size-4" />
              </Button>
              {currentRole === "admin" && assignment && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditManagerAssignment(assignment)
                  }}
                >
                  <IconEdit className="size-4" />
                </Button>
              )}
            </div>
          )
        },
      },
    ],
    [assignments, currentRole]
  )

  const table = useReactTable({
    data: filteredAppraisals,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  // Prevent hydration mismatch - only render after mount
  if (!isMounted) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-4 md:py-4">
        <div className="px-4 lg:px-6">
          <h2 className="text-2xl font-semibold">Appraisals</h2>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-4 md:py-4">
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Appraisals</h2>
            <p className="text-muted-foreground mt-2">
              View employee performance appraisals linked to review cycles. Appraisals are automatically created from review cycle assignments.
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1">
            <Input
              placeholder="Search by employee, period, or department..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reviewTypeFilter} onValueChange={setReviewTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Review Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Annual">Annual</SelectItem>
                <SelectItem value="Mid-Year">Mid-Year</SelectItem>
                <SelectItem value="Quarterly">Quarterly</SelectItem>
                <SelectItem value="Probationary">Probationary</SelectItem>
              </SelectContent>
            </Select>
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {uniqueEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground hidden sm:inline">Due Date:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[160px] sm:w-[180px] justify-start text-left font-normal"
                >
                  <IconCalendar className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "MMM dd, yyyy") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[160px] sm:w-[180px] justify-start text-left font-normal"
                >
                  <IconCalendar className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "MMM dd, yyyy") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                />
              </PopoverContent>
            </Popover>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom(undefined)
                  setDateTo(undefined)
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Appraisals Table */}
      <div className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow 
                    key={row.id} 
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedAppraisal(row.original)
                      setDetailSheetOpen(true)
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No appraisals found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  filteredAppraisals.length
                )}{" "}
                of {filteredAppraisals.length} appraisals
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <IconChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <IconChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <IconChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <IconChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
      </div>

      {/* Detail View Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-4">
          <SheetHeader>
            <SheetTitle>Appraisal Details</SheetTitle>
            <SheetDescription>
              View detailed information about this appraisal, review steps, and form responses
            </SheetDescription>
          </SheetHeader>

          {selectedAppraisal && (() => {
            const assignment = assignments.find((a) => a.id === selectedAppraisal.workflowAssignmentId)
            const template = assignment ? getWorkflowTemplate(assignment.workflowTemplateId) : null
            const employee = getEmployee(selectedAppraisal.employeeId)
            
            return (
              <div className="space-y-6 mt-6">
                {/* Appraisal Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Appraisal Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Employee</p>
                        <p className="text-base font-semibold">{selectedAppraisal.employeeName}</p>
                        <p className="text-sm text-muted-foreground">{selectedAppraisal.position} • {selectedAppraisal.department}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <Badge variant={getStatusBadgeVariant(selectedAppraisal.status)} className="mt-1">
                          {selectedAppraisal.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Review Period</p>
                        <p className="text-base">{selectedAppraisal.reviewPeriod}</p>
                        <p className="text-sm text-muted-foreground">{selectedAppraisal.reviewType}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Overall Rating</p>
                        {selectedAppraisal.overallRating !== null ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`text-lg ${
                                    star <= Math.round(selectedAppraisal.overallRating!)
                                      ? "text-yellow-500"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                            <span className="text-base font-semibold">{selectedAppraisal.overallRating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">N/A</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                        <p className="text-sm">{format(new Date(selectedAppraisal.startDate), "MMM dd, yyyy")}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                        <p className="text-sm">{format(new Date(selectedAppraisal.dueDate), "MMM dd, yyyy")}</p>
                      </div>
                      {selectedAppraisal.completedDate && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Completed Date</p>
                          <p className="text-sm">{format(new Date(selectedAppraisal.completedDate), "MMM dd, yyyy")}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Form Completion Summary */}
                {template && assignment && (() => {
                  const completionStatus = getFormCompletionStatus(assignment, template)
                  const employeeComplete = completionStatus.employeeForms.total === 0 || 
                                          completionStatus.employeeForms.completed === completionStatus.employeeForms.total
                  const managerComplete = completionStatus.managerForms.total === 0 || 
                                         completionStatus.managerForms.completed === completionStatus.managerForms.total
                  const allFormsComplete = employeeComplete && managerComplete
                  
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle>Evaluation Form Completion Status</CardTitle>
                        <CardDescription>
                          Track completion status of required evaluation forms by role
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Employee Forms */}
                          {completionStatus.employeeForms.total > 0 && (
                            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                  employeeComplete ? "bg-green-500 text-white" : "bg-orange-500 text-white"
                                }`}>
                                  {employeeComplete ? (
                                    <IconCheck className="size-5" />
                                  ) : (
                                    <IconClock className="size-5" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold">Employee Forms</p>
                                  <p className="text-sm text-muted-foreground">
                                    {completionStatus.employeeForms.completed} of {completionStatus.employeeForms.total} completed
                                  </p>
                                </div>
                              </div>
                              <Badge variant={employeeComplete ? "default" : "secondary"}>
                                {employeeComplete ? "Complete" : "Incomplete"}
                              </Badge>
                            </div>
                          )}
                          
                          {/* Manager Forms */}
                          {completionStatus.managerForms.total > 0 && (
                            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                  managerComplete ? "bg-green-500 text-white" : "bg-orange-500 text-white"
                                }`}>
                                  {managerComplete ? (
                                    <IconCheck className="size-5" />
                                  ) : (
                                    <IconClock className="size-5" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold">Manager Forms</p>
                                  <p className="text-sm text-muted-foreground">
                                    {completionStatus.managerForms.completed} of {completionStatus.managerForms.total} completed
                                  </p>
                                </div>
                              </div>
                              <Badge variant={managerComplete ? "default" : "secondary"}>
                                {managerComplete ? "Complete" : "Incomplete"}
                              </Badge>
                            </div>
                          )}
                          
                          {/* Overall Status */}
                          <div className={`flex items-center justify-between p-4 rounded-lg border ${
                            allFormsComplete ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                                allFormsComplete ? "bg-green-500 text-white" : "bg-orange-500 text-white"
                              }`}>
                                {allFormsComplete ? (
                                  <IconCheck className="size-5" />
                                ) : (
                                  <IconClock className="size-5" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold">Overall Status</p>
                                <p className="text-sm text-muted-foreground">
                                  {allFormsComplete 
                                    ? "All required evaluation forms have been completed"
                                    : "Some evaluation forms are still pending"}
                                </p>
                              </div>
                            </div>
                            <Badge variant={allFormsComplete ? "default" : "secondary"}>
                              {allFormsComplete ? "All Complete" : "Pending"}
                            </Badge>
                          </div>
                          
                          {completionStatus.employeeForms.total === 0 && completionStatus.managerForms.total === 0 && (
                            <div className="text-center py-4 text-muted-foreground">
                              <p className="text-sm">No evaluation forms are required for this review cycle.</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}

                {/* Review Cycle */}
                {template && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Review Cycle</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Review Cycle Name</p>
                          <p className="text-base font-semibold">{template.name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Appraisal Frequency</p>
                          <p className="text-sm">
                            {template.interval.type === "quarterly" ? "Quarterly" :
                             template.interval.type === "monthly" ? "Monthly" :
                             template.interval.type === "annually" ? "Annually" :
                             template.interval.type === "biannually" ? "Bi-annually" :
                             template.interval.type === "biweekly" ? "Bi-weekly" :
                             template.interval.type === "weekly" ? "Weekly" :
                             template.interval.type === "daily" ? "Daily" :
                             template.interval.type === "custom" && template.interval.value && template.interval.unit
                               ? `Custom (Every ${template.interval.value} ${template.interval.unit})`
                               : "Custom"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Review Steps */}
                {template && assignment && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Review Steps</CardTitle>
                      <CardDescription>
                        {Object.keys(assignment.stageCompletions).filter(
                          (stageId) => assignment.stageCompletions[stageId].completed
                        ).length} of {template.stages.length} review steps completed
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {template.stages
                          .sort((a, b) => a.order - b.order)
                          .map((stage) => {
                            const completion = assignment.stageCompletions[stage.id]
                            const isCompleted = completion?.completed || false
                            const form = stage.evaluationFormId ? getEvaluationForm(stage.evaluationFormId) : null
                            
                            const isHighlighted = highlightedStepId === stage.id
                            
                            return (
                              <div 
                                key={stage.id} 
                                className={`border rounded-lg p-4 space-y-3 transition-all ${
                                  isHighlighted 
                                    ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2" 
                                    : "border-border"
                                }`}
                                id={`stage-${stage.id}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                                      isCompleted 
                                        ? "bg-green-500 border-green-500 text-white" 
                                        : assignment.currentStageId === stage.id
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "bg-muted border-muted-foreground/30 text-muted-foreground"
                                    }`}>
                                      {isCompleted ? (
                                        <IconCheck className="size-4" />
                                      ) : (
                                        <span className="text-xs font-semibold">{stage.order}</span>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold">{stage.name}</h4>
                                        <Badge variant={stage.type === "evaluation" ? "default" : stage.type === "meeting" ? "secondary" : stage.type === "review" ? "outline" : "secondary"}>
                                          {stage.type}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-2">{stage.description}</p>
                                      
                                      {/* Form Assignment - Show who should complete the form */}
                                      {form && stage.evaluationFormId && (
                                        <div className="flex items-center gap-2 mb-2">
                                          <IconFileText className="size-4 text-muted-foreground" />
                                          <span className="text-xs font-medium">Evaluation Form Required:</span>
                                          <div className="flex items-center gap-2">
                                            {stage.attendees?.includes("employee") && (
                                              <Badge variant="outline" className="text-xs">
                                                Employee Form
                                              </Badge>
                                            )}
                                            {stage.attendees?.some(a => a.startsWith("manager_level_")) && (
                                              <Badge variant="outline" className="text-xs">
                                                Manager Form
                                              </Badge>
                                            )}
                                          </div>
                                          {isCompleted && completion.completedBy && (
                                            <span className="text-xs text-muted-foreground">
                                              • Completed by {completion.completedBy === assignment.employeeId 
                                                ? "Employee" 
                                                : (() => {
                                                    const effectiveManagers = getEffectiveManagers(assignment)
                                                    const manager = effectiveManagers.find(m => m.employeeId === completion.completedBy)
                                                    return manager 
                                                      ? (manager.isExternal ? manager.externalName : getEmployee(manager.employeeId || "")?.firstName + " " + getEmployee(manager.employeeId || "")?.lastName)
                                                      : "Manager"
                                                  })()}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Attendees */}
                                      {stage.attendees && stage.attendees.length > 0 && (
                                        <div className="flex items-center gap-2 mb-2">
                                          <IconUsers className="size-4 text-muted-foreground" />
                                          <span className="text-xs text-muted-foreground">
                                            Attendees: {stage.attendees.map(a => {
                                              if (a === "employee") {
                                                return "Employee"
                                              }
                                              // Check if it's a manager level (e.g., "manager_level_1", "manager_level_2")
                                              const managerLevelMatch = a.match(/^manager_level_(\d+)$/)
                                              if (managerLevelMatch && employee) {
                                                const level = parseInt(managerLevelMatch[1], 10)
                                                const effectiveManagers = getEffectiveManagers(assignment)
                                                const manager = effectiveManagers.find((m) => m.level === level)
                                                if (manager) {
                                                  if (manager.isExternal && manager.externalName) {
                                                    return `Manager Level ${level} (${manager.externalName})`
                                                  } else if (manager.employeeId) {
                                                    const managerEmp = getEmployee(manager.employeeId)
                                                    if (managerEmp) {
                                                      return `Manager Level ${level} (${managerEmp.firstName} ${managerEmp.lastName})`
                                                    }
                                                  }
                                                }
                                              }
                                              // Fallback to original format if manager not found
                                              return a.replace("manager_level_", "Manager Level ")
                                            }).join(", ")}
                                          </span>
                                        </div>
                                      )}

                                      {/* Completion Status */}
                                      {isCompleted && completion.completedDate && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <IconCheck className="size-3 text-green-600" />
                                          <span>Completed on {format(new Date(completion.completedDate), "MMM dd, yyyy")}</span>
                                        </div>
                                      )}
                                      {!isCompleted && assignment.currentStageId === stage.id && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <IconClock className="size-3 text-primary" />
                                          <span>Current Review Step</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Reminder Button - Only for Admin and incomplete stages */}
                                  {currentRole === "admin" && !isCompleted && employee && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        // Early return if employee is not defined
                                        if (!employee) return
                                        
                                        // Get the responsible person(s) for this stage
                                        const responsiblePersons: string[] = []
                                        
                                        if (stage.attendees) {
                                          stage.attendees.forEach((attendee) => {
                                            if (attendee === "employee") {
                                              responsiblePersons.push(`${employee.firstName} ${employee.lastName}`)
                                            } else {
                                              const managerLevelMatch = attendee.match(/^manager_level_(\d+)$/)
                                              if (managerLevelMatch && employee) {
                                                const level = parseInt(managerLevelMatch[1], 10)
                                                const effectiveManagers = getEffectiveManagers(assignment)
                                                const manager = effectiveManagers.find((m) => m.level === level)
                                                if (manager) {
                                                  if (manager.isExternal && manager.externalName) {
                                                    responsiblePersons.push(`Manager Level ${level} (${manager.externalName})`)
                                                  } else if (manager.employeeId) {
                                                    const managerEmp = getEmployee(manager.employeeId)
                                                    if (managerEmp) {
                                                      responsiblePersons.push(`${managerEmp.firstName} ${managerEmp.lastName}`)
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          })
                                        }
                                        
                                        const recipients = responsiblePersons.length > 0 
                                          ? responsiblePersons.join(", ")
                                          : "the responsible person(s)"
                                        
                                        toast.success("Reminder sent", {
                                          description: `A reminder has been sent to ${recipients} for the "${stage.name}" review step.`,
                                        })
                                      }}
                                      className="flex items-center gap-2 shrink-0"
                                    >
                                      <IconBell className="size-4" />
                                      Send Reminder
                                    </Button>
                                  )}
                                </div>

                                {/* Form Feedback */}
                                {form && completion?.formData && Object.keys(completion.formData).length > 0 && (
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <IconFileText className="size-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">Form: {form.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            if (completion.formData) {
                                              setSelectedFormData({
                                                form,
                                                formData: completion.formData,
                                                stepName: stage.name,
                                                completedDate: completion.completedDate,
                                              })
                                            }
                                            setFormViewSheetOpen(true)
                                          }}
                                        >
                                          <IconEye className="size-4 mr-2" />
                                          View Form
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            if (completion.formData) {
                                              downloadFormResponse(form, completion.formData, stage.name, completion.completedDate, selectedAppraisal)
                                            }
                                          }}
                                        >
                                          <IconDownload className="size-4 mr-2" />
                                          Download
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="space-y-2 pl-6">
                                      {form.fields.map((field) => {
                                        const fieldValue = completion.formData?.[field.id]
                                        if (fieldValue === undefined || fieldValue === null) return null
                                        
                                        return (
                                          <div key={field.id} className="text-sm">
                                            <span className="font-medium text-muted-foreground">{field.label}:</span>{" "}
                                            <span>
                                              {field.type === "rating" && typeof fieldValue === "number" ? (
                                                <div className="inline-flex items-center gap-1">
                                                  {fieldValue}
                                                  <div className="flex gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                      <span
                                                        key={star}
                                                        className={`text-xs ${
                                                          star <= fieldValue
                                                            ? "text-yellow-500"
                                                            : "text-muted-foreground"
                                                        }`}
                                                      >
                                                        ★
                                                      </span>
                                                    ))}
                                                  </div>
                                                </div>
                                              ) : field.type === "checkbox" && Array.isArray(fieldValue) ? (
                                                fieldValue.join(", ")
                                              ) : (
                                                String(fieldValue)
                                              )}
                                            </span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                                {form && (!completion?.formData || Object.keys(completion.formData).length === 0) && (
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="flex items-center gap-2 text-sm">
                                      <IconFileText className="size-4 text-orange-500" />
                                      <span className="font-medium">Form: {form.name}</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {stage.attendees?.includes("employee") ? "Employee Form" : "Manager Form"} - Pending
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                                      {stage.attendees?.includes("employee") 
                                        ? `Awaiting completion by ${employee?.firstName} ${employee?.lastName}`
                                        : (() => {
                                            const managerLevelMatch = stage.attendees?.find(a => a.startsWith("manager_level_"))?.match(/^manager_level_(\d+)$/)
                                            if (managerLevelMatch && employee) {
                                              const level = parseInt(managerLevelMatch[1], 10)
                                              const effectiveManagers = getEffectiveManagers(assignment)
                                              const manager = effectiveManagers.find((m) => m.level === level)
                                              if (manager) {
                                                if (manager.isExternal && manager.externalName) {
                                                  return `Awaiting completion by Manager Level ${level} (${manager.externalName})`
                                                } else if (manager.employeeId) {
                                                  const managerEmp = getEmployee(manager.employeeId)
                                                  if (managerEmp) {
                                                    return `Awaiting completion by Manager Level ${level} (${managerEmp.firstName} ${managerEmp.lastName})`
                                                  }
                                                }
                                              }
                                            }
                                            return "Awaiting completion by Manager"
                                          })()}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Comments */}
                {selectedAppraisal.comments && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Comments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedAppraisal.comments}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )
          })()}
        </SheetContent>
      </Sheet>

      {/* Form Response View Sheet */}
      <Sheet open={formViewSheetOpen} onOpenChange={setFormViewSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-4">
          <SheetHeader>
            <SheetTitle>Form Response</SheetTitle>
            <SheetDescription>
              View the complete form response for {selectedFormData?.stepName}
            </SheetDescription>
          </SheetHeader>

          {selectedFormData && selectedAppraisal && (
            <div className="space-y-6 mt-6">
              {/* Form Header */}
              <Card>
                <CardHeader>
                  <CardTitle>{selectedFormData.form.name}</CardTitle>
                  <CardDescription>{selectedFormData.form.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium text-muted-foreground">Employee</p>
                      <p>{selectedAppraisal.employeeName}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Step</p>
                      <p>{selectedFormData.stepName}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Appraisal Period</p>
                      <p>{selectedAppraisal.reviewPeriod}</p>
                    </div>
                    {selectedFormData.completedDate && (
                      <div>
                        <p className="font-medium text-muted-foreground">Completed Date</p>
                        <p>{format(new Date(selectedFormData.completedDate), "MMM dd, yyyy")}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Form Fields with Responses */}
              <Card>
                <CardHeader>
                  <CardTitle>Form Responses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {selectedFormData.form.fields.map((field) => {
                      const fieldValue = selectedFormData.formData[field.id]
                      
                      return (
                        <div key={field.id} className="space-y-2">
                          <Label className="text-base">
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                          </Label>
                          {field.helpText && (
                            <p className="text-sm text-muted-foreground">{field.helpText}</p>
                          )}

                          {/* Display response based on field type */}
                          {fieldValue === undefined || fieldValue === null ? (
                            <p className="text-sm text-muted-foreground italic">No response provided</p>
                          ) : field.type === "text" ? (
                            <div className="p-3 bg-muted rounded-md">
                              <p className="text-sm">{String(fieldValue)}</p>
                            </div>
                          ) : field.type === "textarea" ? (
                            <div className="p-3 bg-muted rounded-md min-h-24">
                              <p className="text-sm whitespace-pre-wrap">{String(fieldValue)}</p>
                            </div>
                          ) : field.type === "number" ? (
                            <div className="p-3 bg-muted rounded-md">
                              <p className="text-sm">{String(fieldValue)}</p>
                            </div>
                          ) : field.type === "rating" && typeof fieldValue === "number" ? (
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1">
                                {Array.from({ length: field.max || 5 }).map((_, i) => (
                                  <span
                                    key={i}
                                    className={`text-2xl ${
                                      i < fieldValue
                                        ? "text-yellow-500"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    <IconStarFilled className="size-6" />
                                  </span>
                                ))}
                              </div>
                              <span className="text-sm font-medium">
                                {fieldValue} out of {field.max || 5}
                              </span>
                            </div>
                          ) : field.type === "dropdown" ? (
                            <div className="p-3 bg-muted rounded-md">
                              <p className="text-sm">{String(fieldValue)}</p>
                            </div>
                          ) : field.type === "checkbox" && Array.isArray(fieldValue) ? (
                            <div className="space-y-2">
                              {field.options?.map((option: string) => (
                                <div key={option} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={fieldValue.includes(option)}
                                    disabled
                                    id={`response-${field.id}-${option}`}
                                  />
                                  <Label
                                    htmlFor={`response-${field.id}-${option}`}
                                    className="font-normal cursor-default"
                                  >
                                    {option}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          ) : field.type === "date" ? (
                            <div className="p-3 bg-muted rounded-md">
                              <p className="text-sm">{format(new Date(String(fieldValue)), "MMM dd, yyyy")}</p>
                            </div>
                          ) : (
                            <div className="p-3 bg-muted rounded-md">
                              <p className="text-sm">{String(fieldValue)}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Download Button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    downloadFormResponse(
                      selectedFormData.form,
                      selectedFormData.formData,
                      selectedFormData.stepName,
                      selectedFormData.completedDate,
                      selectedAppraisal
                    )
                  }}
                >
                  <IconDownload className="size-4 mr-2" />
                  Download Form Response
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Manager Assignment Sheet */}
      <Sheet open={isEditManagerSheetOpen} onOpenChange={(open) => {
        setIsEditManagerSheetOpen(open)
        if (!open) {
          setEditingAssignmentId(null)
          setSelectedManagers([])
          setManagerSearchValues({})
          setManagerSourceType({})
        }
      }}>
        <SheetContent side="right" className="w-full! max-w-full! md:w-[70vw]! md:max-w-[70vw]! lg:w-[50vw]! lg:max-w-[50vw]! overflow-y-auto px-8 py-4">
          <SheetHeader>
            <SheetTitle>Edit Manager Assignment</SheetTitle>
            <SheetDescription>
              Change the assigned manager(s) for this review cycle. This will override the employee&apos;s default manager assignment for this specific review cycle only.
            </SheetDescription>
          </SheetHeader>
          {editingAssignmentId && (() => {
            const assignment = assignments.find((a) => a.id === editingAssignmentId)
            const employee = assignment ? getEmployee(assignment.employeeId) : null
            const template = assignment ? getWorkflowTemplate(assignment.workflowTemplateId) : null
            
            return (
              <div className="space-y-6 mt-6">
                {/* Assignment Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Assignment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-sm text-muted-foreground">Employee</Label>
                      <p className="font-medium">{employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Review Cycle</Label>
                      <p className="font-medium">{template?.name || "Unknown"}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <Badge variant={assignment?.status === "completed" ? "default" : assignment?.status === "in_progress" ? "secondary" : "outline"}>
                        {assignment?.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Manager Assignment */}
                <Card>
                  <CardHeader>
                    <CardTitle>Manager Assignment</CardTitle>
                    <CardDescription>
                      Assign managers for this review cycle. These will override the employee&apos;s default managers for this review cycle only.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Show default managers */}
                    {employee && employee.managers && employee.managers.length > 0 && (
                      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                        <Label className="text-sm font-semibold">Default Managers (from Employee Profile)</Label>
                        <div className="space-y-1">
                          {employee.managers.map((manager) => {
                            if (manager.isExternal && manager.externalName) {
                              return (
                                <div key={manager.level} className="text-sm text-muted-foreground">
                                  Level {manager.level}: {manager.externalName} ({manager.externalEmail || "No email"})
                                </div>
                              )
                            } else if (manager.employeeId) {
                              const managerEmp = getEmployee(manager.employeeId)
                              if (managerEmp) {
                                return (
                                  <div key={manager.level} className="text-sm text-muted-foreground">
                                    Level {manager.level}: {managerEmp.firstName} {managerEmp.lastName} ({managerEmp.email})
                                  </div>
                                )
                              }
                            }
                            return null
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          If no managers are assigned below, the default managers will be used.
                        </p>
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Managers</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addManagerLevel}
                        >
                          <IconPlus className="size-4 mr-1" />
                          Add Level
                        </Button>
                      </div>
                      {selectedManagers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No managers assigned. Click &apos;Add Level&apos; to assign managers.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {selectedManagers.map((managerLevel) => {
                            const selectedEmployee = availableManagers.find(
                              (m) => m.id === managerLevel.employeeId
                            )
                            const filteredManagers = getFilteredManagersForLevel(managerLevel.level)
                            
                            return (
                              <div
                                key={managerLevel.level}
                                className="rounded-md border p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                      Level {managerLevel.level}
                                    </Badge>
                                    {managerLevel.level === 1 && (
                                      <Badge variant="secondary" className="text-xs">
                                        Primary
                                      </Badge>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={() => removeManagerLevel(managerLevel.level)}
                                    className="h-6 w-6"
                                  >
                                    <IconX className="size-3" />
                                  </Button>
                                </div>
                                <div className="space-y-3">
                                  <ToggleGroup
                                    type="single"
                                    value={managerSourceType[managerLevel.level] || "existing"}
                                    onValueChange={(value) => {
                                      if (value) {
                                        setManagerSourceType((prev) => ({ ...prev, [managerLevel.level]: value as "existing" | "external" }))
                                        removeManagerFromLevel(managerLevel.level)
                                      }
                                    }}
                                    className="w-full"
                                  >
                                    <ToggleGroupItem value="existing" className="flex-1">
                                      Existing Employee
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="external" className="flex-1">
                                      External Manager
                                    </ToggleGroupItem>
                                  </ToggleGroup>

                                  {(!managerSourceType[managerLevel.level] || managerSourceType[managerLevel.level] === "existing") ? (
                                    <>
                                      <Combobox
                                        inputValue={managerSearchValues[managerLevel.level] || ""}
                                        onInputValueChange={(value) => {
                                          setManagerSearchValues((prev) => ({
                                            ...prev,
                                            [managerLevel.level]: value || "",
                                          }))
                                          if (!value && selectedEmployee) {
                                            removeManagerFromLevel(managerLevel.level)
                                          }
                                        }}
                                        onValueChange={(value) => {
                                          if (value) {
                                            const selectedManager = availableManagers.find(
                                              (m) => m.name === value
                                            )
                                            if (selectedManager && selectedEmployee?.id !== selectedManager.id) {
                                              selectManagerForLevel(managerLevel.level, selectedManager.id)
                                            }
                                          }
                                        }}
                                      >
                                        <ComboboxInput
                                          placeholder={`Search for level ${managerLevel.level} manager...`}
                                          showTrigger
                                          showClear={!!selectedEmployee}
                                          className="w-full"
                                        />
                                        <ComboboxContent>
                                          <ComboboxList>
                                            {filteredManagers.map((manager) => (
                                              <ComboboxItem
                                                key={manager.id}
                                                value={manager.name}
                                              >
                                                <div className="flex flex-col">
                                                  <span>{manager.name}</span>
                                                  <span className="text-xs text-muted-foreground">
                                                    {manager.email}
                                                  </span>
                                                </div>
                                              </ComboboxItem>
                                            ))}
                                          </ComboboxList>
                                        </ComboboxContent>
                                      </Combobox>
                                      {selectedEmployee && (
                                        <div className="mt-2 rounded-md border bg-muted/30 p-3">
                                          <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                              <span className="text-sm font-semibold">
                                                {selectedEmployee.name
                                                  .split(" ")
                                                  .map((n) => n[0])
                                                  .join("")
                                                  .toUpperCase()}
                                              </span>
                                            </div>
                                            <div className="flex flex-col flex-1">
                                              <span className="text-sm font-medium">
                                                {selectedEmployee.name}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                {selectedEmployee.email}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Checkbox
                                                id={`eval-responsible-${managerLevel.level}`}
                                                checked={managerLevel.isEvaluationResponsible || false}
                                                onCheckedChange={() => toggleEvaluationResponsible(managerLevel.level)}
                                              />
                                              <Label
                                                htmlFor={`eval-responsible-${managerLevel.level}`}
                                                className="text-xs cursor-pointer"
                                              >
                                                Evaluation Responsible
                                              </Label>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                          <Label htmlFor={`external-name-${managerLevel.level}`}>
                                            Manager Name
                                          </Label>
                                          <Input
                                            id={`external-name-${managerLevel.level}`}
                                            placeholder="Enter manager name"
                                            value={managerLevel.externalName || ""}
                                            onChange={(e) => {
                                              updateExternalManager(
                                                managerLevel.level,
                                                e.target.value,
                                                managerLevel.externalEmail || ""
                                              )
                                            }}
                                            className="w-full"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor={`external-email-${managerLevel.level}`}>
                                            Manager Email
                                          </Label>
                                          <Input
                                            id={`external-email-${managerLevel.level}`}
                                            type="email"
                                            placeholder="Enter manager email"
                                            value={managerLevel.externalEmail || ""}
                                            onChange={(e) => {
                                              updateExternalManager(
                                                managerLevel.level,
                                                managerLevel.externalName || "",
                                                e.target.value
                                              )
                                            }}
                                            className="w-full"
                                          />
                                        </div>
                                      </div>
                                      {(managerLevel.externalName || managerLevel.externalEmail) && (
                                        <div className="mt-2 rounded-md border bg-muted/30 p-3">
                                          <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                              <span className="text-sm font-semibold">
                                                {managerLevel.externalName
                                                  ? managerLevel.externalName
                                                      .split(" ")
                                                      .map((n) => n[0])
                                                      .join("")
                                                      .toUpperCase()
                                                  : "EM"}
                                              </span>
                                            </div>
                                            <div className="flex flex-col flex-1">
                                              <span className="text-sm font-medium">
                                                {managerLevel.externalName || "External Manager"}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                {managerLevel.externalEmail || "No email"}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Checkbox
                                                id={`eval-responsible-ext-${managerLevel.level}`}
                                                checked={managerLevel.isEvaluationResponsible || false}
                                                onCheckedChange={() => toggleEvaluationResponsible(managerLevel.level)}
                                              />
                                              <Label
                                                htmlFor={`eval-responsible-ext-${managerLevel.level}`}
                                                className="text-xs cursor-pointer"
                                              >
                                                Evaluation Responsible
                                              </Label>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <SheetFooter className="flex items-center justify-between">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      // Clear overrides to use default managers
                      setAssignments((prev) =>
                        prev.map((assignment) =>
                          assignment.id === editingAssignmentId
                            ? {
                                ...assignment,
                                managerOverrides: undefined,
                                updatedAt: new Date().toISOString(),
                              }
                            : assignment
                        )
                      )
                      toast.success("Manager overrides cleared. Using default managers.")
                      setIsEditManagerSheetOpen(false)
                      setEditingAssignmentId(null)
                      setSelectedManagers([])
                      setManagerSearchValues({})
                      setManagerSourceType({})
                    }}
                  >
                    Reset to Default Managers
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditManagerSheetOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveManagerChanges}>
                      Save Changes
                    </Button>
                  </div>
                </SheetFooter>
              </div>
            )
          })()}
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default function AppraisalsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col gap-4 py-4 md:gap-4 md:py-4">
        <div className="px-4 lg:px-6">
          <h2 className="text-2xl font-semibold">Appraisals</h2>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    }>
      <AppraisalsPageContent />
    </Suspense>
  )
}
