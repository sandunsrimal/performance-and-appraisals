"use client"

import * as React from "react"
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconCopy,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconX,
  IconClock,
  IconUsers,
  IconBell,
  IconFileText,
  IconMessageCircle,
  IconCheck,
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
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  type WorkflowTemplate,
  type ReviewStage,
  type FrequencyType,
} from "@/lib/types"
import {
  workflowTemplates,
  evaluationForms,
  initializeWorkflowData,
} from "@/lib/workflow-data"

const frequencyOptions: { value: FrequencyType; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannually", label: "Bi-annually" },
  { value: "annually", label: "Annually" },
  { value: "custom", label: "Custom" },
]

// Department to positions mapping (same as employees page)
// Manager type for procedures
type ProcedureManager = {
  id: string
  fullName: string
  email: string
}

const departmentPositions: Record<string, string[]> = {
  Engineering: [
    "Software Engineer",
    "Senior Software Engineer",
    "Lead Engineer",
    "DevOps Engineer",
    "QA Engineer",
    "Engineering Manager",
  ],
  Marketing: [
    "Marketing Manager",
    "Marketing Specialist",
    "Content Writer",
    "SEO Specialist",
    "Social Media Manager",
    "Brand Manager",
  ],
  Sales: [
    "Sales Representative",
    "Sales Manager",
    "Account Executive",
    "Business Development Manager",
    "Sales Director",
  ],
  HR: [
    "HR Manager",
    "HR Specialist",
    "Recruiter",
    "HR Coordinator",
    "Talent Acquisition Manager",
  ],
  Finance: [
    "Financial Analyst",
    "Accountant",
    "Finance Manager",
    "CFO",
    "Controller",
  ],
  Operations: [
    "Operations Manager",
    "Operations Coordinator",
    "Operations Analyst",
    "Supply Chain Manager",
  ],
  Design: [
    "UI/UX Designer",
    "Graphic Designer",
    "Product Designer",
    "Design Manager",
    "Creative Director",
  ],
}

