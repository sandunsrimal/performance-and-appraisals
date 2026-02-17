"use client"

import * as React from "react"
import {
  IconPlus,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCalendar,
  IconX,
  IconEdit,
  IconUsers,
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
import { toast } from "sonner"
import { format, addDays } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  type WorkflowAssignment,
  type WorkflowTemplate,
  type WorkflowMeeting,
  type Employee,
  type ManagerLevel,
} from "@/lib/types"
import {
  workflowTemplates,
  workflowAssignments,
  initializeWorkflowData,
  getWorkflowTemplate,
  getEmployee,
} from "@/lib/workflow-data"
import { demoEmployees } from "@/lib/data/demo-employees"

export default function ProcedureAssignPage() {
  const [assignments, setAssignments] = React.useState<WorkflowAssignment[]>([])
  const [employees] = React.useState<Employee[]>(demoEmployees)
  const [templates, setTemplates] = React.useState<WorkflowTemplate[]>([])
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  // Assignment form state
  const [selectedProcedureId, setSelectedProcedureId] = React.useState<string>("")
  const [selectedEmployeeIds, setSelectedEmployeeIds] = React.useState<string[]>([])
  const [startDate, setStartDate] = React.useState<Date>(new Date())

  // Edit assignment state
  const [editingAssignmentId, setEditingAssignmentId] = React.useState<string | null>(null)
  const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false)
  const [selectedManagers, setSelectedManagers] = React.useState<ManagerLevel[]>([])
  const [managerSearchValues, setManagerSearchValues] = React.useState<Record<number, string>>({})
  const [managerSourceType, setManagerSourceType] = React.useState<Record<number, "existing" | "external">>({})

  // Initialize data
  React.useEffect(() => {
    initializeWorkflowData(employees)
    setTemplates(workflowTemplates.filter((t) => t.isActive))
    setAssignments(workflowAssignments)
  }, [employees])

  // Get available employees as managers
  const availableManagers = React.useMemo(() => {
    return employees
      .filter((emp) => emp.status === "Active")
      .map((emp) => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
      }))
  }, [employees])

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

  // Handle edit assignment
  const handleEditAssignment = (assignment: WorkflowAssignment) => {
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
    setIsEditSheetOpen(true)
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
    setIsEditSheetOpen(false)
    setEditingAssignmentId(null)
    setSelectedManagers([])
    setManagerSearchValues({})
    setManagerSourceType({})
  }

  // Get available procedures for selected employee
  const getAvailableProcedures = (employeeId: string): WorkflowTemplate[] => {
    const employee = employees.find((e) => e.id === employeeId)
    if (!employee) return []

    return templates.filter((template) => {
      const matchesPosition =
        template.applicablePositions.length === 0 ||
        template.applicablePositions.includes(employee.position)
      const matchesDepartment =
        template.applicableDepartments.length === 0 ||
        template.applicableDepartments.includes(employee.department)
      return matchesPosition || matchesDepartment
    })
  }

  // Filter assignments
  const filteredAssignments = React.useMemo(() => {
    return assignments.filter((assignment) => {
      const matchesSearch =
        globalFilter === "" ||
        getEmployee(assignment.employeeId)?.firstName.toLowerCase().includes(globalFilter.toLowerCase()) ||
        getEmployee(assignment.employeeId)?.lastName.toLowerCase().includes(globalFilter.toLowerCase()) ||
        getWorkflowTemplate(assignment.workflowTemplateId)?.name.toLowerCase().includes(globalFilter.toLowerCase())

      const matchesStatus = statusFilter === "all" || assignment.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [assignments, globalFilter, statusFilter])

  // Handle assign procedure
  const handleAssign = () => {
    if (!selectedProcedureId) {
      toast.error("Please select a review cycle")
      return
    }

    if (selectedEmployeeIds.length === 0) {
      toast.error("Please select at least one employee")
      return
    }

    const template = getWorkflowTemplate(selectedProcedureId)
    if (!template) {
      toast.error("Review cycle template not found")
      return
    }

    const newAssignments = selectedEmployeeIds
      .map((employeeId) => {
        const employee = getEmployee(employeeId)
        if (!employee) return null

        // Calculate end date based on procedure review stages
        // Find the maximum offset from appraisal date
        let maxOffsetDays = 0
        template.stages.forEach((stage) => {
          if (stage.dueDateType && stage.dueDateOffset !== undefined) {
            let offsetDays = 0
            if (stage.dueDateType === "before_interval") {
              // Before interval: convert weeks to days (negative)
              offsetDays = -(stage.dueDateOffset * 7)
            } else if (stage.dueDateType === "after_interval") {
              // After interval: convert weeks to days (positive)
              offsetDays = stage.dueDateOffset * 7
            } else if (stage.dueDateType === "custom" && stage.dueDateOffset && stage.dueDateUnit) {
              // Custom: convert based on unit
              if (stage.dueDateUnit === "days") {
                offsetDays = stage.dueDateOffset
              } else if (stage.dueDateUnit === "weeks") {
                offsetDays = stage.dueDateOffset * 7
              } else if (stage.dueDateUnit === "months") {
                offsetDays = stage.dueDateOffset * 30
              }
            }
            // Track the maximum positive offset (furthest date after appraisal)
            if (offsetDays > maxOffsetDays) {
              maxOffsetDays = offsetDays
            }
          }
        })
        
        // Calculate end date: start date + interval period + max offset
        // For now, use a default interval period (e.g., quarterly = 90 days)
        const intervalDays = template.interval.type === "quarterly" ? 90
          : template.interval.type === "monthly" ? 30
          : template.interval.type === "biweekly" ? 14
          : template.interval.type === "annually" ? 365
          : template.interval.type === "biannually" ? 180
          : template.interval.type === "weekly" ? 7
          : template.interval.type === "custom" && template.interval.value && template.interval.unit
          ? template.interval.unit === "days" ? template.interval.value
          : template.interval.unit === "weeks" ? template.interval.value * 7
          : template.interval.value * 30
          : 90 // Default to quarterly
        
        const endDate = addDays(startDate, intervalDays + maxOffsetDays)

        return {
          id: `assignment-${Date.now()}-${employeeId}`,
          workflowTemplateId: selectedProcedureId,
          employeeId: employeeId,
          status: "not_started" as const,
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
          currentStageId: template.stages.length > 0 ? template.stages[0].id : undefined,
          stageCompletions: {} as Record<string, {
            completed: boolean
            completedDate?: string
            completedBy?: string
            formData?: Record<string, unknown>
          }>,
          meetings: [] as WorkflowMeeting[],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as WorkflowAssignment
      })
      .filter((a): a is WorkflowAssignment => a !== null)

    setAssignments((prev) => [...prev, ...newAssignments])

    // Update employee assigned procedure
    employees.forEach((emp) => {
      if (selectedEmployeeIds.includes(emp.id)) {
        if (!emp.assignedWorkflowIds) {
          emp.assignedWorkflowIds = []
        }
        if (!emp.assignedWorkflowIds.includes(selectedProcedureId)) {
          emp.assignedWorkflowIds.push(selectedProcedureId)
        }
      }
    })

    toast.success(`Review cycle assigned to ${newAssignments.length} employee(s)!`)
    setIsSheetOpen(false)
    setSelectedProcedureId("")
    setSelectedEmployeeIds([])
    setStartDate(new Date())
  }

  // Columns
  const columns: ColumnDef<WorkflowAssignment>[] = React.useMemo(
    () => [
      {
        accessorKey: "employeeId",
        header: "Employee",
        cell: ({ row }) => {
          const employee = getEmployee(row.original.employeeId)
          return (
            <div>
              <div className="font-medium">
                {employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"}
              </div>
              <div className="text-sm text-muted-foreground">
                {employee?.position} - {employee?.department}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "workflowTemplateId",
        header: "Review Cycle",
        cell: ({ row }) => {
          const template = getWorkflowTemplate(row.original.workflowTemplateId)
          return (
            <div>
              <div className="font-medium">{template?.name || "Unknown"}</div>
              <div className="text-sm text-muted-foreground">
                {template?.stages.length || 0} {template?.stages.length === 1 ? "stage" : "stages"}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status
          const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
            completed: "default",
            in_progress: "secondary",
            not_started: "outline",
            cancelled: "destructive",
          }
          return (
            <Badge variant={variants[status] || "outline"}>
              {status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </Badge>
          )
        },
      },
      {
        accessorKey: "startDate",
        header: "Start Date",
        cell: ({ row }) => format(new Date(row.original.startDate), "MMM dd, yyyy"),
      },
      {
        accessorKey: "endDate",
        header: "End Date",
        cell: ({ row }) =>
          row.original.endDate ? format(new Date(row.original.endDate), "MMM dd, yyyy") : "N/A",
      },
      {
        accessorKey: "currentStageId",
        header: "Progress",
        cell: ({ row }) => {
          const template = getWorkflowTemplate(row.original.workflowTemplateId)
          if (!template) return "N/A"

          const completedStages = Object.keys(row.original.stageCompletions).filter(
            (stageId) => row.original.stageCompletions[stageId].completed
          ).length

          return (
            <div className="text-sm">
              {completedStages} / {template.stages.length} {template.stages.length === 1 ? "stage" : "stages"} completed
            </div>
          )
        },
      },
      {
        id: "managers",
        header: "Managers",
        cell: ({ row }) => {
          const assignment = row.original
          const employee = getEmployee(assignment.employeeId)
          const effectiveManagers = assignment.managerOverrides || employee?.managers || []
          const hasOverrides = assignment.managerOverrides && assignment.managerOverrides.length > 0
          
          if (effectiveManagers.length === 0) {
            return <span className="text-sm text-muted-foreground">No managers</span>
          }
          
          return (
            <div className="space-y-1">
              {hasOverrides && (
                <Badge variant="secondary" className="text-xs mb-1">
                  Custom
                </Badge>
              )}
              <div className="text-sm">
                {effectiveManagers.slice(0, 2).map((manager) => {
                  if (manager.isExternal && manager.externalName) {
                    return (
                      <div key={manager.level} className="text-xs">
                        L{manager.level}: {manager.externalName}
                      </div>
                    )
                  } else if (manager.employeeId) {
                    const managerEmp = getEmployee(manager.employeeId)
                    if (managerEmp) {
                      return (
                        <div key={manager.level} className="text-xs">
                          L{manager.level}: {managerEmp.firstName} {managerEmp.lastName}
                        </div>
                      )
                    }
                  }
                  return null
                })}
                {effectiveManagers.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{effectiveManagers.length - 2} more
                  </div>
                )}
              </div>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditAssignment(row.original)}
            >
              <IconEdit className="size-4" />
            </Button>
          )
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data: filteredAssignments,
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

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-4 md:py-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-2xl font-semibold">Assign Review Cycles</h2>
          <p className="text-muted-foreground mt-2">
            Assign appraisal review cycles to employees based on their roles and positions.
          </p>
        </div>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button
              onClick={() => {
                setSelectedProcedureId("")
                setSelectedEmployeeIds([])
                setStartDate(new Date())
              }}
            >
              <IconPlus className="size-4 mr-2" />
              Assign Workflow
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full! max-w-full! md:w-[70vw]! md:max-w-[70vw]! lg:w-[50vw]! lg:max-w-[50vw]! overflow-y-auto px-8 py-4">
            <SheetHeader>
              <SheetTitle>Assign Review Cycle to Employees</SheetTitle>
              <SheetDescription>
                Select a review cycle and assign it to one or more employees.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 mt-6">
              {/* Review Cycle Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Select Review Cycle</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Review Cycle Template *</Label>
                    <Select value={selectedProcedureId} onValueChange={setSelectedProcedureId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a review cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex flex-col">
                              <span>{template.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {template.applicablePositions.join(", ") || "All positions"}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedProcedureId && (
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <div className="text-sm font-medium mb-2">
                        {getWorkflowTemplate(selectedProcedureId)?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getWorkflowTemplate(selectedProcedureId)?.description}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Badge variant="secondary">
                          {getWorkflowTemplate(selectedProcedureId)?.stages.length} {getWorkflowTemplate(selectedProcedureId)?.stages.length === 1 ? "stage" : "stages"}
                        </Badge>
                        <Badge variant="secondary">
                          {getWorkflowTemplate(selectedProcedureId)?.meetingFrequencies.length} meetings
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Employee Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Select Employees</CardTitle>
                  <CardDescription>
                    Select employees to assign this procedure to. Only employees matching the procedure criteria are shown.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employees *</Label>
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                      {employees.map((employee) => {
                        const availableProcedures = getAvailableProcedures(employee.id)
                        const canAssign = availableProcedures.some((w) => w.id === selectedProcedureId)
                        
                        return (
                          <div
                            key={employee.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
                          >
                            <input
                              type="checkbox"
                              id={`emp-${employee.id}`}
                              checked={selectedEmployeeIds.includes(employee.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (!canAssign && selectedProcedureId) {
                                    toast.error(
                                      `Procedure not applicable for ${employee.firstName} ${employee.lastName}`
                                    )
                                    return
                                  }
                                  setSelectedEmployeeIds((prev) => [...prev, employee.id])
                                } else {
                                  setSelectedEmployeeIds((prev) =>
                                    prev.filter((id) => id !== employee.id)
                                  )
                                }
                              }}
                              disabled={!canAssign && !!selectedProcedureId}
                              className="size-4"
                            />
                            <label
                              htmlFor={`emp-${employee.id}`}
                              className={`flex-1 cursor-pointer ${
                                !canAssign && selectedProcedureId ? "opacity-50" : ""
                              }`}
                            >
                              <div className="font-medium">
                                {employee.firstName} {employee.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {employee.position} - {employee.department}
                              </div>
                            </label>
                            {!canAssign && selectedProcedureId && (
                              <Badge variant="outline" className="text-xs">
                                Not applicable
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {selectedEmployeeIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedEmployeeIds.map((empId) => {
                          const emp = employees.find((e) => e.id === empId)
                          return (
                            <Badge key={empId} variant="secondary" className="flex items-center gap-1">
                              {emp?.firstName} {emp?.lastName}
                              <IconX
                                className="size-3 cursor-pointer"
                                onClick={() => {
                                  setSelectedEmployeeIds((prev) =>
                                    prev.filter((id) => id !== empId)
                                  )
                                }}
                              />
                            </Badge>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Start Date */}
              <Card>
                <CardHeader>
                  <CardTitle>Start Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <IconCalendar className="mr-2 size-4" />
                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        className="rounded-lg border"
                      />
                    </PopoverContent>
                  </Popover>
                </CardContent>
              </Card>

              <SheetFooter>
                <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssign} disabled={!selectedProcedureId || selectedEmployeeIds.length === 0}>
                  Assign Procedure
                </Button>
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Search and Filters */}
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search assignments..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
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
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                    No procedure assignments found. Assign a procedure to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-4">
          <div className="text-muted-foreground text-sm">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              filteredAssignments.length
            )}{" "}
            of {filteredAssignments.length} assignments
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
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
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

      {/* Edit Assignment Manager Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={(open) => {
        setIsEditSheetOpen(open)
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
              Change the assigned manager(s) for this review cycle. This will override the employee's default manager assignment for this specific review cycle only.
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
                      Assign managers for this review cycle. These will override the employee's default managers for this review cycle only.
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
                          No managers assigned. Click &quot;Add Level&quot; to assign managers.
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
                      setIsEditSheetOpen(false)
                      setEditingAssignmentId(null)
                      setSelectedManagers([])
                      setManagerSearchValues({})
                      setManagerSourceType({})
                    }}
                  >
                    Clear Overrides
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditSheetOpen(false)}>
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
