// "use client"

// import * as React from "react"
// import {
//   IconPlus,
//   IconSearch,
//   IconChevronLeft,
//   IconChevronRight,
//   IconChevronsLeft,
//   IconChevronsRight,
//   IconCalendar,
//   IconX,
// } from "@tabler/icons-react"
// import {
//   flexRender,
//   getCoreRowModel,
//   getFilteredRowModel,
//   getPaginationRowModel,
//   getSortedRowModel,
//   useReactTable,
//   type ColumnDef,
//   type ColumnFiltersState,
//   type SortingState,
// } from "@tanstack/react-table"
// import { toast } from "sonner"
// import { format, addDays } from "date-fns"

// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"
// import {
//   Sheet,
//   SheetContent,
//   SheetDescription,
//   SheetFooter,
//   SheetHeader,
//   SheetTitle,
//   SheetTrigger,
// } from "@/components/ui/sheet"
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table"
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { Calendar } from "@/components/ui/calendar"
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover"
// import {
//   type WorkflowAssignment,
//   type WorkflowTemplate,
//   type WorkflowMeeting,
//   type Employee,
// } from "@/lib/types"
// import {
//   workflowTemplates,
//   workflowAssignments,
//   initializeWorkflowData,
//   getWorkflowTemplate,
//   getEmployee,
// } from "@/lib/workflow-data"

// // Sample employees (in real app, fetch from API)
// const sampleEmployees: Employee[] = [
//   {
//     id: "1",
//     firstName: "John",
//     lastName: "Doe",
//     email: "john.doe@company.com",
//     phone: "(555) 123-4567",
//     department: "Engineering",
//     position: "Software Engineer",
//     status: "Active",
//     hireDate: "2020-01-15",
//     address: "123 Main St",
//     city: "San Francisco",
//     state: "CA",
//     zipCode: "94102",
//     emergencyContact: "Jane Doe",
//     emergencyPhone: "(555) 123-4568",
//   },
//   {
//     id: "2",
//     firstName: "Jane",
//     lastName: "Smith",
//     email: "jane.smith@company.com",
//     phone: "(555) 234-5678",
//     department: "Marketing",
//     position: "Marketing Manager",
//     status: "Active",
//     hireDate: "2019-03-20",
//     address: "456 Oak Ave",
//     city: "Los Angeles",
//     state: "CA",
//     zipCode: "90001",
//     emergencyContact: "Bob Smith",
//     emergencyPhone: "(555) 234-5679",
//   },
//   {
//     id: "5",
//     firstName: "David",
//     lastName: "Wilson",
//     email: "david.wilson@company.com",
//     phone: "(555) 567-8901",
//     department: "Engineering",
//     position: "Senior Software Engineer",
//     status: "Active",
//     hireDate: "2022-02-14",
//     address: "654 Maple Dr",
//     city: "Seattle",
//     state: "WA",
//     zipCode: "98101",
//     emergencyContact: "Lisa Wilson",
//     emergencyPhone: "(555) 567-8902",
//   },
// ]

// export default function ProcedureAssignPage() {
//   const [assignments, setAssignments] = React.useState<WorkflowAssignment[]>([])
//   const [employees] = React.useState<Employee[]>(sampleEmployees)
//   const [templates, setTemplates] = React.useState<WorkflowTemplate[]>([])
//   const [isSheetOpen, setIsSheetOpen] = React.useState(false)
//   const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
//   const [sorting, setSorting] = React.useState<SortingState>([])
//   const [globalFilter, setGlobalFilter] = React.useState("")
//   const [statusFilter, setStatusFilter] = React.useState<string>("all")

//   // Assignment form state
//   const [selectedProcedureId, setSelectedProcedureId] = React.useState<string>("")
//   const [selectedEmployeeIds, setSelectedEmployeeIds] = React.useState<string[]>([])
//   const [startDate, setStartDate] = React.useState<Date>(new Date())

//   // Initialize data
//   React.useEffect(() => {
//     initializeWorkflowData(employees)
//     setTemplates(workflowTemplates.filter((t) => t.isActive))
//     setAssignments(workflowAssignments)
//   }, [employees])

//   // Get available procedures for selected employee
//   const getAvailableProcedures = (employeeId: string): WorkflowTemplate[] => {
//     const employee = employees.find((e) => e.id === employeeId)
//     if (!employee) return []

//     return templates.filter((template) => {
//       const matchesPosition =
//         template.applicablePositions.length === 0 ||
//         template.applicablePositions.includes(employee.position)
//       const matchesDepartment =
//         template.applicableDepartments.length === 0 ||
//         template.applicableDepartments.includes(employee.department)
//       return matchesPosition || matchesDepartment
//     })
//   }