export default function ProceduresPage() {
  const [templates, setTemplates] = React.useState<WorkflowTemplate[]>([])
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [editingTemplateId, setEditingTemplateId] = React.useState<string | null>(null)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [templateToDelete, setTemplateToDelete] = React.useState<string | null>(null)
  const [viewSheetOpen, setViewSheetOpen] = React.useState(false)
  const [selectedTemplateForView, setSelectedTemplateForView] = React.useState<WorkflowTemplate | null>(null)

  // Form state
  const [formData, setFormData] = React.useState<Partial<WorkflowTemplate>>({
    name: "",
    description: "",
    applicablePositions: [],
    applicableDepartments: [],
    stages: [],
    meetingFrequencies: [],
    interval: {
      type: "quarterly",
    },
    managerLevels: [1, 2, 3], // Default manager levels
    notificationSettings: {
      meetingReminderDays: 7,
      formReminderDays: 7,
      enabled: true,
      channels: ["email", "in-app"],
    },
    isActive: true,
  })

  const [currentStep, setCurrentStep] = React.useState<Partial<ReviewStage>>({
    name: "",
    description: "",
    type: "evaluation",
    required: true,
    attendees: [],
    dueDateType: "on_interval",
    dueDateOffset: 0,
    requiredStageIds: [],
    reminderSettings: {
      enabled: true,
      reminderDays: 7,
      channels: ["email", "in-app"],
    },
  })


  // Search values for comboboxes
  const [positionSearchValue, setPositionSearchValue] = React.useState("")
  const [departmentSearchValue, setDepartmentSearchValue] = React.useState("")

  // Managers state
  const [managers, setManagers] = React.useState<ProcedureManager[]>([])
  const [newManagerName, setNewManagerName] = React.useState("")
  const [newManagerEmail, setNewManagerEmail] = React.useState("")

  // Initialize data
  React.useEffect(() => {
    initializeWorkflowData([])
    setTemplates(workflowTemplates)
  }, [])

  // Get unique positions and departments (use same departments as employees page)
  const positions = React.useMemo(() => {
    const posSet = new Set<string>()
    Object.values(departmentPositions).forEach((posList) => {
      posList.forEach((pos) => posSet.add(pos))
    })
    return Array.from(posSet).toSorted((a, b) => a.localeCompare(b))
  }, [])

  const departments = React.useMemo(() => {
    return Object.keys(departmentPositions).sort((a, b) => a.localeCompare(b))
  }, [])

  // Filter positions and departments for combobox (exclude already selected)
  const filteredPositions = React.useMemo(() => {
    const selected = new Set(formData.applicablePositions || [])
    return positions.filter(
      (pos) =>
        !selected.has(pos) &&
        (positionSearchValue === "" ||
          pos.toLowerCase().includes(positionSearchValue.toLowerCase()))
    )
  }, [positions, formData.applicablePositions, positionSearchValue])

  const filteredDepartments = React.useMemo(() => {
    const selected = new Set(formData.applicableDepartments || [])
    return departments.filter(
      (dept) =>
        !selected.has(dept) &&
        (departmentSearchValue === "" ||
          dept.toLowerCase().includes(departmentSearchValue.toLowerCase()))
    )
  }, [departments, formData.applicableDepartments, departmentSearchValue])

  // Filter templates
  const filteredTemplates = React.useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        globalFilter === "" ||
        template.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
        template.description.toLowerCase().includes(globalFilter.toLowerCase())

      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" && template.isActive) || (statusFilter === "inactive" && !template.isActive)

      return matchesSearch && matchesStatus
    })
  }, [templates, globalFilter, statusFilter])

  // Handle edit
  const handleEdit = React.useCallback((template: WorkflowTemplate) => {
    setEditingTemplateId(template.id)
    setFormData({
      name: template.name,
      description: template.description,
      applicablePositions: template.applicablePositions,
      applicableDepartments: template.applicableDepartments,
      stages: template.stages,
      meetingFrequencies: template.meetingFrequencies,
      interval: template.interval,
      managerLevels: template.managerLevels || [1, 2, 3],
      notificationSettings: template.notificationSettings,
      isActive: template.isActive,
    })
    setIsSheetOpen(true)
  }, [])

  // Handle duplicate
  const handleDuplicate = React.useCallback((template: WorkflowTemplate) => {
    const newTemplate: WorkflowTemplate = {
      ...template,
      id: `procedure-${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setTemplates((prev) => [...prev, newTemplate])
      toast.success("Review cycle template duplicated successfully!")
  }, [])

  // Handle delete
  const handleDelete = React.useCallback((templateId: string) => {
    setTemplateToDelete(templateId)
    setDeleteDialogOpen(true)
  }, [])

  const confirmDelete = React.useCallback(() => {
    if (templateToDelete) {
      setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete))
      toast.success("Review cycle template deleted successfully!")
      setTemplateToDelete(null)
    }
    setDeleteDialogOpen(false)
  }, [templateToDelete])

  // Add step
  const addStep = () => {
    if (!currentStep.name) {
      toast.error("Please enter a step name")
      return
    }

    if (!currentStep.attendees || currentStep.attendees.length === 0) {
      toast.error("Please select at least one attendee")
      return
    }

    const newStep: ReviewStage = {
      id: `stage-${Date.now()}`,
      name: currentStep.name || "",
      description: currentStep.description || "",
      order: (formData.stages?.length || 0) + 1,
      type: currentStep.type || "evaluation",
      evaluationFormId: currentStep.evaluationFormId,
      managerLevel: currentStep.managerLevel, // Keep for backward compatibility
      attendees: currentStep.attendees,
      dueDateType: currentStep.dueDateType || "on_interval",
      dueDateOffset: currentStep.dueDateOffset,
      dueDateUnit: currentStep.dueDateUnit,
      required: currentStep.required ?? true,
      requiredStageIds: currentStep.requiredStageIds && currentStep.requiredStageIds.length > 0 
        ? currentStep.requiredStageIds 
        : undefined,
      reminderSettings: currentStep.reminderSettings || {
        enabled: true,
        reminderDays: 7,
        channels: ["email", "in-app"],
      },
    }

    setFormData((prev) => ({
      ...prev,
      stages: [...(prev.stages || []), newStep],
    }))

    setCurrentStep({
      name: "",
      description: "",
      type: "evaluation",
      required: true,
      attendees: [],
      dueDateType: "on_interval",
      dueDateOffset: 0,
      requiredStageIds: [],
      reminderSettings: {
        enabled: true,
        reminderDays: 7,
        channels: ["email", "in-app"],
      },
    })
    toast.success("Review step added successfully!")
  }

  // Remove step
  const removeStep = (stepId: string) => {
    setFormData((prev) => ({
      ...prev,
      stages: prev.stages?.filter((s) => s.id !== stepId).map((s, index) => ({ ...s, order: index + 1 })) || [],
    }))
  }

  // Add manager
  const addManager = () => {
    if (!newManagerName.trim() || !newManagerEmail.trim()) {
      toast.error("Please enter both manager name and email")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newManagerEmail.trim())) {
      toast.error("Please enter a valid email address")
      return
    }

    const newManager: ProcedureManager = {
      id: `manager-${Date.now()}`,
      fullName: newManagerName.trim(),
      email: newManagerEmail.trim(),
    }

    setManagers((prev) => [...prev, newManager])
    setNewManagerName("")
    setNewManagerEmail("")
    toast.success("Manager added successfully!")
  }

  // Remove manager
  const removeManager = (managerId: string) => {
    setManagers((prev) => prev.filter((m) => m.id !== managerId))
    toast.success("Manager removed successfully!")
  }


  // Handle submit
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!formData.name) {
      toast.error("Please enter a review cycle name")
      return
    }

    const template: WorkflowTemplate = {
      id: editingTemplateId || `procedure-${Date.now()}`,
      name: formData.name || "",
      description: formData.description || "",
      applicablePositions: formData.applicablePositions || [],
      applicableDepartments: formData.applicableDepartments || [],
      stages: formData.stages || [],
      meetingFrequencies: formData.meetingFrequencies || [],
      interval: formData.interval || { type: "quarterly" },
      managerLevels: formData.managerLevels || [1, 2, 3],
      notificationSettings: formData.notificationSettings || {
        meetingReminderDays: 7,
        formReminderDays: 7,
        enabled: true,
        channels: ["email", "in-app"],
      },
      isActive: formData.isActive ?? true,
      createdAt: editingTemplateId
        ? templates.find((t) => t.id === editingTemplateId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (editingTemplateId) {
      setTemplates((prev) => prev.map((t) => (t.id === editingTemplateId ? template : t)))
      toast.success("Review cycle template updated successfully!")
    } else {
      setTemplates((prev) => [...prev, template])
      toast.success("Review cycle template created successfully!")
    }

    setIsSheetOpen(false)
    setEditingTemplateId(null)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      applicablePositions: [],
      applicableDepartments: [],
      stages: [],
      meetingFrequencies: [],
      interval: {
        type: "quarterly",
      },
      notificationSettings: {
        meetingReminderDays: 7,
        formReminderDays: 7,
        enabled: true,
        channels: ["email", "in-app"],
      },
      isActive: true,
    })
    setPositionSearchValue("")
    setDepartmentSearchValue("")
    setManagers([])
    setNewManagerName("")
    setNewManagerEmail("")
  }

  // Columns
  const columns: ColumnDef<WorkflowTemplate>[] = React.useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Review Cycle Name",
        size: 200,
        maxSize: 300,
        cell: ({ row }) => (
          <div className="max-w-[200px]">
            <div className="font-medium truncate">{row.original.name}</div>
            <div className="text-sm text-muted-foreground truncate">{row.original.description}</div>
          </div>
        ),
      },
      {
        accessorKey: "applicablePositions",
        header: "Applicable Positions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.applicablePositions.slice(0, 2).map((pos) => (
              <Badge key={pos} variant="secondary" className="text-xs">
                {pos}
              </Badge>
            ))}
            {row.original.applicablePositions.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{row.original.applicablePositions.length - 2} more
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: "stages",
        header: "Review Steps",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.stages.length} {row.original.stages.length === 1 ? "step" : "steps"}</span>
        ),
      },
      {
        accessorKey: "interval",
        header: "Appraisal Frequency",
        cell: ({ row }) => {
          const interval = row.original.interval
          const intervalLabel = frequencyOptions.find((opt) => opt.value === interval.type)?.label || interval.type
          const customText = interval.type === "custom" && interval.value && interval.unit
            ? ` (Every ${interval.value} ${interval.unit})`
            : ""
          return (
            <span className="text-sm">
              {intervalLabel}{customText}
            </span>
          )
        },
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "outline"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(row.original)}
            >
              <IconEdit className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDuplicate(row.original)}
            >
              <IconCopy className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(row.original.id)}
            >
              <IconTrash className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [handleEdit, handleDuplicate, handleDelete]
  )

  const table = useReactTable({
    data: filteredTemplates,
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
          <h2 className="text-2xl font-semibold">Review Cycle Templates</h2>
          <p className="text-muted-foreground mt-2">
            Create and manage customizable review cycle templates for different roles and positions.
          </p>
        </div>
        <Sheet open={isSheetOpen} onOpenChange={(open) => {
          setIsSheetOpen(open)
          if (!open) {
            setEditingTemplateId(null)
            resetForm()
          }
        }}>
          <SheetTrigger asChild>
            <Button onClick={() => {
              setEditingTemplateId(null)
              resetForm()
            }}>
              <IconPlus className="size-4 mr-2" />
              Create Review Cycle Template
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full! max-w-full! md:w-[70vw]! md:max-w-[70vw]! lg:w-[50vw]! lg:max-w-[50vw]! overflow-y-auto px-8 py-4">
            <SheetHeader>
              <SheetTitle>
                {editingTemplateId ? "Edit Review Cycle Template" : "Create New Review Cycle Template"}
              </SheetTitle>
              <SheetDescription>
                Configure a customizable review cycle template with steps, meetings, and notifications.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Review Cycle Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Software Engineer Appraisal Review Cycle"
                      required
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe this review cycle..."
                      rows={3}
                      className="w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Applicable Positions</Label>
                      <Combobox
                        inputValue={positionSearchValue}
                        onInputValueChange={(value) => {
                          setPositionSearchValue(value || "")
                        }}
                        onValueChange={(value) => {
                          // If value matches a position exactly (item was selected), add it
                          if (value) {
                            const matchedPosition = positions.find(
                              (pos) => pos === value
                            )
                            if (
                              matchedPosition &&
                              !formData.applicablePositions?.includes(matchedPosition)
                            ) {
                              setFormData((prev) => ({
                                ...prev,
                                applicablePositions: [
                                  ...(prev.applicablePositions || []),
                                  matchedPosition,
                                ],
                              }))
                              setPositionSearchValue("")
                            }
                          }
                        }}
                      >
                        <ComboboxInput
                          placeholder="Search and select positions..."
                          showTrigger
                          showClear={!!positionSearchValue}
                          className="w-full"
                        />
                        <ComboboxContent>
                          <ComboboxList>
                            {filteredPositions.length > 0 ? (
                              filteredPositions.map((pos) => (
                                <ComboboxItem key={pos} value={pos}>
                                  {pos}
                                </ComboboxItem>
                              ))
                            ) : (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                {positionSearchValue ? "No positions found" : "Start typing to search..."}
                              </div>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {formData.applicablePositions?.map((pos) => (
                          <Badge key={pos} variant="secondary" className="flex items-center gap-1">
                            {pos}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setFormData((prev) => ({
                                  ...prev,
                                  applicablePositions: prev.applicablePositions?.filter((p) => p !== pos) || [],
                                }))
                              }}
                              className="ml-1 rounded-full hover:bg-muted"
                            >
                              <IconX className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Applicable Departments</Label>
                      <Combobox
                        inputValue={departmentSearchValue}
                        onInputValueChange={(value) => {
                          setDepartmentSearchValue(value || "")
                        }}
                        onValueChange={(value) => {
                          // If value matches a department exactly (item was selected), add it
                          if (value) {
                            const matchedDepartment = departments.find(
                              (dept) => dept === value
                            )
                            if (
                              matchedDepartment &&
                              !formData.applicableDepartments?.includes(matchedDepartment)
                            ) {
                              setFormData((prev) => ({
                                ...prev,
                                applicableDepartments: [
                                  ...(prev.applicableDepartments || []),
                                  matchedDepartment,
                                ],
                              }))
                              setDepartmentSearchValue("")
                            }
                          }
                        }}
                      >
                        <ComboboxInput
                          placeholder="Search and select departments..."
                          showTrigger
                          showClear={!!departmentSearchValue}
                          className="w-full"
                        />
                        <ComboboxContent>
                          <ComboboxList>
                            {filteredDepartments.length > 0 ? (
                              filteredDepartments.map((dept) => (
                                <ComboboxItem key={dept} value={dept}>
                                  {dept}
                                </ComboboxItem>
                              ))
                            ) : (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                {departmentSearchValue ? "No departments found" : "Start typing to search..."}
                              </div>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {formData.applicableDepartments?.map((dept) => (
                          <Badge key={dept} variant="secondary" className="flex items-center gap-1">
                            {dept}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setFormData((prev) => ({
                                  ...prev,
                                  applicableDepartments: prev.applicableDepartments?.filter((d) => d !== dept) || [],
                                }))
                              }}
                              className="ml-1 rounded-full hover:bg-muted"
                            >
                              <IconX className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interval">
                      Appraisal Frequency <span className="text-destructive">*</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        value={formData.interval?.type || "quarterly"}
                        onValueChange={(value: FrequencyType) =>
                          setFormData((prev) => ({
                            ...prev,
                            interval: {
                              ...prev.interval,
                              type: value,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {frequencyOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.interval?.type === "custom" && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            min={1}
                            value={formData.interval?.value || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                interval: {
                                  ...prev.interval!,
                                  value: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
                                },
                              }))
                            }
                            placeholder="Value"
                            className="w-full"
                          />
                          <Select
                            value={formData.interval?.unit || "weeks"}
                            onValueChange={(value: "days" | "weeks" | "months") =>
                              setFormData((prev) => ({
                                ...prev,
                                interval: {
                                  ...prev.interval!,
                                  unit: value,
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="days">Days</SelectItem>
                              <SelectItem value="weeks">Weeks</SelectItem>
                              <SelectItem value="months">Months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      How often appraisals should occur (e.g., quarterly, monthly, yearly). Steps will be scheduled relative to each appraisal date.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Manager Levels Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Manager Levels</CardTitle>
                  <CardDescription>
                    Configure available manager levels for this review cycle. These will be available as attendee options in steps.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Available Manager Levels</Label>
                    <div className="flex flex-wrap gap-2">
                      {(formData.managerLevels || [1, 2, 3])
                        .sort((a, b) => a - b)
                        .map((level) => (
                          <Badge key={level} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                            Manager Level {level}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setFormData((prev) => ({
                                  ...prev,
                                  managerLevels: (prev.managerLevels || [1, 2, 3]).filter((l) => l !== level),
                                }))
                              }}
                              className="ml-1 rounded-full hover:bg-muted"
                            >
                              <IconX className="size-3" />
                            </button>
                          </Badge>
                        ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentLevels = formData.managerLevels || [1, 2, 3]
                        const nextLevel = currentLevels.length > 0 ? Math.max(...currentLevels) + 1 : 1
                        setFormData((prev) => ({
                          ...prev,
                          managerLevels: [...(prev.managerLevels || [1, 2, 3]), nextLevel].sort((a, b) => a - b),
                        }))
                      }}
                      className="mt-2"
                    >
                      <IconPlus className="size-4 mr-2" />
                      Add Manager Level
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Add or remove manager levels. These will appear as attendee options when creating review steps.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Managers List */}
              <Card>
                <CardHeader>
                  <CardTitle>Managers</CardTitle>
                  <CardDescription>
                    Add and manage a list of managers with their full names and email addresses for this review cycle.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Manager Form */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-medium">Add New Manager</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="manager-name">
                          Full Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="manager-name"
                          value={newManagerName}
                          onChange={(e) => setNewManagerName(e.target.value)}
                          placeholder="Enter manager's full name"
                          className="w-full"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addManager()
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manager-email">
                          Email Address <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="manager-email"
                          type="email"
                          value={newManagerEmail}
                          onChange={(e) => setNewManagerEmail(e.target.value)}
                          placeholder="Enter manager's email"
                          className="w-full"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addManager()
                            }
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={addManager}
                      className="w-full"
                      disabled={!newManagerName.trim() || !newManagerEmail.trim()}
                    >
                      <IconPlus className="size-4 mr-2" />
                      Add Manager
                    </Button>
                  </div>

                  {/* Managers List */}
                  {managers.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">
                          Managers ({managers.length})
                        </Label>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2 bg-muted/30">
                        {managers.map((manager) => (
                          <div
                            key={manager.id}
                            className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                                  <span className="text-sm font-semibold">
                                    {manager.fullName
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {manager.fullName}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {manager.email}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeManager(manager.id)}
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                            >
                              <IconX className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/30">
                      <p className="text-sm">No managers added yet. Add managers using the form above.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Review Stages */}
              <Card>
                <CardHeader>
                  <CardTitle>Review Steps</CardTitle>
                    <CardDescription>
                    Define the review steps in this review cycle (reviews, meetings, approvals, etc.)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Review Stage Form */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-medium">Add New Review Step</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Step Name *</Label>
                        <Input
                          value={currentStep.name}
                          onChange={(e) => setCurrentStep((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Self Review"
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Step Type *</Label>
                        <Select
                          value={currentStep.type}
                          onValueChange={(value: ReviewStage["type"]) =>
                            setCurrentStep((prev) => ({ ...prev, type: value }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="evaluation">Review</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="approval">Approval</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={currentStep.description}
                        onChange={(e) => setCurrentStep((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Review step description..."
                        rows={2}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Attendee(s) <span className="text-destructive">*</span></Label>
                      <div className="flex flex-wrap gap-4">
                        {/* Employee option */}
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="attendee-employee"
                            checked={currentStep.attendees?.includes("employee") ?? false}
                            onCheckedChange={(checked) => {
                              const current = currentStep.attendees || []
                              setCurrentStep((prev) => ({
                                ...prev,
                                attendees: checked
                                  ? [...current, "employee"]
                                  : current.filter((p) => p !== "employee"),
                              }))
                            }}
                          />
                          <Label htmlFor="attendee-employee" className="cursor-pointer">
                            Employee
                          </Label>
                        </div>
                        {/* Dynamic manager levels */}
                        {(formData.managerLevels || [1, 2, 3])
                          .sort((a, b) => a - b)
                          .map((level) => {
                            const value = `manager_level_${level}`
                            return (
                              <div key={value} className="flex items-center gap-2">
                                <Checkbox
                                  id={`attendee-${value}`}
                                  checked={currentStep.attendees?.includes(value) ?? false}
                                  onCheckedChange={(checked) => {
                                    const current = currentStep.attendees || []
                                    setCurrentStep((prev) => ({
                                      ...prev,
                                      attendees: checked
                                        ? [...current, value]
                                        : current.filter((p) => p !== value),
                                    }))
                                  }}
                                />
                                <Label htmlFor={`attendee-${value}`} className="cursor-pointer">
                                  Manager Level {level}
                                </Label>
                              </div>
                            )
                          })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select who should attend or participate in this step
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Due Date Relative to Appraisal Date</Label>
                        <Select
                          value={currentStep.dueDateType || "on_interval"}
                          onValueChange={(value: "before_interval" | "on_interval" | "after_interval" | "custom") =>
                            setCurrentStep((prev) => ({
                              ...prev,
                              dueDateType: value,
                              dueDateOffset: value === "on_interval" ? 0 : prev.dueDateOffset || 1,
                              dueDateUnit: value === "custom" ? (prev.dueDateUnit || "weeks") : undefined,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="before_interval">Before Appraisal Date</SelectItem>
                            <SelectItem value="on_interval">On Appraisal Date</SelectItem>
                            <SelectItem value="after_interval">After Appraisal Date</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                        {currentStep.dueDateType && currentStep.dueDateType !== "on_interval" && (
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              min={currentStep.dueDateType === "custom" ? undefined : 1}
                              value={currentStep.dueDateOffset !== undefined ? currentStep.dueDateOffset : ""}
                              onChange={(e) =>
                                setCurrentStep((prev) => ({
                                  ...prev,
                                  dueDateOffset: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
                                }))
                              }
                              placeholder={currentStep.dueDateType === "custom" ? "e.g., -1 or 1" : "e.g., 1"}
                              className="w-full"
                            />
                            {currentStep.dueDateType === "custom" ? (
                              <Select
                                value={currentStep.dueDateUnit || "weeks"}
                                onValueChange={(value: "days" | "weeks" | "months") =>
                                  setCurrentStep((prev) => ({
                                    ...prev,
                                    dueDateUnit: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="days">Days</SelectItem>
                                  <SelectItem value="weeks">Weeks</SelectItem>
                                  <SelectItem value="months">Months</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select value="weeks" disabled>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="weeks">Weeks</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {currentStep.dueDateType === "before_interval" && currentStep.dueDateOffset
                            ? `${currentStep.dueDateOffset} week(s) before the appraisal date`
                            : currentStep.dueDateType === "on_interval"
                            ? "Due on the appraisal date"
                            : currentStep.dueDateType === "after_interval" && currentStep.dueDateOffset
                            ? `${currentStep.dueDateOffset} week(s) after the appraisal date`
                            : currentStep.dueDateType === "custom" && currentStep.dueDateOffset !== undefined && currentStep.dueDateUnit
                            ? `${Math.abs(currentStep.dueDateOffset)} ${currentStep.dueDateUnit} ${currentStep.dueDateOffset < 0 ? "before" : currentStep.dueDateOffset > 0 ? "after" : "on"} the appraisal date`
                            : "Set when this step is due relative to the appraisal date"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Review Form</Label>
                        <Select
                          value={currentStep.evaluationFormId || ""}
                          onValueChange={(value) =>
                            setCurrentStep((prev) => ({ ...prev, evaluationFormId: value }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select form" />
                          </SelectTrigger>
                          <SelectContent>
                            {evaluationForms.map((form) => (
                              <SelectItem key={form.id} value={form.id}>
                                {form.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Required Steps (Dependencies)</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Select steps that must be completed before this step can proceed. For example, a meeting may require both employee and manager review forms to be completed.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {formData.stages
                          ?.filter((s) => s.id !== currentStep.id) // Exclude current stage from dependencies
                          .map((stage) => {
                            const isSelected = currentStep.requiredStageIds?.includes(stage.id) ?? false
                            return (
                              <div key={stage.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`required-stage-${stage.id}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    const current = currentStep.requiredStageIds || []
                                    setCurrentStep((prev) => ({
                                      ...prev,
                                      requiredStageIds: checked
                                        ? [...current, stage.id]
                                        : current.filter((id) => id !== stage.id),
                                    }))
                                  }}
                                />
                                <Label
                                  htmlFor={`required-stage-${stage.id}`}
                                  className="cursor-pointer text-sm"
                                >
                                  {stage.name}
                                </Label>
                              </div>
                            )
                          })}
                        {(!formData.stages || formData.stages.length === 0 || formData.stages.length === 1) && (
                          <p className="text-xs text-muted-foreground italic">
                            Add more steps to set dependencies
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="required-step"
                        checked={currentStep.required}
                        onCheckedChange={(checked) =>
                          setCurrentStep((prev) => ({ ...prev, required: checked === true }))
                        }
                      />
                      <Label htmlFor="required-step" className="cursor-pointer">
                        Required step
                      </Label>
                    </div>

                    {/* Reminder Settings for Step */}
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="font-medium text-sm">Reminder Settings</h4>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="reminder-enabled"
                          checked={currentStep.reminderSettings?.enabled ?? true}
                          onCheckedChange={(checked) =>
                            setCurrentStep((prev) => ({
                              ...prev,
                              reminderSettings: {
                                ...prev.reminderSettings,
                                enabled: checked === true,
                                reminderDays: prev.reminderSettings?.reminderDays || 7,
                                channels: prev.reminderSettings?.channels || ["email", "in-app"],
                              },
                            }))
                          }
                        />
                        <Label htmlFor="reminder-enabled" className="cursor-pointer">
                          Enable reminders for this step
                        </Label>
                      </div>
                      {currentStep.reminderSettings?.enabled && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Reminder Days Before Due Date</Label>
                              <Input
                                type="number"
                                min={1}
                                value={currentStep.reminderSettings?.reminderDays || 7}
                                onChange={(e) =>
                                  setCurrentStep((prev) => ({
                                    ...prev,
                                    reminderSettings: {
                                      ...prev.reminderSettings!,
                                      reminderDays: Number.parseInt(e.target.value, 10) || 7,
                                    },
                                  }))
                                }
                                placeholder="e.g., 7"
                                className="w-full"
                              />
                              <p className="text-xs text-muted-foreground">
                                Send reminder X days before this step is due
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Notification Channels</Label>
                              <div className="flex gap-4">
                                {(["email", "in-app", "sms"] as const).map((channel) => (
                                  <div key={channel} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`step-channel-${channel}`}
                                      checked={currentStep.reminderSettings?.channels?.includes(channel) ?? false}
                                      onCheckedChange={(checked) => {
                                        const channels = currentStep.reminderSettings?.channels || []
                                        setCurrentStep((prev) => ({
                                          ...prev,
                                          reminderSettings: {
                                            ...prev.reminderSettings!,
                                            channels: checked
                                              ? [...channels, channel]
                                              : channels.filter((c) => c !== channel),
                                          },
                                        }))
                                      }}
                                    />
                                    <Label htmlFor={`step-channel-${channel}`} className="cursor-pointer capitalize">
                                      {channel}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <Button type="button" onClick={addStep} className="w-full">
                      <IconPlus className="size-4 mr-2" />
                      Add Step
                    </Button>
                  </div>

                  {/* Review Stages List */}
                  {formData.stages && formData.stages.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-base">Review Steps</h4>
                        <Badge variant="secondary" className="text-xs">
                          {formData.stages.length} {formData.stages.length === 1 ? "step" : "steps"}
                        </Badge>
                      </div>
                      
                      {/* Vertical Stages Progress Layout */}
                      <div className="relative">
                        {/* Vertical connecting line */}
                        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
                        
                        <div className="space-y-6">
                          {formData.stages
                            .sort((a, b) => a.order - b.order)
                            .map((step) => {
                            // Get step type label for display
                            const getStepTypeLabel = (type: string) => {
                              switch (type) {
                                case "evaluation":
                                  return "Review"
                                case "meeting":
                                  return "Meeting"
                                case "review":
                                  return "Review"
                                case "approval":
                                  return "Approval"
                                default:
                                  return type
                              }
                            }
                            // Get step type icon
                            const getStepTypeIcon = () => {
                              switch (step.type) {
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

                            // Get step type color
                            const getStepTypeColor = () => {
                              switch (step.type) {
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

                            // Format due date text
                            const getDueDateText = () => {
                              if (!step.dueDateType) return null
                              if (step.dueDateType === "before_interval" && step.dueDateOffset) {
                                return `${step.dueDateOffset} week${step.dueDateOffset > 1 ? "s" : ""} before`
                              }
                              if (step.dueDateType === "on_interval") {
                                return "On appraisal date"
                              }
                              if (step.dueDateType === "after_interval" && step.dueDateOffset) {
                                return `${step.dueDateOffset} week${step.dueDateOffset > 1 ? "s" : ""} after`
                              }
                              if (step.dueDateType === "custom" && step.dueDateOffset && step.dueDateUnit) {
                                return `${Math.abs(step.dueDateOffset)} ${step.dueDateUnit} ${step.dueDateOffset < 0 ? "before" : "after"}`
                              }
                              return "Not set"
                            }

                              return (
                                <div key={step.id} className="relative flex items-center gap-6">
                                  {/* Step Circle - Left Side */}
                                  <div className="relative shrink-0 z-10">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground border-2 border-primary shadow-sm">
                                      {step.order}
                                    </div>
                                  </div>

                                  {/* Step Card - Right Side */}
                                  <Card className="flex-1 border-2 hover:border-primary/50 transition-colors">
                                    <CardContent className="p-4">
                                      <div className="space-y-3">
                                        {/* Step Content */}
                                        <div className="space-y-3">
                                      {/* Header Row */}
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h5 className="font-semibold text-base">{step.name}</h5>
                                            <Badge
                                              variant="outline"
                                              className={`${getStepTypeColor()} flex items-center gap-1.5 capitalize`}
                                            >
                                              {getStepTypeIcon()}
                                              {getStepTypeLabel(step.type)}
                                            </Badge>
                                            {step.required && (
                                              <Badge variant="destructive" className="text-xs">
                                                Required
                                              </Badge>
                                            )}
                                          </div>
                                          {step.description && (
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                              {step.description}
                                            </p>
                                          )}
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeStep(step.id)}
                                          className="shrink-0 text-muted-foreground hover:text-destructive"
                                        >
                                          <IconX className="size-4" />
                                        </Button>
                                      </div>

                                      {/* Details Grid */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                                        {/* Attendees */}
                                        <div className="flex items-start gap-2">
                                          <IconUsers className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                              Attendees
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                              {step.attendees && step.attendees.length > 0 ? (
                                                step.attendees.map((person) => {
                                                  if (person === "employee") {
                                                    return (
                                                      <Badge
                                                        key={person}
                                                        variant="outline"
                                                        className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                                      >
                                                        Employee
                                                      </Badge>
                                                    )
                                                  }
                                                  const levelMatch = person.match(/manager_level_(\d+)/)
                                                  if (levelMatch) {
                                                    const level = levelMatch[1]
                                                    return (
                                                      <Badge
                                                        key={person}
                                                        variant="outline"
                                                        className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                                                      >
                                                        Manager L{level}
                                                      </Badge>
                                                    )
                                                  }
                                                  return null
                                                })
                                              ) : step.managerLevel ? (
                                                <Badge
                                                  variant="outline"
                                                  className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                                                >
                                                  Manager L{step.managerLevel}
                                                </Badge>
                                              ) : (
                                                <span className="text-xs text-muted-foreground">
                                                  Not specified
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Due Date */}
                                        <div className="flex items-start gap-2">
                                          <IconClock className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                              Due Date
                                            </p>
                                            <p className="text-sm font-medium">
                                              {getDueDateText() || "Not set"}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Reminder Settings */}
                                        {step.reminderSettings && (
                                          <div className="flex items-start gap-2 md:col-span-2">
                                            <IconBell className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                                Reminders
                                              </p>
                                              <div className="flex items-center gap-3 flex-wrap">
                                                {step.reminderSettings.enabled ? (
                                                  <>
                                                    <span className="text-sm">
                                                      {step.reminderSettings.reminderDays} day
                                                      {step.reminderSettings.reminderDays !== 1 ? "s" : ""}{" "}
                                                      before due date
                                                    </span>
                                                    {step.reminderSettings.channels &&
                                                      step.reminderSettings.channels.length > 0 && (
                                                        <div className="flex gap-1.5">
                                                          {step.reminderSettings.channels.map((channel) => (
                                                            <Badge
                                                              key={channel}
                                                              variant="outline"
                                                              className="text-xs capitalize"
                                                            >
                                                              {channel}
                                                            </Badge>
                                                          ))}
                                                        </div>
                                                      )}
                                                  </>
                                                ) : (
                                                  <span className="text-sm text-muted-foreground">
                                                    Reminders disabled
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is-active"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, isActive: checked === true }))
                      }
                    />
                    <Label htmlFor="is-active" className="cursor-pointer">
                      Active (review cycle can be assigned to employees)
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <SheetFooter>
                <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTemplateId ? "Update Review Cycle Template" : "Create Review Cycle Template"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Search and Filters */}
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search review cycle templates..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Review Cycle Templates Table */}
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
                    onClick={(e) => {
                      // Don't open view sheet if clicking on action buttons
                      const target = e.target as HTMLElement
                      if (
                        target.closest("button") ||
                        target.closest("[role='button']") ||
                        target.closest(".flex.items-center.gap-2")
                      ) {
                        return
                      }
                      setSelectedTemplateForView(row.original)
                      setViewSheetOpen(true)
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
                    No review cycle templates found. Create your first review cycle template to get started.
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
              filteredTemplates.length
            )}{" "}
            of {filteredTemplates.length} review cycle templates
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

      {/* View Review Stages Sheet */}
      <Sheet open={viewSheetOpen} onOpenChange={setViewSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-4">
          <SheetHeader>
            <SheetTitle>
              {selectedTemplateForView?.name || "Review Steps"}
            </SheetTitle>
            <SheetDescription>
              {selectedTemplateForView?.description || "View all review steps in this review cycle"}
            </SheetDescription>
          </SheetHeader>

          {selectedTemplateForView && (
            <div className="space-y-4">
              {/* Review Cycle Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Appraisal Frequency</p>
                  <p className="text-sm font-medium">
                    {frequencyOptions.find((opt) => opt.value === selectedTemplateForView.interval.type)?.label || selectedTemplateForView.interval.type}
                    {selectedTemplateForView.interval.type === "custom" && selectedTemplateForView.interval.value && selectedTemplateForView.interval.unit
                      ? ` (Every ${selectedTemplateForView.interval.value} ${selectedTemplateForView.interval.unit})`
                      : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                  <Badge variant={selectedTemplateForView.isActive ? "default" : "outline"}>
                    {selectedTemplateForView.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              {/* Steps List */}
              {selectedTemplateForView.stages && selectedTemplateForView.stages.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-base">Review Steps</h4>
                    <Badge variant="secondary" className="text-xs">
                      {selectedTemplateForView.stages.length} {selectedTemplateForView.stages.length === 1 ? "step" : "steps"}
                    </Badge>
                  </div>
                  
                  {/* Vertical Steps Progress Layout */}
                  <div className="relative">
                    {/* Vertical connecting line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
                    
                    <div className="space-y-6">
                      {selectedTemplateForView.stages
                        .sort((a, b) => a.order - b.order)
                        .map((step) => {
                        // Get step type label for display
                        const getStepTypeLabel = (type: string) => {
                          switch (type) {
                            case "evaluation":
                              return "Review"
                            case "meeting":
                              return "Meeting"
                            case "review":
                              return "Review"
                            case "approval":
                              return "Approval"
                            default:
                              return type
                          }
                        }
                        // Get step type icon
                        const getStepTypeIcon = () => {
                          switch (step.type) {
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

                        // Get step type color
                        const getStepTypeColor = () => {
                          switch (step.type) {
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

                        // Format due date text
                        const getDueDateText = () => {
                          if (!step.dueDateType) return null
                          if (step.dueDateType === "before_interval" && step.dueDateOffset) {
                            return `${step.dueDateOffset} week${step.dueDateOffset > 1 ? "s" : ""} before`
                          }
                          if (step.dueDateType === "on_interval") {
                            return "On appraisal date"
                          }
                          if (step.dueDateType === "after_interval" && step.dueDateOffset) {
                            return `${step.dueDateOffset} week${step.dueDateOffset > 1 ? "s" : ""} after`
                          }
                          if (step.dueDateType === "custom" && step.dueDateOffset && step.dueDateUnit) {
                            return `${Math.abs(step.dueDateOffset)} ${step.dueDateUnit} ${step.dueDateOffset < 0 ? "before" : "after"}`
                          }
                          return "Not set"
                        }

                          return (
                            <div key={step.id} className="relative flex items-center gap-6">
                              {/* Step Circle - Left Side */}
                              <div className="relative shrink-0 z-10">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground border-2 border-primary shadow-sm">
                                  {step.order}
                                </div>
                              </div>

                              {/* Step Card - Right Side */}
                              <Card className="flex-1 border-2 hover:border-primary/50 transition-colors">
                                <CardContent className="p-4">
                                  <div className="space-y-3">
                                    {/* Step Content */}
                                    <div className="space-y-3">
                                  {/* Header Row */}
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h5 className="font-semibold text-base">{step.name}</h5>
                                        <Badge
                                          variant="outline"
                                          className={`${getStepTypeColor()} flex items-center gap-1.5 capitalize`}
                                        >
                                          {getStepTypeIcon()}
                                          {getStepTypeLabel(step.type)}
                                        </Badge>
                                        {step.required && (
                                          <Badge variant="destructive" className="text-xs">
                                            Required
                                          </Badge>
                                        )}
                                      </div>
                                      {step.description && (
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                          {step.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Details Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                                    {/* Attendees */}
                                    <div className="flex items-start gap-2">
                                      <IconUsers className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-muted-foreground mb-1">
                                          Attendees
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {step.attendees && step.attendees.length > 0 ? (
                                            step.attendees.map((person) => {
                                              if (person === "employee") {
                                                return (
                                                  <Badge
                                                    key={person}
                                                    variant="outline"
                                                    className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                                  >
                                                    Employee
                                                  </Badge>
                                                )
                                              }
                                              const levelMatch = person.match(/manager_level_(\d+)/)
                                              if (levelMatch) {
                                                const level = levelMatch[1]
                                                return (
                                                  <Badge
                                                    key={person}
                                                    variant="outline"
                                                    className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                                                  >
                                                    Manager L{level}
                                                  </Badge>
                                                )
                                              }
                                              return null
                                            })
                                          ) : step.managerLevel ? (
                                            <Badge
                                              variant="outline"
                                              className="text-xs bg-orange-50 text-orange-700 border-orange-200"
                                            >
                                              Manager L{step.managerLevel}
                                            </Badge>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">
                                              Not specified
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Due Date */}
                                    <div className="flex items-start gap-2">
                                      <IconClock className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-muted-foreground mb-1">
                                          Due Date
                                        </p>
                                        <p className="text-sm font-medium">
                                          {getDueDateText() || "Not set"}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Reminder Settings */}
                                    {step.reminderSettings && (
                                      <div className="flex items-start gap-2 md:col-span-2">
                                        <IconBell className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-muted-foreground mb-1">
                                            Reminders
                                          </p>
                                          <div className="flex items-center gap-3 flex-wrap">
                                            {step.reminderSettings.enabled ? (
                                              <>
                                                <span className="text-sm">
                                                  {step.reminderSettings.reminderDays} day
                                                  {step.reminderSettings.reminderDays !== 1 ? "s" : ""}{" "}
                                                  before due date
                                                </span>
                                                {step.reminderSettings.channels &&
                                                  step.reminderSettings.channels.length > 0 && (
                                                    <div className="flex gap-1.5">
                                                      {step.reminderSettings.channels.map((channel) => (
                                                        <Badge
                                                          key={channel}
                                                          variant="outline"
                                                          className="text-xs capitalize"
                                                        >
                                                          {channel}
                                                        </Badge>
                                                      ))}
                                                    </div>
                                                  )}
                                              </>
                                            ) : (
                                              <span className="text-sm text-muted-foreground">
                                                Reminders disabled
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No steps defined for this review cycle.
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the review cycle
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTemplateToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
