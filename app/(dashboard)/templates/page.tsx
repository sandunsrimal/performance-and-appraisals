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
  IconGripVertical,
  IconEye,
  IconSettings,
  IconStar,
  IconStarFilled,
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  type EvaluationForm,
  type FormField,
  type FormFieldType,
} from "@/lib/types"
import { evaluationForms, initializeWorkflowData } from "@/lib/workflow-data"

const fieldTypes: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Short Answer" },
  { value: "textarea", label: "Long Answer" },
  { value: "number", label: "Number" },
  { value: "rating", label: "Rating" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkbox", label: "Checkboxes" },
  { value: "date", label: "Date" },
  { value: "file", label: "File Upload" },
]

// Sortable Field Item Component
function SortableFieldItem({
  field,
  onEdit,
  onDelete,
}: Readonly<{
  field: FormField
  onEdit: (field: FormField) => void
  onDelete: (fieldId: string) => void
}>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg p-4 bg-background hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground"
        >
          <IconGripVertical className="size-5" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{field.label}</span>
            <Badge variant="secondary" className="text-xs">
              {fieldTypes.find((t) => t.value === field.type)?.label || field.type}
            </Badge>
            {field.required && (
              <Badge variant="outline" className="text-xs">
                Required
              </Badge>
            )}
          </div>
          {field.helpText && (
            <p className="text-sm text-muted-foreground">{field.helpText}</p>
          )}
          {field.options && field.options.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Options: {field.options.join(", ")}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(field)}
            className="h-8 w-8 p-0"
          >
            <IconEdit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(field.id)}
            className="h-8 w-8 p-0"
          >
            <IconX className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Form Preview Component