//   // Filter assignments
//   const filteredAssignments = React.useMemo(() => {
//     return assignments.filter((assignment) => {
//       const matchesSearch =
//         globalFilter === "" ||
//         getEmployee(assignment.employeeId)?.firstName.toLowerCase().includes(globalFilter.toLowerCase()) ||
//         getEmployee(assignment.employeeId)?.lastName.toLowerCase().includes(globalFilter.toLowerCase()) ||
//         getWorkflowTemplate(assignment.workflowTemplateId)?.name.toLowerCase().includes(globalFilter.toLowerCase())

//       const matchesStatus = statusFilter === "all" || assignment.status === statusFilter

//       return matchesSearch && matchesStatus
//     })
//   }, [assignments, globalFilter, statusFilter])

//   // Handle assign procedure
//   const handleAssign = () => {
//     if (!selectedProcedureId) {
//       toast.error("Please select a procedure")
//       return
//     }

//     if (selectedEmployeeIds.length === 0) {
//       toast.error("Please select at least one employee")
//       return
//     }

//     const template = getWorkflowTemplate(selectedProcedureId)
//     if (!template) {
//       toast.error("Procedure template not found")
//       return
//     }

//     const newAssignments = selectedEmployeeIds
//       .map((employeeId) => {
//         const employee = getEmployee(employeeId)
//         if (!employee) return null

//         // Calculate end date based on procedure steps
//         // Find the maximum offset from appraisal date
//         let maxOffsetDays = 0
//         template.steps.forEach((step) => {
//           if (step.dueDateType && step.dueDateOffset !== undefined) {
//             let offsetDays = 0
//             if (step.dueDateType === "before_interval") {
//               // Before interval: convert weeks to days (negative)
//               offsetDays = -(step.dueDateOffset * 7)
//             } else if (step.dueDateType === "after_interval") {
//               // After interval: convert weeks to days (positive)
//               offsetDays = step.dueDateOffset * 7
//             } else if (step.dueDateType === "custom" && step.dueDateOffset && step.dueDateUnit) {
//               // Custom: convert based on unit
//               if (step.dueDateUnit === "days") {
//                 offsetDays = step.dueDateOffset
//               } else if (step.dueDateUnit === "weeks") {
//                 offsetDays = step.dueDateOffset * 7
//               } else if (step.dueDateUnit === "months") {
//                 offsetDays = step.dueDateOffset * 30
//               }
//             }
//             // Track the maximum positive offset (furthest date after appraisal)
//             if (offsetDays > maxOffsetDays) {
//               maxOffsetDays = offsetDays
//             }
//           }
//         })
        
//         // Calculate end date: start date + interval period + max offset
//         // For now, use a default interval period (e.g., quarterly = 90 days)
//         const intervalDays = template.interval.type === "quarterly" ? 90
//           : template.interval.type === "monthly" ? 30
//           : template.interval.type === "biweekly" ? 14
//           : template.interval.type === "annually" ? 365
//           : template.interval.type === "biannually" ? 180
//           : template.interval.type === "weekly" ? 7
//           : template.interval.type === "custom" && template.interval.value && template.interval.unit
//           ? template.interval.unit === "days" ? template.interval.value
//           : template.interval.unit === "weeks" ? template.interval.value * 7
//           : template.interval.value * 30
//           : 90 // Default to quarterly
        
//         const endDate = addDays(startDate, intervalDays + maxOffsetDays)

//         return {
//           id: `assignment-${Date.now()}-${employeeId}`,
//           workflowTemplateId: selectedProcedureId,
//           employeeId: employeeId,
//           status: "not_started" as const,
//           startDate: format(startDate, "yyyy-MM-dd"),
//           endDate: format(endDate, "yyyy-MM-dd"),
//           currentStepId: template.steps.length > 0 ? template.steps[0].id : undefined,
//           stepCompletions: {} as Record<string, {
//             completed: boolean
//             completedDate?: string
//             completedBy?: string
//             formData?: Record<string, unknown>
//           }>,
//           meetings: [] as WorkflowMeeting[],
//           createdAt: new Date().toISOString(),
//           updatedAt: new Date().toISOString(),
//         } as WorkflowAssignment
//       })
//       .filter((a): a is WorkflowAssignment => a !== null)

//     setAssignments((prev) => [...prev, ...newAssignments])

//     // Update employee assigned procedure
//     employees.forEach((emp) => {
//       if (selectedEmployeeIds.includes(emp.id)) {
//         emp.assignedWorkflowId = selectedProcedureId
//       }
//     })

