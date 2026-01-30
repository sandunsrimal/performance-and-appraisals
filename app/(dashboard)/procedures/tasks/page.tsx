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
  type WorkflowStep,
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
  step: WorkflowStep,
  assignmentStartDate: string,
  assignmentEndDate?: string
): Date | null => {
  const startDate = new Date(assignmentStartDate)
  const endDate = assignmentEndDate ? new Date(assignmentEndDate) : null

  if (!step.dueDateType) return null

  switch (step.dueDateType) {
    case "on_interval":
      return startDate
    case "before_interval":
      if (step.dueDateOffset) {
        return addWeeks(startDate, -step.dueDateOffset)
      }
      return startDate
    case "after_interval":
      if (step.dueDateOffset) {
        return addWeeks(startDate, step.dueDateOffset)
      }
      return endDate || startDate
    case "custom":
      if (step.dueDateOffset !== undefined && step.dueDateUnit) {
        const offset = step.dueDateOffset
        switch (step.dueDateUnit) {
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

// Convert workflow assignments to tasks (for current employee and employees they manage)
const convertAssignmentsToTasks = (
  assignments: WorkflowAssignment[],
  currentEmployeeId: string,
  currentUserName: string
): Task[] => {
  const tasks: Task[] = []
  const now = new Date()

  assignments.forEach((assignment) => {
    const template = getWorkflowTemplate(assignment.workflowTemplateId)
    const employee = getEmployee(assignment.employeeId)

    if (!template || !employee) return

    // Check if this assignment is relevant to the current user:
    // 1. Current user is the employee (their own tasks)
    // 2. Current user is a manager for this employee and is involved in the step
    const isCurrentUserEmployee = assignment.employeeId === currentEmployeeId
    
    // Check if current user manages this employee
    const currentUserManagesEmployee = employee.managers?.some(
      (m) => m.employeeId === currentEmployeeId
    )

    // Only show tasks for steps that exist in stepCompletions
    // (steps are already filtered during workflow initialization based on employee role)
    template.steps.forEach((step) => {
      // Skip steps that don't exist in stepCompletions (they were filtered out during initialization)
      if (!(step.id in assignment.stepCompletions)) return
      
      // Check if current user is involved in this step
      let isCurrentUserInvolved = false
      
      if (isCurrentUserEmployee) {
        // Current user is the employee - show if step involves employee
        isCurrentUserInvolved = step.attendees?.includes("employee") || false
      } else if (currentUserManagesEmployee && step.attendees) {
        // Current user is a manager - check if they're involved in this step
        step.attendees.forEach((attendee) => {
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
      
      // Skip if current user is not involved in this step
      if (!isCurrentUserInvolved) return
      
      // Get context information
      const context = getTaskContext(employee, currentEmployeeId, currentUserName, step, template.name)
      const contextDisplay = formatTaskContextDisplay(context)
      const completion = assignment.stepCompletions[step.id]
        const isCompleted = completion?.completed || false
        const dueDate = calculateDueDate(
          step,
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
        } else if (assignment.currentStepId === step.id) {
          status = "in_progress"
        }

        // Get evaluation form name if exists
        const form = step.evaluationFormId
          ? getEvaluationForm(step.evaluationFormId)
          : null

        // Format attendees
        const attendees: string[] = []
        if (step.attendees) {
          step.attendees.forEach((attendee) => {
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
          id: `${assignment.id}-${step.id}`,
          assignmentId: assignment.id,
          stepId: step.id,
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          procedureName: template.name,
          stepName: step.name,
          stepDescription: step.description || "",
          stepType: step.type,
          status,
          dueDate,
          completedDate: completion?.completedDate || null,
          attendees,
          evaluationFormId: step.evaluationFormId,
          evaluationFormName: form?.name,
          isRequired: step.required,
          formData: completion?.formData,
          // Add context information
          contextTitle: contextDisplay.title,
          contextSubtitle: contextDisplay.subtitle,
          contextBadge: contextDisplay.badge,
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
  const { currentUserId, currentUserName } = useRole()

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
    const convertedTasks = convertAssignmentsToTasks(
      assignments,
      currentUserId,
      currentUserName
    )
    setTasks(convertedTasks)
  }, [assignments, currentUserId, currentUserName])

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
              const updatedStepCompletions = {
                ...assignment.stepCompletions,
                [draggedTask.stepId]: {
                  ...assignment.stepCompletions[draggedTask.stepId],
                  completed: newStatus === "completed",
                  completedDate:
                    newStatus === "completed"
                      ? new Date().toISOString()
                      : assignment.stepCompletions[draggedTask.stepId]
                          ?.completedDate,
                  completedBy:
                    newStatus === "completed"
                      ? currentUserId
                      : assignment.stepCompletions[draggedTask.stepId]
                          ?.completedBy,
                },
              }

              return {
                ...assignment,
                stepCompletions: updatedStepCompletions,
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
