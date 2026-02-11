"use client"

import * as React from "react"
import {
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCalendar,
  IconFileText,
  IconMessageCircle,
  IconCheck,
  IconClock,
  IconUsers,
  IconEye,
  IconAlertCircle,
} from "@tabler/icons-react"
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
import { format, addDays, addWeeks, addMonths, isBefore, isAfter } from "date-fns"

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
  type Employee,
  type WorkflowTemplate,
  type EvaluationForm,
} from "@/lib/types"
import {
  workflowAssignments,
  getWorkflowTemplate,
  getEmployee,
  initializeWorkflowData,
  getEvaluationForm,
  getEffectiveManagers,
} from "@/lib/workflow-data"
import { useRole } from "@/lib/role-context"

// Task type representing individual steps from workflow assignments
type Task = {
  id: string
  assignmentId: string
  stepId: string
  employeeId: string
  employeeName: string
  employeeEmail: string
  department: string
  position: string
  procedureName: string
  stepName: string
  stepDescription: string
  stepType: "evaluation" | "meeting" | "review" | "approval"
  status: "pending" | "in_progress" | "completed" | "overdue" | "cancelled"
  dueDate: Date | null
  completedDate: string | null
  completedBy: string | null
  attendees: string[]
  evaluationFormId?: string
  evaluationFormName?: string
  isRequired: boolean
  reminderSettings?: {
    enabled: boolean
    reminderDays: number
    channels: ("email" | "in-app" | "sms")[]
  }
  formData?: Record<string, unknown>
}

// Helper function to calculate due date from stage configuration
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