function FormPreview({ form }: Readonly<{ form: Partial<EvaluationForm> }>) {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-semibold">{form.name || "Untitled Form"}</h2>
        {form.description && (
          <p className="text-muted-foreground mt-2">{form.description}</p>
        )}
      </div>

      {form.fields && form.fields.length > 0 ? (
        <div className="space-y-6">
          {form.fields.map((field, index) => (
            <div key={field.id} className="space-y-2">
              <Label className="text-base">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.helpText && (
                <p className="text-sm text-muted-foreground">{field.helpText}</p>
              )}

              {/* Render field based on type */}
              {field.type === "text" && (
                <Input
                  placeholder={field.placeholder || "Your answer"}
                  disabled
                  className="bg-muted"
                />
              )}

              {field.type === "textarea" && (
                <Textarea
                  placeholder={field.placeholder || "Your answer"}
                  disabled
                  className="bg-muted min-h-24"
                />
              )}

              {field.type === "number" && (
                <Input
                  type="number"
                  placeholder={field.placeholder || "Enter a number"}
                  min={field.min}
                  max={field.max}
                  disabled
                  className="bg-muted"
                />
              )}

              {field.type === "rating" && (
                <div className="flex gap-1">
                  {Array.from({ length: (field.max || 5) - (field.min || 1) + 1 }).map(
                    (_, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled
                        className="text-yellow-400 hover:text-yellow-500 transition-colors disabled:opacity-50"
                        aria-label={`Rating ${i + (field.min || 1)}`}
                      >
                        <IconStarFilled className="size-6" />
                      </button>
                    )
                  )}
                </div>
              )}

              {field.type === "dropdown" && (
                <Select disabled>
                  <SelectTrigger className="bg-muted">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {field.type === "checkbox" && (
                <div className="space-y-2">
                  {field.options?.map((option) => (
                    <div key={option} className="flex items-center gap-2">
                      <Checkbox disabled id={`preview-${field.id}-${option}`} />
                      <Label
                        htmlFor={`preview-${field.id}-${option}`}
                        className="font-normal cursor-default"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {field.type === "date" && (
                <Input
                  type="date"
                  disabled
                  className="bg-muted"
                />
              )}

              {field.type === "file" && (
                <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    File upload area (disabled in preview)
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No fields added yet. Add fields from the builder panel.</p>
        </div>
      )}

      {/* Submit Button */}
      {form.fields && form.fields.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <Button type="submit" className="w-full" size="lg">
            Submit Form
          </Button>
        </div>
      )}
    </div>
  )
}

export default function TemplatesPage() {
  const [forms, setForms] = React.useState<EvaluationForm[]>([])
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [editingFormId, setEditingFormId] = React.useState<string | null>(null)
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<"builder" | "preview">("builder")
  const [editingFieldId, setEditingFieldId] = React.useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [formToDelete, setFormToDelete] = React.useState<string | null>(null)
  const [viewSheetOpen, setViewSheetOpen] = React.useState(false)
  const [selectedFormForView, setSelectedFormForView] = React.useState<EvaluationForm | null>(null)

  // Form state
  const [formData, setFormData] = React.useState<Partial<EvaluationForm>>({
    name: "",
    description: "",
    fields: [],
  })

  const [currentField, setCurrentField] = React.useState<Partial<FormField>>({
    label: "",
    type: "text",
    required: false,
  })

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Initialize data
  React.useEffect(() => {
    initializeWorkflowData([])
    setForms(evaluationForms)
  }, [])

  // Filter forms
  const filteredForms = React.useMemo(() => {
    return forms.filter((form) => {
      const matchesSearch =
        globalFilter === "" ||
        form.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
        form.description.toLowerCase().includes(globalFilter.toLowerCase())

      return matchesSearch
    })
  }, [forms, globalFilter])

  // Handle edit
  const handleEdit = React.useCallback((form: EvaluationForm) => {
    setEditingFormId(form.id)
    setFormData({
      name: form.name,
      description: form.description,
      fields: form.fields,
    })
    setEditingFieldId(null)
    setActiveTab("builder")
    setIsSheetOpen(true)
  }, [])

  // Handle duplicate
  const handleDuplicate = React.useCallback((form: EvaluationForm) => {
    const duplicatedForm: EvaluationForm = {
      ...form,
      id: `form-${Date.now()}`,
      name: `${form.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setForms((prev) => [...prev, duplicatedForm])
    toast.success("Form duplicated successfully!")
  }, [])

  // Handle delete
  const handleDelete = React.useCallback((formId: string) => {
    setFormToDelete(formId)
    setDeleteDialogOpen(true)
  }, [])

  const confirmDelete = React.useCallback(() => {
    if (formToDelete) {
      setForms((prev) => prev.filter((f) => f.id !== formToDelete))
      toast.success("Review form deleted successfully!")
      setFormToDelete(null)
    }
    setDeleteDialogOpen(false)
  }, [formToDelete])

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setFormData((prev) => {
        const fields = prev.fields || []
        const oldIndex = fields.findIndex((f) => f.id === active.id)
        const newIndex = fields.findIndex((f) => f.id === over.id)

        return {
          ...prev,
          fields: arrayMove(fields, oldIndex, newIndex),
        }
      })
    }
  }

  // Add field
  const addField = () => {
    if (!currentField.label) {
      toast.error("Please enter a field label")
      return
    }

    const newField: FormField = {
      id: editingFieldId || `field-${Date.now()}`,
      label: currentField.label || "",
      type: currentField.type || "text",
      required: currentField.required ?? false,
      options: currentField.options,
      min: currentField.min,
      max: currentField.max,
      placeholder: currentField.placeholder,
      helpText: currentField.helpText,
    }

    if (editingFieldId) {
      // Update existing field
      setFormData((prev) => ({
        ...prev,
        fields: prev.fields?.map((f) => (f.id === editingFieldId ? newField : f)) || [],
      }))
      toast.success("Field updated successfully!")
    } else {
      // Add new field
      setFormData((prev) => ({
        ...prev,
        fields: [...(prev.fields || []), newField],
      }))
      toast.success("Field added successfully!")
    }

    setCurrentField({
      label: "",
      type: "text",
      required: false,
    })
    setEditingFieldId(null)
  }

  // Edit field
  const editField = (field: FormField) => {
    setCurrentField(field)
    setEditingFieldId(field.id)
    setActiveTab("builder")
  }

  // Remove field
  const removeField = (fieldId: string) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields?.filter((f) => f.id !== fieldId) || [],
    }))
    if (editingFieldId === fieldId) {
      setEditingFieldId(null)
      setCurrentField({
        label: "",
        type: "text",
        required: false,
      })
    }
  }

  // Handle submit
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!formData.name) {
      toast.error("Please enter a form name")
      return
    }

    const form: EvaluationForm = {
      id: editingFormId || `form-${Date.now()}`,
      name: formData.name || "",
      description: formData.description || "",
      fields: formData.fields || [],
      createdAt: editingFormId
        ? forms.find((f) => f.id === editingFormId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (editingFormId) {
      setForms((prev) => prev.map((f) => (f.id === editingFormId ? form : f)))
      toast.success("Evaluation form updated successfully!")
    } else {
      setForms((prev) => [...prev, form])
      toast.success("Evaluation form created successfully!")
    }

    setIsSheetOpen(false)
    setEditingFormId(null)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      fields: [],
    })
    setCurrentField({
      label: "",
      type: "text",
      required: false,
    })
    setEditingFieldId(null)
    setActiveTab("builder")
  }

  // Columns
  const columns: ColumnDef<EvaluationForm>[] = React.useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Form Name",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-sm text-muted-foreground">{row.original.description}</div>
          </div>
        ),
      },
      {
        accessorKey: "fields",
        header: "Fields",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.fields.length} fields</span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-sm">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
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
    data: filteredForms,
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
          <h2 className="text-2xl font-semibold">Review Forms</h2>
          <p className="text-muted-foreground mt-2">
            Create and manage customizable evaluation forms like Google Forms.
          </p>
        </div>
        <Sheet open={isSheetOpen} onOpenChange={(open) => {
          setIsSheetOpen(open)
          if (!open) {
            setEditingFormId(null)
            resetForm()
          }
        }}>
          <SheetTrigger asChild>
            <Button onClick={() => {
              setEditingFormId(null)
              resetForm()
            }}>
              <IconPlus className="size-4 mr-2" />
              Create Form
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full! max-w-full! md:w-[70vw]! md:max-w-[70vw]! lg:w-[50vw]! lg:max-w-[50vw]! overflow-y-auto px-8 py-4">
            <div className="flex h-full">
              {/* Left Panel - Builder */}
              <div className="flex-1 overflow-y-auto">
                <SheetHeader className="mb-6">
                  <SheetTitle>
                    {editingFormId ? "Edit Evaluation Form" : "Create New Evaluation Form"}
                  </SheetTitle>
                  <SheetDescription>
                    Build your form with drag-and-drop fields, just like Google Forms.
                  </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="w-full">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "builder" | "preview")} className="w-full">
                    <TabsList className="mb-6">
                      <TabsTrigger value="builder">
                        <IconSettings className="size-4 mr-2" />
                        Builder
                      </TabsTrigger>
                      <TabsTrigger value="preview">
                        <IconEye className="size-4 mr-2" />
                        Preview
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="builder" className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Form Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="form-name">
                            Form Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="form-name"
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Standard Performance Evaluation"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="form-description">Description</Label>
                          <Textarea
                            id="form-description"
                            value={formData.description}
                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe this evaluation form..."
                            rows={2}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Add Field Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          {editingFieldId ? "Edit Field" : "Add New Field"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Field Label *</Label>
                            <Input
                              value={currentField.label}
                              onChange={(e) => setCurrentField((prev) => ({ ...prev, label: e.target.value }))}
                              placeholder="e.g., Overall Performance Rating"
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Field Type *</Label>
                            <Select
                              value={currentField.type}
                              onValueChange={(value: FormFieldType) =>
                                setCurrentField((prev) => ({ ...prev, type: value }))
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fieldTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Placeholder (Optional)</Label>
                          <Input
                            value={currentField.placeholder || ""}
                            onChange={(e) => setCurrentField((prev) => ({ ...prev, placeholder: e.target.value }))}
                            placeholder="Placeholder text..."
                            className="w-full"
                          />
                        </div>
                        {(currentField.type === "rating" || currentField.type === "number") && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Min Value</Label>
                              <Input
                                type="number"
                                value={currentField.min || ""}
                                onChange={(e) =>
                                  setCurrentField((prev) => ({
                                    ...prev,
                                    min: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
                                  }))
                                }
                                placeholder="e.g., 1"
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Max Value</Label>
                              <Input
                                type="number"
                                value={currentField.max || ""}
                                onChange={(e) =>
                                  setCurrentField((prev) => ({
                                    ...prev,
                                    max: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
                                  }))
                                }
                                placeholder="e.g., 5"
                                className="w-full"
                              />
                            </div>
                          </div>
                        )}
                        {(currentField.type === "dropdown" || currentField.type === "checkbox") && (
                          <div className="space-y-2">
                            <Label>Options (comma-separated) *</Label>
                            <Input
                              value={currentField.options?.join(", ") || ""}
                              onChange={(e) =>
                                setCurrentField((prev) => ({
                                  ...prev,
                                  options: e.target.value
                                    .split(",")
                                    .map((opt) => opt.trim())
                                    .filter((opt) => opt.length > 0),
                                }))
                              }
                              placeholder="e.g., Option 1, Option 2, Option 3"
                              className="w-full"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Help Text (Optional)</Label>
                          <Input
                            value={currentField.helpText || ""}
                            onChange={(e) => setCurrentField((prev) => ({ ...prev, helpText: e.target.value }))}
                            placeholder="Help text for this field..."
                            className="w-full"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="required-field"
                            checked={currentField.required}
                            onCheckedChange={(checked) =>
                              setCurrentField((prev) => ({ ...prev, required: checked === true }))
                            }
                          />
                          <Label htmlFor="required-field" className="cursor-pointer">
                            Required field
                          </Label>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" onClick={addField} className="flex-1">
                            <IconPlus className="size-4 mr-2" />
                            {editingFieldId ? "Update Field" : "Add Field"}
                          </Button>
                          {editingFieldId && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setEditingFieldId(null)
                                setCurrentField({
                                  label: "",
                                  type: "text",
                                  required: false,
                                })
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Fields List with Drag and Drop */}
                    {formData.fields && formData.fields.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Form Fields ({formData.fields.length})</CardTitle>
                          <CardDescription>
                            Drag and drop to reorder fields
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={formData.fields.map((f) => f.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-3">
                                {formData.fields.map((field) => (
                                  <SortableFieldItem
                                    key={field.id}
                                    field={field}
                                    onEdit={editField}
                                    onDelete={removeField}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="preview">
                    <Card>
                      <CardHeader>
                        <CardTitle>Form Preview</CardTitle>
                        <CardDescription>
                          See how your form will look to users
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <FormPreview form={formData} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                <SheetFooter className="mt-6 pt-6 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsSheetOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingFormId ? "Update Form" : "Create Form"}
                  </Button>
                </SheetFooter>
                </form>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Search */}
      <div className="px-4 lg:px-6">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search forms..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Forms Table */}
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
                      setSelectedFormForView(row.original)
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
                    No evaluation forms found. Create your first form to get started.
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
              filteredForms.length
            )}{" "}
            of {filteredForms.length} forms
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

      {/* View Form Sheet */}
      <Sheet open={viewSheetOpen} onOpenChange={setViewSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-4">
          <SheetHeader className="sr-only">
            <SheetTitle>
              {selectedFormForView?.name || "Form Preview"}
            </SheetTitle>
          </SheetHeader>
          {selectedFormForView && (
            <FormPreview form={selectedFormForView} />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the evaluation form
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFormToDelete(null)}>
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