//     toast.success(`Procedure assigned to ${newAssignments.length} employee(s)!`)
//     setIsSheetOpen(false)
//     setSelectedProcedureId("")
//     setSelectedEmployeeIds([])
//     setStartDate(new Date())
//   }

//   // Columns
//   const columns: ColumnDef<WorkflowAssignment>[] = React.useMemo(
//     () => [
//       {
//         accessorKey: "employeeId",
//         header: "Employee",
//         cell: ({ row }) => {
//           const employee = getEmployee(row.original.employeeId)
//           return (
//             <div>
//               <div className="font-medium">
//                 {employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"}
//               </div>
//               <div className="text-sm text-muted-foreground">
//                 {employee?.position} - {employee?.department}
//               </div>
//             </div>
//           )
//         },
//       },
//       {
//         accessorKey: "workflowTemplateId",
//         header: "Procedure",
//         cell: ({ row }) => {
//           const template = getWorkflowTemplate(row.original.workflowTemplateId)
//           return (
//             <div>
//               <div className="font-medium">{template?.name || "Unknown"}</div>
//               <div className="text-sm text-muted-foreground">
//                 {template?.steps.length || 0} steps
//               </div>
//             </div>
//           )
//         },
//       },
//       {
//         accessorKey: "status",
//         header: "Status",
//         cell: ({ row }) => {
//           const status = row.original.status
//           const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
//             completed: "default",
//             in_progress: "secondary",
//             not_started: "outline",
//             cancelled: "destructive",
//           }
//           return (
//             <Badge variant={variants[status] || "outline"}>
//               {status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
//             </Badge>
//           )
//         },
//       },
//       {
//         accessorKey: "startDate",
//         header: "Start Date",
//         cell: ({ row }) => format(new Date(row.original.startDate), "MMM dd, yyyy"),
//       },
//       {
//         accessorKey: "endDate",
//         header: "End Date",
//         cell: ({ row }) =>
//           row.original.endDate ? format(new Date(row.original.endDate), "MMM dd, yyyy") : "N/A",
//       },
//       {
//         accessorKey: "currentStepId",
//         header: "Progress",
//         cell: ({ row }) => {
//           const template = getWorkflowTemplate(row.original.workflowTemplateId)
//           if (!template) return "N/A"

//           const completedSteps = Object.keys(row.original.stepCompletions).filter(
//             (stepId) => row.original.stepCompletions[stepId].completed
//           ).length

//           return (
//             <div className="text-sm">
//               {completedSteps} / {template.steps.length} steps completed
//             </div>
//           )
//         },
//       },
//     ],
//     []
//   )

//   const table = useReactTable({
//     data: filteredAssignments,
//     columns,
//     state: {
//       sorting,
//       columnFilters,
//       globalFilter,
//     },
//     onSortingChange: setSorting,
//     onColumnFiltersChange: setColumnFilters,
//     onGlobalFilterChange: setGlobalFilter,
//     getCoreRowModel: getCoreRowModel(),
//     getFilteredRowModel: getFilteredRowModel(),
//     getPaginationRowModel: getPaginationRowModel(),
//     getSortedRowModel: getSortedRowModel(),
//     initialState: {
//       pagination: {
//         pageSize: 10,
//       },
//     },
//   })