// Convert workflow assignments to tasks
const convertAssignmentsToTasks = (
  assignments: WorkflowAssignment[],
  currentEmployeeId?: string,
  currentRole?: "admin" | "employee" | "manager"
): Task[] => {
  const tasks: Task[] = []
  const now = new Date()

  // Sort assignments by ID for consistent order
  const sortedAssignments = [...assignments].sort((a, b) => a.id.localeCompare(b.id))

  sortedAssignments.forEach((assignment) => {
    const template = getWorkflowTemplate(assignment.workflowTemplateId)
    const employee = getEmployee(assignment.employeeId)

    if (!template || !employee) return

    // Sort stages by order for consistent processing
    const sortedStages = [...template.stages].sort((a, b) => a.order - b.order)

    sortedStages.forEach((stage) => {
      // Get effective managers for this assignment (overrides or employee's managers)
      const effectiveManagers = getEffectiveManagers(assignment)
      
      // Role-based filtering: Managers (excluding admin) only see their own tasks and tasks where they're involved
      if (currentRole === "manager" && currentEmployeeId && currentEmployeeId !== "admin-1") {
        // Check if current user is the employee for this assignment
        const isCurrentUserEmployee = assignment.employeeId === currentEmployeeId
        
        // Check if current user manages this employee
        const currentUserManagesEmployee = effectiveManagers.some(
          (m) => m.employeeId === currentEmployeeId
        )

        // Skip if current user is not the employee and doesn't manage this employee
        if (!isCurrentUserEmployee && !currentUserManagesEmployee) return

        // If current user manages this employee, check if they're involved in this stage
        if (currentUserManagesEmployee && !isCurrentUserEmployee) {
          let isCurrentUserInvolved = false
          
          if (stage.attendees) {
            stage.attendees.forEach((attendee) => {
              if (attendee.startsWith("manager_level_")) {
                const levelMatch = attendee.match(/manager_level_(\d+)/)
                if (levelMatch && effectiveManagers.length > 0) {
                  const level = Number.parseInt(levelMatch[1], 10)
                  const manager = effectiveManagers.find((m) => m.level === level)
                  if (manager?.employeeId === currentEmployeeId) {
                    isCurrentUserInvolved = true
                  }
                }
              }
            })
          }
          
          // Skip if current user is not involved in this stage
          if (!isCurrentUserInvolved) return
        }
        
        // If current user is the employee, only show stages where they are an attendee
        if (isCurrentUserEmployee && !stage.attendees?.includes("employee")) {
          return
        }
      }
      
      // For non-admin roles, skip stages that don't exist in stageCompletions (they were filtered out during initialization)
      // Exception: Managers can see approval stages even if not in stageCompletions yet
      if (currentRole !== "admin" && currentRole !== undefined) {
        const isApprovalStage = stage.type === "approval"
        const isManagerViewingRelatedTask = currentRole === "manager" && currentEmployeeId && currentEmployeeId !== "admin-1" && effectiveManagers.some((m) => m.employeeId === currentEmployeeId)
        
        // Skip if stage not in completions, unless it's an approval stage for a manager
        if (!(stage.id in assignment.stageCompletions) && !(isApprovalStage && isManagerViewingRelatedTask)) {
          return
        }
      }
      
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

      // Format attendees - use effective managers (assignment overrides or employee's managers)
      const attendees: string[] = []
      if (stage.attendees) {
        stage.attendees.forEach((attendee) => {
          if (attendee === "employee") {
            attendees.push(`${employee.firstName} ${employee.lastName}`)
          } else {
            const levelMatch = attendee.match(/manager_level_(\d+)/)
            if (levelMatch && effectiveManagers.length > 0) {
              const level = parseInt(levelMatch[1], 10)
              const manager = effectiveManagers.find((m) => m.level === level)
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
        employeeEmail: employee.email,
        department: employee.department,
        position: employee.position,
        procedureName: template.name,
        stepName: stage.name,
        stepDescription: stage.description || "",
        stepType: stage.type,
        status,
        dueDate,
        completedDate: completion?.completedDate || null,
        completedBy: completion?.completedBy || null,
        attendees,
        evaluationFormId: stage.evaluationFormId,
        evaluationFormName: form?.name,
        isRequired: stage.required,
        reminderSettings: stage.reminderSettings
          ? {
              ...stage.reminderSettings,
              channels: stage.reminderSettings.channels || ["email", "in-app"],
            }
          : undefined,
        formData: completion?.formData,
      }

      tasks.push(task)
    })
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

export default function TaskManagementPage() {
  const { currentUserId, currentRole } = useRole()
  const [assignments, setAssignments] = React.useState<WorkflowAssignment[]>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [employeeFilter, setEmployeeFilter] = React.useState<string>("all")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [detailSheetOpen, setDetailSheetOpen] = React.useState(false)
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null)
  const [isMounted, setIsMounted] = React.useState(false)

  // Initialize workflow data
  React.useEffect(() => {
    setIsMounted(true)
    initializeWorkflowData(demoEmployees)
    setAssignments(workflowAssignments)
  }, [])

  // Convert assignments to tasks with role-based filtering
  const tasks = React.useMemo(() => {
    return convertAssignmentsToTasks(assignments, currentUserId, currentRole)
  }, [assignments, currentUserId, currentRole])

  // Get unique employees for filtering
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

  // Filter tasks
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const matchesEmployee = employeeFilter === "all" || task.employeeId === employeeFilter
      const matchesType = typeFilter === "all" || task.stepType === typeFilter
      const matchesSearch =
        globalFilter === "" ||
        task.employeeName.toLowerCase().includes(globalFilter.toLowerCase()) ||
        task.stepName.toLowerCase().includes(globalFilter.toLowerCase()) ||
        task.procedureName.toLowerCase().includes(globalFilter.toLowerCase()) ||
        task.department.toLowerCase().includes(globalFilter.toLowerCase())

      return matchesStatus && matchesEmployee && matchesType && matchesSearch
    })
  }, [tasks, statusFilter, employeeFilter, typeFilter, globalFilter])

  const columns: ColumnDef<Task>[] = React.useMemo(
    () => [
      {
        accessorKey: "employeeName",
        header: "Employee",
        cell: ({ row }) => {
          const task = row.original
          return (
            <div className="flex flex-col">
              <span className="font-medium">{task.employeeName}</span>
              <span className="text-sm text-muted-foreground">
                {task.position}
              </span>
              <span className="text-xs text-muted-foreground">
                {task.department}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: "stepName",
        header: "Task",
        cell: ({ row }) => {
          const task = row.original
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {getStepTypeIcon(task.stepType)}
                <span className="font-medium">{task.stepName}</span>
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
              </div>
              <span className="text-sm text-muted-foreground">
                {task.procedureName}
              </span>
              {task.stepDescription && (
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {task.stepDescription}
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status
          return (
            <Badge variant={getStatusBadgeVariant(status)}>
              {status === "in_progress"
                ? "In Progress"
                : status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          )
        },
      },
      {
        accessorKey: "dueDate",
        header: "Due Date",
        cell: ({ row }) => {
          const task = row.original
          if (!task.dueDate) {
            return <span className="text-sm text-muted-foreground">Not set</span>
          }

          const isOverdue =
            task.status !== "completed" &&
            task.status !== "cancelled" &&
            isBefore(task.dueDate, new Date())

          return (
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <IconCalendar className="size-4 text-muted-foreground" />
                <span
                  className={`text-sm ${isOverdue ? "text-destructive font-medium" : ""}`}
                >
                  {format(task.dueDate, "MMM dd, yyyy")}
                </span>
              </div>
              {isOverdue && (
                <span className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <IconAlertCircle className="size-3" />
                  Overdue
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "attendees",
        header: "Attendees",
        cell: ({ row }) => {
          const task = row.original
          return (
            <div className="flex flex-col gap-1">
              {task.attendees.length > 0 ? (
                <>
                  {task.attendees.slice(0, 2).map((attendee, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs w-fit"
                    >
                      {attendee}
                    </Badge>
                  ))}
                  {task.attendees.length > 2 && (
                    <Badge variant="outline" className="text-xs w-fit">
                      +{task.attendees.length - 2} more
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground">No attendees</span>
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
            <span className="text-sm">
              {format(new Date(completedDate), "MMM dd, yyyy")}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data: filteredTasks,
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

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-4 md:py-4">
        <div className="px-4 lg:px-6">
          <h2 className="text-2xl font-semibold">Task Management</h2>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-4 md:py-4">
      {/* Header */}
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Task Management</h2>
            <p className="text-muted-foreground mt-2">
              Manage and track all appraisal-related tasks across all employees including form submissions, reviews, meetings, and approvals.
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
              placeholder="Search tasks, employees, procedures..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
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
          </div>
        </div>
      </div>

      {/* Tasks Table */}
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
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
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
                      setSelectedTask(row.original)
                      setDetailSheetOpen(true)
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No tasks found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-4">
          <div className="text-muted-foreground text-sm">
            Showing{" "}
            {table.getState().pagination.pageIndex *
              table.getState().pagination.pageSize +
              1}{" "}
            to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              filteredTasks.length
            )}{" "}
            of {filteredTasks.length} tasks
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <IconChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <div className="text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <IconChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <IconChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
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
                        Employee
                      </p>
                      <p className="text-base font-semibold">
                        {selectedTask.employeeName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTask.position} • {selectedTask.department}
                      </p>
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
                      {selectedTask.attendees.map((attendee, idx) => (
                        <Badge key={idx} variant="outline">
                          {attendee}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Evaluation Form */}
              {selectedTask.evaluationFormName && (
                <Card>
                  <CardHeader>
                    <CardTitle>Evaluation Form</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {selectedTask.evaluationFormName}
                      </p>
                      {selectedTask.formData ? (
                        <Badge variant="default" className="text-xs">
                          Form Completed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Form Pending
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reminder Settings */}
              {selectedTask.reminderSettings && (
                <Card>
                  <CardHeader>
                    <CardTitle>Reminder Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedTask.reminderSettings.enabled ? (
                      <div className="space-y-2">
                        <p className="text-sm">
                          Reminders enabled: {selectedTask.reminderSettings.reminderDays} day(s) before due date
                        </p>
                        <div className="flex gap-2">
                          {selectedTask.reminderSettings.channels?.map(
                            (channel) => (
                              <Badge key={channel} variant="outline" className="text-xs capitalize">
                                {channel}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Reminders disabled
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
