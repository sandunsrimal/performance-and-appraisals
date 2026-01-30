"use client"

import * as React from "react"
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
import { Input } from "@/components/ui/input"
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
import { IconCalendar, IconCheck, IconClock, IconFileText, IconUsers, IconEye, IconDownload, IconStarFilled } from "@tabler/icons-react"
import { demoEmployees } from "@/lib/data/demo-employees"
import { type Appraisal, type WorkflowAssignment, type EvaluationForm } from "@/lib/types"
import { workflowAssignments, getWorkflowTemplate, getEmployee, initializeWorkflowData, getEvaluationForm } from "@/lib/workflow-data"
import { useRole } from "@/lib/role-context"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

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

  // Get current step info
  const currentStep = template.steps.find((s) => s.id === assignment.currentStepId)
  const completedSteps = Object.keys(assignment.stepCompletions).filter(
    (stepId) => assignment.stepCompletions[stepId].completed
  ).length

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

  // Get reviewers (managers) from employee or template steps
  const reviewers: string[] = []
  template.steps.forEach((step) => {
    if (step.managerLevel) {
      const manager = employee.managers?.find((m) => m.level === step.managerLevel)
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

  // Calculate overall rating from completed step form data
  let overallRating: number | null = null
  const ratings: number[] = []
  Object.values(assignment.stepCompletions).forEach((completion) => {
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
    status: statusMap[assignment.status],
    overallRating,
    reviewers: [...new Set(reviewers)], // Remove duplicates
    startDate: assignment.startDate,
    dueDate: assignment.endDate || assignment.startDate,
    completedDate: assignment.status === "completed" ? assignment.endDate || assignment.updatedAt : null,
    goals: [],
    achievements: [],
    areasForImprovement: [],
    comments: currentStep ? `Current step: ${currentStep.name} (${completedSteps}/${template.steps.length} completed)` : "",
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
  content += `Step: ${stepName}\n`
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

export default function AppraisalsPage() {
  const { currentUserId, currentRole } = useRole()
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
  const [isMounted, setIsMounted] = React.useState(false)
  const [formViewSheetOpen, setFormViewSheetOpen] = React.useState(false)
  const [selectedFormData, setSelectedFormData] = React.useState<{
    form: EvaluationForm
    formData: Record<string, unknown>
    stepName: string
    completedDate?: string
  } | null>(null)

  // Initialize workflow data with employees
  React.useEffect(() => {
    setIsMounted(true)
    initializeWorkflowData(demoEmployees)
    setAssignments(workflowAssignments)
  }, [])

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
        header: "Procedure & Period",
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
                  {Object.keys(assignment.stepCompletions).filter(
                    (stepId) => assignment.stepCompletions[stepId].completed
                  ).length} / {template.steps.length} steps
                </div>
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
    ],
    [assignments]
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
              View employee performance appraisals linked to workflow assignments. Appraisals are automatically created from workflow assignments.
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
              View detailed information about this appraisal, workflow steps, and form feedbacks
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

                {/* Workflow Procedure */}
                {template && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Workflow Procedure</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Procedure Name</p>
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

                {/* Workflow Steps */}
                {template && assignment && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Workflow Steps</CardTitle>
                      <CardDescription>
                        {Object.keys(assignment.stepCompletions).filter(
                          (stepId) => assignment.stepCompletions[stepId].completed
                        ).length} of {template.steps.length} steps completed
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {template.steps
                          .sort((a, b) => a.order - b.order)
                          .map((step) => {
                            const completion = assignment.stepCompletions[step.id]
                            const isCompleted = completion?.completed || false
                            const form = step.evaluationFormId ? getEvaluationForm(step.evaluationFormId) : null
                            
                            return (
                              <div key={step.id} className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                                      isCompleted 
                                        ? "bg-green-500 border-green-500 text-white" 
                                        : assignment.currentStepId === step.id
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "bg-muted border-muted-foreground/30 text-muted-foreground"
                                    }`}>
                                      {isCompleted ? (
                                        <IconCheck className="size-4" />
                                      ) : (
                                        <span className="text-xs font-semibold">{step.order}</span>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold">{step.name}</h4>
                                        <Badge variant={step.type === "evaluation" ? "default" : step.type === "meeting" ? "secondary" : step.type === "review" ? "outline" : "secondary"}>
                                          {step.type}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                                      
                                      {/* Attendees */}
                                      {step.attendees && step.attendees.length > 0 && (
                                        <div className="flex items-center gap-2 mb-2">
                                          <IconUsers className="size-4 text-muted-foreground" />
                                          <span className="text-xs text-muted-foreground">
                                            Attendees: {step.attendees.map(a => {
                                              if (a === "employee") {
                                                return "Employee"
                                              }
                                              // Check if it's a manager level (e.g., "manager_level_1", "manager_level_2")
                                              const managerLevelMatch = a.match(/^manager_level_(\d+)$/)
                                              if (managerLevelMatch && employee) {
                                                const level = parseInt(managerLevelMatch[1], 10)
                                                const manager = employee.managers?.find((m) => m.level === level)
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
                                      {!isCompleted && assignment.currentStepId === step.id && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <IconClock className="size-3 text-primary" />
                                          <span>Current Step</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
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
                                                stepName: step.name,
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
                                              downloadFormResponse(form, completion.formData, step.name, completion.completedDate, selectedAppraisal)
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
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <IconFileText className="size-4" />
                                      <span>Form: {form.name} (Not completed yet)</span>
                                    </div>
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
    </div>
  )
}