//   return (
//     <div className="flex flex-col gap-4 py-4 md:gap-4 md:py-4">
//       {/* Header */}
//       <div className="flex items-center justify-between px-4 lg:px-6">
//         <div>
//           <h2 className="text-2xl font-semibold">Assign Procedures</h2>
//           <p className="text-muted-foreground mt-2">
//             Assign appraisal procedures to employees based on their roles and positions.
//           </p>
//         </div>
//         <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
//           <SheetTrigger asChild>
//             <Button
//               onClick={() => {
//                 setSelectedProcedureId("")
//                 setSelectedEmployeeIds([])
//                 setStartDate(new Date())
//               }}
//             >
//               <IconPlus className="size-4 mr-2" />
//               Assign Workflow
//             </Button>
//           </SheetTrigger>
//           <SheetContent side="right" className="w-full! max-w-full! md:w-[70vw]! md:max-w-[70vw]! lg:w-[50vw]! lg:max-w-[50vw]! overflow-y-auto px-8 py-4">
//             <SheetHeader>
//               <SheetTitle>Assign Procedure to Employees</SheetTitle>
//               <SheetDescription>
//                 Select a procedure and assign it to one or more employees.
//               </SheetDescription>
//             </SheetHeader>
//             <div className="space-y-6 mt-6">
//               {/* Procedure Selection */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Select Procedure</CardTitle>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                   <div className="space-y-2">
//                     <Label>Procedure Template *</Label>
//                     <Select value={selectedProcedureId} onValueChange={setSelectedProcedureId}>
//                       <SelectTrigger className="w-full">
//                         <SelectValue placeholder="Select a procedure" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {templates.map((template) => (
//                           <SelectItem key={template.id} value={template.id}>
//                             <div className="flex flex-col">
//                               <span>{template.name}</span>
//                               <span className="text-xs text-muted-foreground">
//                                 {template.applicablePositions.join(", ") || "All positions"}
//                               </span>
//                             </div>
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                   </div>
//                   {selectedProcedureId && (
//                     <div className="rounded-lg border bg-muted/30 p-4">
//                       <div className="text-sm font-medium mb-2">
//                         {getWorkflowTemplate(selectedProcedureId)?.name}
//                       </div>
//                       <div className="text-sm text-muted-foreground">
//                         {getWorkflowTemplate(selectedProcedureId)?.description}
//                       </div>
//                       <div className="mt-2 flex gap-2">
//                         <Badge variant="secondary">
//                           {getWorkflowTemplate(selectedProcedureId)?.steps.length} steps
//                         </Badge>
//                         <Badge variant="secondary">
//                           {getWorkflowTemplate(selectedProcedureId)?.meetingFrequencies.length} meetings
//                         </Badge>
//                       </div>
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>

//               {/* Employee Selection */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Select Employees</CardTitle>
//                   <CardDescription>
//                     Select employees to assign this procedure to. Only employees matching the procedure criteria are shown.
//                   </CardDescription>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                   <div className="space-y-2">
//                     <Label>Employees *</Label>
//                     <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
//                       {employees.map((employee) => {
//                         const availableProcedures = getAvailableProcedures(employee.id)
//                         const canAssign = availableProcedures.some((w) => w.id === selectedProcedureId)
                        
//                         return (
//                           <div
//                             key={employee.id}
//                             className="flex items-center gap-2 p-2 rounded hover:bg-muted/50"
//                           >
//                             <input
//                               type="checkbox"
//                               id={`emp-${employee.id}`}
//                               checked={selectedEmployeeIds.includes(employee.id)}
//                               onChange={(e) => {
//                                 if (e.target.checked) {
//                                   if (!canAssign && selectedProcedureId) {
//                                     toast.error(
//                                       `Procedure not applicable for ${employee.firstName} ${employee.lastName}`
//                                     )
//                                     return
//                                   }
//                                   setSelectedEmployeeIds((prev) => [...prev, employee.id])
//                                 } else {
//                                   setSelectedEmployeeIds((prev) =>
//                                     prev.filter((id) => id !== employee.id)
//                                   )
//                                 }
//                               }}
//                               disabled={!canAssign && !!selectedProcedureId}
//                               className="size-4"
//                             />
//                             <label
//                               htmlFor={`emp-${employee.id}`}
//                               className={`flex-1 cursor-pointer ${
//                                 !canAssign && selectedProcedureId ? "opacity-50" : ""
//                               }`}
//                             >
//                               <div className="font-medium">
//                                 {employee.firstName} {employee.lastName}
//                               </div>
//                               <div className="text-sm text-muted-foreground">
//                                 {employee.position} - {employee.department}
//                               </div>
//                             </label>
//                             {!canAssign && selectedProcedureId && (
//                               <Badge variant="outline" className="text-xs">
//                                 Not applicable
//                               </Badge>
//                             )}
//                           </div>
//                         )
//                       })}
//                     </div>
//                     {selectedEmployeeIds.length > 0 && (
//                       <div className="flex flex-wrap gap-2 mt-2">
//                         {selectedEmployeeIds.map((empId) => {
//                           const emp = employees.find((e) => e.id === empId)
//                           return (
//                             <Badge key={empId} variant="secondary" className="flex items-center gap-1">
//                               {emp?.firstName} {emp?.lastName}
//                               <IconX
//                                 className="size-3 cursor-pointer"
//                                 onClick={() => {
//                                   setSelectedEmployeeIds((prev) =>
//                                     prev.filter((id) => id !== empId)
//                                   )
//                                 }}
//                               />
//                             </Badge>
//                           )
//                         })}
//                       </div>
//                     )}
//                   </div>
//                 </CardContent>
//               </Card>

