"use client"

import * as React from "react"
import { IconPlus, IconSearch, IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight, IconCalendar, IconX, IconEdit, IconCheck } from "@tabler/icons-react"
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
import { format } from "date-fns"
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Checkbox } from "@/components/ui/checkbox"
import { demoEmployees } from "@/lib/data/demo-employees"
import { workflowTemplates, initializeWorkflowData } from "@/lib/workflow-data"
import type { WorkflowTemplate } from "@/lib/types"

// Manager type with level hierarchy
type ManagerLevel = {
  level: number
  employeeId?: string // For existing employees
  externalName?: string // For external managers
  externalEmail?: string // For external managers
  isExternal?: boolean // Flag to indicate if it's an external manager
  isEvaluationResponsible?: boolean // Flag to indicate if this manager is responsible for evaluation
}

// Employee type definition
type Employee = {
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

// Use demo employee data
const initialEmployees: Employee[] = demoEmployees

// Table columns definition
export default function EmployeesPage() {
  const [employees, setEmployees] = React.useState<Employee[]>(initialEmployees)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [editingEmployeeId, setEditingEmployeeId] = React.useState<string | null>(null)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [departmentFilter, setDepartmentFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [hireDateFrom, setHireDateFrom] = React.useState<Date | undefined>(undefined)
  const [hireDateTo, setHireDateTo] = React.useState<Date | undefined>(undefined)

  // Form state
  const [formData, setFormData] = React.useState<Partial<Employee>>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    status: "Active",
    hireDate: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    emergencyContact: "",
    emergencyPhone: "",
    managers: [],
  })
  const [selectedManagers, setSelectedManagers] = React.useState<ManagerLevel[]>([])
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [managerSearchValues, setManagerSearchValues] = React.useState<Record<number, string>>({})
  const [managerSourceType, setManagerSourceType] = React.useState<Record<number, "existing" | "external">>({})
  const [selectedProcedureIds, setSelectedProcedureIds] = React.useState<string[]>([])
  const [availableProcedures, setAvailableProcedures] = React.useState<WorkflowTemplate[]>([])
  const [procedureSearchValue, setProcedureSearchValue] = React.useState("")

  // Initialize workflow data and get available procedures
  React.useEffect(() => {
    initializeWorkflowData(employees)
    setAvailableProcedures(workflowTemplates.filter((t) => t.isActive))
  }, [])

  // Filter procedures based on search
  const filteredProcedures = React.useMemo(() => {
    if (!procedureSearchValue) return availableProcedures
    const searchLower = procedureSearchValue.toLowerCase()
    return availableProcedures.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.applicablePositions.some((pos) => pos.toLowerCase().includes(searchLower)) ||
        p.applicableDepartments.some((dept) => dept.toLowerCase().includes(searchLower))
    )
  }, [availableProcedures, procedureSearchValue])

  // Get selected and unselected procedures
  const selectedProcedures = React.useMemo(() => {
    return availableProcedures.filter((p) => selectedProcedureIds.includes(p.id))
  }, [availableProcedures, selectedProcedureIds])

  const unselectedProcedures = React.useMemo(() => {
    return filteredProcedures.filter((p) => !selectedProcedureIds.includes(p.id))
  }, [filteredProcedures, selectedProcedureIds])

  // Get available employees as managers (excluding current employee being edited)
  const availableManagers = React.useMemo(() => {
    return employees
      .filter((emp) => emp.id !== editingEmployeeId)
      .map((emp) => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
      }))
  }, [employees, editingEmployeeId])

  // Get employee name by ID
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId)
    return employee ? `${employee.firstName} ${employee.lastName}` : ""
  }

  // Filter managers based on search for each level
  const getFilteredManagersForLevel = (level: number) => {
    const searchValue = managerSearchValues[level] || ""
    // Get IDs of managers selected at OTHER levels (not the current level) as a Set for O(1) lookup
    const selectedAtOtherLevels = new Set(
      selectedManagers
        .filter((m) => m.level !== level && m.employeeId !== "")
        .map((m) => m.employeeId)
    )
    
    return availableManagers.filter((manager) => {
      const matchesSearch =
        !searchValue ||
        manager.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        manager.email.toLowerCase().includes(searchValue.toLowerCase())
      
      // Exclude managers selected at other levels, but allow the current level's selection
      const isSelectedAtOtherLevel = selectedAtOtherLevels.has(manager.id)
      
      return matchesSearch && !isSelectedAtOtherLevel
    })
  }

  // Filter employees based on search and filters
  const filteredEmployees = React.useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        globalFilter === "" ||
        `${employee.firstName} ${employee.lastName}`
          .toLowerCase()
          .includes(globalFilter.toLowerCase()) ||
        employee.email.toLowerCase().includes(globalFilter.toLowerCase()) ||
        employee.department.toLowerCase().includes(globalFilter.toLowerCase()) ||
        employee.position.toLowerCase().includes(globalFilter.toLowerCase())

      const matchesDepartment =
        departmentFilter === "all" || employee.department === departmentFilter

      const matchesStatus =
        statusFilter === "all" || employee.status === statusFilter

      const matchesHireDate = (() => {
        if (!hireDateFrom && !hireDateTo) return true
        const employeeHireDate = new Date(employee.hireDate)
        if (hireDateFrom && hireDateTo) {
          return employeeHireDate >= hireDateFrom && employeeHireDate <= hireDateTo
        }
        if (hireDateFrom) {
          return employeeHireDate >= hireDateFrom
        }
        if (hireDateTo) {
          return employeeHireDate <= hireDateTo
        }
        return true
      })()

      return matchesSearch && matchesDepartment && matchesStatus && matchesHireDate
    })
  }, [employees, globalFilter, departmentFilter, statusFilter, hireDateFrom, hireDateTo])

  // Handle edit button click
  const handleEdit = React.useCallback((employee: Employee) => {
    setEditingEmployeeId(employee.id)
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      status: employee.status,
      hireDate: employee.hireDate,
      address: employee.address || "",
      city: employee.city || "",
      state: employee.state || "",
      zipCode: employee.zipCode || "",
      emergencyContact: employee.emergencyContact || "",
      emergencyPhone: employee.emergencyPhone || "",
      managers: employee.managers || [],
    })
    const managers = employee.managers || []
    setSelectedManagers(managers)
    // Set manager search values and source types based on existing managers
    const searchValues: Record<number, string> = {}
    const sourceTypes: Record<number, "existing" | "external"> = {}
    managers.forEach((manager) => {
      if (manager.isExternal) {
        sourceTypes[manager.level] = "external"
      } else {
        sourceTypes[manager.level] = "existing"
        const managerEmployee = availableManagers.find((m) => m.id === manager.employeeId)
        if (managerEmployee) {
          searchValues[manager.level] = managerEmployee.name
        }
      }
    })
    setManagerSearchValues(searchValues)
    setManagerSourceType(sourceTypes)
    if (employee.hireDate) {
      setDate(new Date(employee.hireDate))
    } else {
      setDate(new Date())
    }
    // Set selected procedures
    setSelectedProcedureIds(employee.assignedWorkflowIds || [])
    setIsSheetOpen(true)
  }, [availableManagers])

  // Define columns with edit action
  const columns: ColumnDef<Employee>[] = React.useMemo(() => [
    {
      accessorKey: "firstName",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.firstName} {row.original.lastName}
          </div>
          <div className="text-sm text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "department",
      header: "Department",
    },
    {
      accessorKey: "position",
      header: "Position",
    },
    {
      accessorKey: "phone",
      header: "Phone",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status
        const variant = status === "Active" ? "default" : "outline"
        return <Badge variant={variant}>{status}</Badge>
      },
    },
    {
      accessorKey: "hireDate",
      header: "Hire Date",
      cell: ({ row }) => {
        const date = new Date(row.original.hireDate)
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
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
            onClick={() => handleEdit(row.original)}
          >
            <IconEdit className="size-4" />
          </Button>
        )
      },
    },
  ], [handleEdit])

  const table = useReactTable({
    data: filteredEmployees,
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Department to positions mapping
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
      "HR Administrator",
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
      "UX Designer",
      "UI/UX Designer",
      "Graphic Designer",
      "Product Designer",
      "Design Manager",
      "Creative Director",
    ],
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [name]: value }
      // Clear position when department changes
      if (name === "department") {
        updated.position = ""
      }
      return updated
    })
  }

  // Update formData when date changes
  React.useEffect(() => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        hireDate: format(date, "yyyy-MM-dd"),
      }))
    }
  }, [date])

  const addManagerLevel = () => {
    const nextLevel = selectedManagers.length > 0 
      ? Math.max(...selectedManagers.map((m) => m.level)) + 1 
      : 1
    setSelectedManagers((prev) => [...prev, { level: nextLevel, employeeId: "", isExternal: false, isEvaluationResponsible: false }])
    setManagerSourceType((prev) => ({ ...prev, [nextLevel]: "existing" }))
  }

  const removeManagerLevel = (level: number) => {
    setSelectedManagers((prev) => {
      const updated = prev.filter((m) => m.level !== level)
      // Reorder levels to be sequential
      return updated.map((m, index) => ({ ...m, level: index + 1 }))
    })
    // Clear search for this level
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
          ? { ...m, employeeId, isExternal: false, externalName: undefined, externalEmail: undefined, isEvaluationResponsible: existingManager?.isEvaluationResponsible || false } 
          : m
      )
      setFormData((prevForm) => ({
        ...prevForm,
        managers: updated.filter((m) => m.employeeId || m.externalName),
      }))
      // Set the search value to the selected manager's name so it displays correctly
      setManagerSearchValues((prevSearch) => {
        return {
          ...prevSearch,
          [level]: selectedManager.name,
        }
      })
      setManagerSourceType((prev) => ({ ...prev, [level]: "existing" }))
      return updated
    })
  }

  const updateExternalManager = (level: number, name: string, email: string) => {
    setSelectedManagers((prev) => {
      const existingManager = prev.find((m) => m.level === level)
      const updated = prev.map((m) =>
        m.level === level 
          ? { ...m, externalName: name, externalEmail: email, isExternal: true, employeeId: undefined, isEvaluationResponsible: existingManager?.isEvaluationResponsible || false } 
          : m
      )
      setFormData((prevForm) => ({
        ...prevForm,
        managers: updated.filter((m) => m.employeeId || m.externalName),
      }))
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
      setFormData((prevForm) => ({
        ...prevForm,
        managers: updated.filter((m) => m.employeeId || m.externalName),
      }))
      setManagerSearchValues((prev) => {
        const updated = { ...prev }
        updated[level] = ""
        return updated
      })
      return updated
    })
  }

  const toggleEvaluationResponsible = (level: number) => {
    setSelectedManagers((prev) => {
      const updated = prev.map((m) =>
        m.level === level 
          ? { ...m, isEvaluationResponsible: !m.isEvaluationResponsible } 
          : m
      )
      setFormData((prevForm) => ({
        ...prevForm,
        managers: updated.filter((m) => m.employeeId || m.externalName),
      }))
      return updated
    })
  }

  // Reset form when sheet closes
  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open)
    if (!open) {
      // Reset form when closing
      setEditingEmployeeId(null)
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        department: "",
        position: "",
        status: "Active",
        hireDate: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        emergencyContact: "",
        emergencyPhone: "",
        managers: [],
      })
      setSelectedManagers([])
      setManagerSearchValues({})
      setManagerSourceType({})
      setDate(new Date())
      setSelectedProcedureIds([])
      setProcedureSearchValue("")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingEmployeeId) {
      // Update existing employee
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === editingEmployeeId
            ? {
                ...emp,
                firstName: formData.firstName || "",
                lastName: formData.lastName || "",
                email: formData.email || "",
                phone: formData.phone || "",
                department: formData.department || "",
                position: formData.position || "",
                status: (formData.status as Employee["status"]) || "Active",
                hireDate: formData.hireDate || "",
                address: formData.address || "",
                city: formData.city || "",
                state: formData.state || "",
                zipCode: formData.zipCode || "",
                emergencyContact: formData.emergencyContact || "",
                emergencyPhone: formData.emergencyPhone || "",
                managers: selectedManagers.filter((m) => m.employeeId !== "" || m.isExternal).length > 0 
                  ? selectedManagers.filter((m) => m.employeeId !== "" || m.isExternal) 
                  : undefined,
                assignedWorkflowIds: selectedProcedureIds.length > 0 ? selectedProcedureIds : undefined,
              }
            : emp
        )
      )
      toast.success("Employee updated successfully!")
    } else {
      // Add new employee
      const newEmployee: Employee = {
        id: (employees.length + 1).toString(),
        firstName: formData.firstName || "",
        lastName: formData.lastName || "",
        email: formData.email || "",
        phone: formData.phone || "",
        department: formData.department || "",
        position: formData.position || "",
        status: (formData.status as Employee["status"]) || "Active",
        hireDate: formData.hireDate || "",
        address: formData.address || "",
        city: formData.city || "",
        state: formData.state || "",
        zipCode: formData.zipCode || "",
        emergencyContact: formData.emergencyContact || "",
        emergencyPhone: formData.emergencyPhone || "",
        managers: selectedManagers.filter((m) => m.employeeId !== "" || m.isExternal).length > 0 
          ? selectedManagers.filter((m) => m.employeeId !== "" || m.isExternal) 
          : undefined,
        assignedWorkflowIds: selectedProcedureIds.length > 0 ? selectedProcedureIds : undefined,
      }

      setEmployees((prev) => [...prev, newEmployee])
      toast.success("Employee added successfully!")
    }
    
    setIsSheetOpen(false)
    setEditingEmployeeId(null)
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      department: "",
      position: "",
      status: "Active",
      hireDate: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      emergencyContact: "",
      emergencyPhone: "",
      managers: [],
    })
    setSelectedManagers([])
    setManagerSearchValues({})
    setManagerSourceType({})
    setDate(new Date())
  }

  // Get unique departments for filter
  const departments = React.useMemo(() => {
    const depts = new Set(employees.map((emp) => emp.department))
    return Array.from(depts).sort((a, b) => a.localeCompare(b))
  }, [employees])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-4 md:py-4">
      {/* Title Section with Add Button */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-2xl font-semibold">Employees</h2>
          <p className="text-muted-foreground mt-2">
            Manage your employees and their information here.
          </p>
        </div>
        <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
          <SheetTrigger asChild>
            <Button onClick={() => {
              setEditingEmployeeId(null)
              setFormData({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                department: "",
                position: "",
                status: "Active",
                hireDate: "",
                address: "",
                city: "",
                state: "",
                zipCode: "",
                emergencyContact: "",
                emergencyPhone: "",
                managers: [],
              })
              setSelectedManagers([])
              setManagerSearchValues({})
              setManagerSourceType({})
              setDate(new Date())
            }}>
              <IconPlus className="size-4" />
              Add New Employee
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full! max-w-full! md:w-[70vw]! md:max-w-[70vw]! lg:w-[50vw]! lg:max-w-[50vw]! overflow-y-auto px-8 py-4">
            <SheetHeader>
              <SheetTitle>
                {editingEmployeeId ? "Edit Employee" : "Add New Employee"}
              </SheetTitle>
              <SheetDescription>
                Fill in the employee details below. All fields marked with * are
                required.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Basic personal details of the employee
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">
                        First Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">
                        Last Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full"
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Employment Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Employment Information</CardTitle>
                  <CardDescription>
                    Job-related details and employment status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">
                        Department <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.department}
                        onValueChange={(value) =>
                          handleSelectChange("department", value)
                        }
                      >
                        <SelectTrigger id="department" className="w-full">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Engineering">Engineering</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="Operations">Operations</SelectItem>
                          <SelectItem value="Design">Design</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">
                        Position <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.position || undefined}
                        onValueChange={(value) =>
                          handleSelectChange("position", value)
                        }
                        disabled={!formData.department}
                      >
                        <SelectTrigger id="position" className="w-full">
                          <SelectValue 
                            placeholder={
                              formData.department 
                                ? formData.position || "Select position"
                                : "Select department first"
                            } 
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.department &&
                            (() => {
                              const positions = departmentPositions[formData.department] || []
                              // Include current position if it's not in the list (for editing existing employees)
                              const allPositions = formData.position && !positions.includes(formData.position)
                                ? [formData.position, ...positions]
                                : positions
                              return allPositions.map((position) => (
                                <SelectItem key={position} value={position}>
                                  {position}
                                </SelectItem>
                              ))
                            })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">
                        Status <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          handleSelectChange("status", value)
                        }
                      >
                        <SelectTrigger id="status" className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hireDate">
                        Hire Date <span className="text-destructive">*</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            type="button"
                          >
                            <IconCalendar className="mr-2 size-4" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-lg border"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Managers (Optional)</Label>
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
                                      // Clear current selection when switching types
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
                                        
                                        // If value is cleared and there was a selected employee, remove it
                                        if (!value && selectedEmployee) {
                                          removeManagerFromLevel(managerLevel.level)
                                        }
                                      }}
                                      onValueChange={(value) => {
                                        // Check if the value matches a manager name (selection happened)
                                        if (value) {
                                          const selectedManager = availableManagers.find(
                                            (m) => m.name === value
                                          )
                                          
                                          if (selectedManager) {
                                            // Only update if it's a different selection
                                            if (selectedEmployee?.id !== selectedManager.id) {
                                              selectManagerForLevel(managerLevel.level, selectedManager.id)
                                            }
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
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3 flex-1">
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
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">
                                                  {selectedEmployee.name}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                  <Checkbox
                                                    id={`eval-responsible-${managerLevel.level}`}
                                                    checked={managerLevel.isEvaluationResponsible || false}
                                                    onCheckedChange={() => toggleEvaluationResponsible(managerLevel.level)}
                                                  />
                                                  <Label 
                                                    htmlFor={`eval-responsible-${managerLevel.level}`}
                                                    className="text-xs text-muted-foreground cursor-pointer"
                                                  >
                                                    Evaluation Responsible
                                                  </Label>
                                                </div>
                                              </div>
                                              <span className="text-xs text-muted-foreground">
                                                {selectedEmployee.email}
                                              </span>
                                            </div>
                                          </div>
                                          <Badge 
                                            variant={managerLevel.level === 1 ? "default" : "secondary"}
                                            className="text-xs"
                                          >
                                            Level {managerLevel.level}
                                            {managerLevel.level === 1 && " (Primary)"}
                                          </Badge>
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
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3 flex-1">
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
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">
                                                  {managerLevel.externalName || "External Manager"}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                  <Checkbox
                                                    id={`eval-responsible-external-${managerLevel.level}`}
                                                    checked={managerLevel.isEvaluationResponsible || false}
                                                    onCheckedChange={() => toggleEvaluationResponsible(managerLevel.level)}
                                                  />
                                                  <Label 
                                                    htmlFor={`eval-responsible-external-${managerLevel.level}`}
                                                    className="text-xs text-muted-foreground cursor-pointer"
                                                  >
                                                    Evaluation Responsible
                                                  </Label>
                                                </div>
                                              </div>
                                              <span className="text-xs text-muted-foreground">
                                                {managerLevel.externalEmail || "No email"}
                                              </span>
                                            </div>
                                          </div>
                                          <Badge 
                                            variant={managerLevel.level === 1 ? "default" : "secondary"}
                                            className="text-xs"
                                          >
                                            Level {managerLevel.level}
                                            {managerLevel.level === 1 && " (Primary)"}
                                          </Badge>
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

              {/* Address Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Address Information</CardTitle>
                  <CardDescription>Employee&apos;s residential address</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">Zip Code</Label>
                      <Input
                        id="zipCode"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        className="w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                  <CardDescription>
                    Contact information for emergencies
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact">Contact Name</Label>
                      <Input
                        id="emergencyContact"
                        name="emergencyContact"
                        value={formData.emergencyContact}
                        onChange={handleInputChange}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Contact Phone</Label>
                      <Input
                        id="emergencyPhone"
                        name="emergencyPhone"
                        type="tel"
                        value={formData.emergencyPhone}
                        onChange={handleInputChange}
                        className="w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assigned Review Cycles */}
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Review Cycles</CardTitle>
                  <CardDescription>
                    Select one or more review cycles to assign to this employee
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Selected Review Cycles */}
                  {selectedProcedures.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Selected Review Cycles ({selectedProcedures.length})</Label>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 bg-muted/30">
                        {selectedProcedures.map((procedure) => (
                          <div
                            key={procedure.id}
                            className="flex items-start gap-3 p-2 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                          >
                            <Checkbox
                              id={`selected-procedure-${procedure.id}`}
                              checked={true}
                              onCheckedChange={() => {
                                setSelectedProcedureIds((prev) =>
                                  prev.filter((id) => id !== procedure.id)
                                )
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor={`selected-procedure-${procedure.id}`}
                                  className="font-medium cursor-pointer"
                                >
                                  {procedure.name}
                                </Label>
                                <IconCheck className="size-4 text-green-600" />
                              </div>
                              {procedure.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                  {procedure.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {procedure.stages.length} {procedure.stages.length === 1 ? "step" : "steps"}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {procedure.interval.type === "quarterly"
                                    ? "Quarterly"
                                    : procedure.interval.type === "monthly"
                                    ? "Monthly"
                                    : procedure.interval.type === "annually"
                                    ? "Annually"
                                    : procedure.interval.type === "biannually"
                                    ? "Bi-annually"
                                    : procedure.interval.type === "biweekly"
                                    ? "Bi-weekly"
                                    : procedure.interval.type === "weekly"
                                    ? "Weekly"
                                    : procedure.interval.type === "daily"
                                    ? "Daily"
                                    : "Custom"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search Input */}
                  {availableProcedures.length > 0 && (
                    <div className="relative">
                      <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        placeholder="Search review cycles..."
                        value={procedureSearchValue}
                        onChange={(e) => setProcedureSearchValue(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  )}

                  {/* Available Review Cycles */}
                  {unselectedProcedures.length > 0 ? (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
                        Available Review Cycles {selectedProcedures.length > 0 && `(${unselectedProcedures.length})`}
                      </Label>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {unselectedProcedures.map((procedure) => (
                          <div
                            key={procedure.id}
                            className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <Checkbox
                              id={`procedure-${procedure.id}`}
                              checked={false}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedProcedureIds((prev) => [...prev, procedure.id])
                                }
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <Label
                                htmlFor={`procedure-${procedure.id}`}
                                className="font-medium cursor-pointer"
                              >
                                {procedure.name}
                              </Label>
                              {procedure.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {procedure.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {procedure.stages.length} {procedure.stages.length === 1 ? "step" : "steps"}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {procedure.interval.type === "quarterly"
                                    ? "Quarterly"
                                    : procedure.interval.type === "monthly"
                                    ? "Monthly"
                                    : procedure.interval.type === "annually"
                                    ? "Annually"
                                    : procedure.interval.type === "biannually"
                                    ? "Bi-annually"
                                    : procedure.interval.type === "biweekly"
                                    ? "Bi-weekly"
                                    : procedure.interval.type === "weekly"
                                    ? "Weekly"
                                    : procedure.interval.type === "daily"
                                    ? "Daily"
                                    : "Custom"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : availableProcedures.length > 0 && procedureSearchValue ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No review cycles found matching &quot;{procedureSearchValue}&quot;</p>
                    </div>
                  ) : availableProcedures.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No active review cycles available. Create review cycles first.</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <SheetFooter>
                <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingEmployeeId ? "Update Employee" : "Add Employee"}</Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Search and Filters Section */}
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground hidden sm:inline">Hire Date:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[160px] sm:w-[180px] justify-start text-left font-normal"
                >
                  <IconCalendar className="mr-2 h-4 w-4" />
                  {hireDateFrom ? format(hireDateFrom, "MMM dd, yyyy") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={hireDateFrom}
                  onSelect={setHireDateFrom}
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
                  {hireDateTo ? format(hireDateTo, "MMM dd, yyyy") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={hireDateTo}
                  onSelect={setHireDateTo}
                />
              </PopoverContent>
            </Popover>
            {(hireDateFrom || hireDateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setHireDateFrom(undefined)
                  setHireDateTo(undefined)
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Employees Table */}
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
                    No employees found.
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
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              filteredEmployees.length
            )}{" "}
            of {filteredEmployees.length} employees
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