//               {/* Start Date */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Start Date</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <Popover>
//                     <PopoverTrigger asChild>
//                       <Button
//                         variant="outline"
//                         className="w-full justify-start text-left font-normal"
//                       >
//                         <IconCalendar className="mr-2 size-4" />
//                         {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
//                       </Button>
//                     </PopoverTrigger>
//                     <PopoverContent className="w-auto p-0" align="start">
//                       <Calendar
//                         mode="single"
//                         selected={startDate}
//                         onSelect={(date) => date && setStartDate(date)}
//                         className="rounded-lg border"
//                       />
//                     </PopoverContent>
//                   </Popover>
//                 </CardContent>
//               </Card>

//               <SheetFooter>
//                 <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
//                   Cancel
//                 </Button>
//                 <Button onClick={handleAssign} disabled={!selectedProcedureId || selectedEmployeeIds.length === 0}>
//                   Assign Procedure
//                 </Button>
//               </SheetFooter>
//             </div>
//           </SheetContent>
//         </Sheet>
//       </div>

//       {/* Search and Filters */}
//       <div className="px-4 lg:px-6">
//         <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
//           <div className="relative flex-1 max-w-sm">
//             <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
//             <Input
//               placeholder="Search assignments..."
//               value={globalFilter}
//               onChange={(e) => setGlobalFilter(e.target.value)}
//               className="pl-9"
//             />
//           </div>
//           <div className="flex gap-2">
//             <Select value={statusFilter} onValueChange={setStatusFilter}>
//               <SelectTrigger className="w-[180px]">
//                 <SelectValue placeholder="All Status" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Status</SelectItem>
//                 <SelectItem value="not_started">Not Started</SelectItem>
//                 <SelectItem value="in_progress">In Progress</SelectItem>
//                 <SelectItem value="completed">Completed</SelectItem>
//                 <SelectItem value="cancelled">Cancelled</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>
//         </div>
//       </div>

//       {/* Assignments Table */}
//       <div className="px-4 lg:px-6">
//         <div className="overflow-hidden rounded-lg border">
//           <Table>
//             <TableHeader>
//               {table.getHeaderGroups().map((headerGroup) => (
//                 <TableRow key={headerGroup.id}>
//                   {headerGroup.headers.map((header) => (
//                     <TableHead key={header.id}>
//                       {header.isPlaceholder
//                         ? null
//                         : flexRender(header.column.columnDef.header, header.getContext())}
//                     </TableHead>
//                   ))}
//                 </TableRow>
//               ))}
//             </TableHeader>
//             <TableBody>
//               {table.getRowModel().rows?.length ? (
//                 table.getRowModel().rows.map((row) => (
//                   <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
//                     {row.getVisibleCells().map((cell) => (
//                       <TableCell key={cell.id}>
//                         {flexRender(cell.column.columnDef.cell, cell.getContext())}
//                       </TableCell>
//                     ))}
//                   </TableRow>
//                 ))
//               ) : (
//                 <TableRow>
//                   <TableCell colSpan={columns.length} className="h-24 text-center">
//                     No procedure assignments found. Assign a procedure to get started.
//                   </TableCell>
//                 </TableRow>
//               )}
//             </TableBody>
//           </Table>
//         </div>

//         {/* Pagination */}
//         <div className="flex items-center justify-between px-4 py-4">
//           <div className="text-muted-foreground text-sm">
//             Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
//             {Math.min(
//               (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
//               filteredAssignments.length
//             )}{" "}
//             of {filteredAssignments.length} assignments
//           </div>
//           <div className="flex items-center gap-2">
//             <Button
//               variant="outline"
//               size="icon"
//               className="h-8 w-8"
//               onClick={() => table.setPageIndex(0)}
//               disabled={!table.getCanPreviousPage()}
//             >
//               <IconChevronsLeft className="size-4" />
//             </Button>
//             <Button
//               variant="outline"
//               size="icon"
//               className="h-8 w-8"
//               onClick={() => table.previousPage()}
//               disabled={!table.getCanPreviousPage()}
//             >
//               <IconChevronLeft className="size-4" />
//             </Button>
//             <div className="text-sm font-medium">
//               Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
//             </div>
//             <Button
//               variant="outline"
//               size="icon"
//               className="h-8 w-8"
//               onClick={() => table.nextPage()}
//               disabled={!table.getCanNextPage()}
//             >
//               <IconChevronRight className="size-4" />
//             </Button>
//             <Button
//               variant="outline"
//               size="icon"
//               className="h-8 w-8"
//               onClick={() => table.setPageIndex(table.getPageCount() - 1)}
//               disabled={!table.getCanNextPage()}
//             >
//               <IconChevronsRight className="size-4" />
//             </Button>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
