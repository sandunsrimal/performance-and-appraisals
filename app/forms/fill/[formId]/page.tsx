"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  IconUser,
  IconUsers,
  IconFileText,
  IconStar,
  IconStarFilled,
  IconCalendar,
} from "@tabler/icons-react"
import { format } from "date-fns"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getEvaluationForm,
  getWorkflowTemplate,
  getEmployee,
  workflowAssignments,
  initializeWorkflowData,
} from "@/lib/workflow-data"
import { demoEmployees } from "@/lib/data/demo-employees"
import type { FormField, EvaluationForm } from "@/lib/types"
import { useRole } from "@/lib/role-context"
import { getTaskContext, formatTaskContextDisplay } from "@/lib/employee-role-utils"
import { Badge } from "@/components/ui/badge"

export default function FormFillPage({
  params,
}: {
  params: Promise<{ formId: string }>
}) {
  const resolvedParams = React.use(params)
  const searchParams = useSearchParams()
  const router = useRouter()
  const assignmentId = searchParams.get("assignmentId")
  const stepId = searchParams.get("stepId")

  const [form, setForm] = React.useState<EvaluationForm | null>(null)
  const [formData, setFormData] = React.useState<Record<string, unknown>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [employeeName, setEmployeeName] = React.useState<string>("")
  const [managerName, setManagerName] = React.useState<string>("")
  const [procedureName, setProcedureName] = React.useState<string>("")
  const [stepName, setStepName] = React.useState<string>("")
  const [contextDisplay, setContextDisplay] = React.useState<{
    title: string
    subtitle: string
    badge: string
  } | null>(null)
  
  const { currentUserId, currentUserName } = useRole()

  // Initialize workflow data on mount
  React.useEffect(() => {
    initializeWorkflowData(demoEmployees)
  }, [])

  // Load form and assignment data
  React.useEffect(() => {
    // Ensure data is initialized
    initializeWorkflowData(demoEmployees)
    
    const evaluationForm = getEvaluationForm(resolvedParams.formId)
    if (!evaluationForm) {
      toast.error("Form not found")
      router.back()
      return
    }

    setForm(evaluationForm)

    // Get assignment and employee info
    if (assignmentId && stepId) {
      const assignment = workflowAssignments.find((a) => a.id === assignmentId)
      if (assignment) {
        const template = getWorkflowTemplate(assignment.workflowTemplateId)
        const employee = getEmployee(assignment.employeeId)

        if (employee) {
          setEmployeeName(`${employee.firstName} ${employee.lastName}`)
        }

        if (template) {
          setProcedureName(template.name)
          const step = template.steps.find((s) => s.id === stepId)
          if (step && employee) {
            setStepName(step.name)

            // Get context information
            const context = getTaskContext(employee, currentUserId, currentUserName, step, template.name)
            const display = formatTaskContextDisplay(context)
            setContextDisplay(display)

            // Get manager name from step attendees
            if (step.attendees) {
              step.attendees.forEach((attendee) => {
                if (attendee.startsWith("manager_level_")) {
                  const levelMatch = attendee.match(/manager_level_(\d+)/)
                  if (levelMatch && employee.managers) {
                    const level = Number.parseInt(levelMatch[1], 10)
                    const manager = employee.managers.find((m) => m.level === level)
                    if (manager) {
                      if (manager.isExternal && manager.externalName) {
                        setManagerName(manager.externalName)
                      } else if (manager.employeeId) {
                        const managerEmp = getEmployee(manager.employeeId)
                        if (managerEmp) {
                          setManagerName(`${managerEmp.firstName} ${managerEmp.lastName}`)
                        }
                      }
                    }
                  }
                }
              })
            }
          }
        }

        // Load existing form data if available
        const existingData = assignment.stepCompletions[stepId]?.formData
        if (existingData) {
          setFormData(existingData as Record<string, unknown>)
        }
      }
    }
  }, [resolvedParams.formId, assignmentId, stepId, router, currentUserId, currentUserName])

  // Handle field value change
  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }))
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form || !assignmentId || !stepId) {
      toast.error("Missing required information")
      return
    }

    // Validate required fields
    const missingFields = form.fields.filter(
      (field) => field.required && !formData[field.id]
    )

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.map((f) => f.label).join(", ")}`)
      return
    }

    setIsSubmitting(true)

    // In a real app, this would be an API call
    // For now, we'll update the assignment in memory
    const assignment = workflowAssignments.find((a) => a.id === assignmentId)
    if (assignment) {
      assignment.stepCompletions[stepId] = {
        completed: true,
        completedDate: new Date().toISOString(),
        completedBy: assignment.employeeId,
        formData,
      }

      // Update assignment status if all steps are completed
      const template = getWorkflowTemplate(assignment.workflowTemplateId)
      if (template) {
        const allCompleted = template.steps.every(
          (step) => assignment.stepCompletions[step.id]?.completed
        )
        if (allCompleted) {
          assignment.status = "completed"
        } else {
          assignment.status = "in_progress"
        }
        assignment.updatedAt = new Date().toISOString()
      }
    }

    setTimeout(() => {
      setIsSubmitting(false)
      toast.success("Form submitted successfully!")
      router.back()
    }, 1000)
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p>Loading form...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Form Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl">{form.name}</CardTitle>
                {form.description && (
                  <CardDescription className="mt-1">{form.description}</CardDescription>
                )}
                {contextDisplay && (
                  <div className="mt-3">
                    <Badge variant="secondary" className="text-sm font-semibold">
                      {contextDisplay.badge}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-4 border-t">
              {contextDisplay && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-foreground">{contextDisplay.title}</p>
                  <p className="text-sm text-muted-foreground">{contextDisplay.subtitle}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <IconUser className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Form is for Employee</p>
                    <p className="text-sm font-medium">{employeeName || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IconUser className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Your Name</p>
                    <p className="text-sm font-medium">{currentUserName}</p>
                  </div>
                </div>
                {managerName && (
                  <div className="flex items-center gap-2">
                    <IconUsers className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Manager</p>
                      <p className="text-sm font-medium">{managerName}</p>
                    </div>
                  </div>
                )}
                {procedureName && (
                  <div className="flex items-center gap-2">
                    <IconFileText className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Procedure</p>
                      <p className="text-sm font-medium">{procedureName}</p>
                    </div>
                  </div>
                )}
                {stepName && (
                  <div className="flex items-center gap-2">
                    <IconCalendar className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Your Step</p>
                      <p className="text-sm font-medium">{stepName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Fields */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Form Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {form.fields.map((field) => (
                <FormFieldComponent
                  key={field.id}
                  field={field}
                  value={formData[field.id]}
                  onChange={(value) => handleFieldChange(field.id, value)}
                />
              ))}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Submitting..." : "Submit Form"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Form Field Component
function FormFieldComponent({
  field,
  value,
  onChange,
}: Readonly<{
  field: FormField
  value: unknown
  onChange: (value: unknown) => void
}>) {
  return (
    <div className="space-y-2">
      <Label className="text-base">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {field.helpText && (
        <p className="text-sm text-muted-foreground">{field.helpText}</p>
      )}

      {/* Text Field */}
      {field.type === "text" && (
        <Input
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "Your answer"}
          required={field.required}
        />
      )}

      {/* Textarea Field */}
      {field.type === "textarea" && (
        <Textarea
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || "Your answer"}
          required={field.required}
          className="min-h-24"
        />
      )}

      {/* Number Field */}
      {field.type === "number" && (
        <Input
          type="number"
          value={(value as number) || ""}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={field.placeholder || "Enter a number"}
          min={field.min}
          max={field.max}
          required={field.required}
        />
      )}

      {/* Rating Field */}
      {field.type === "rating" && (
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {Array.from({ length: (field.max || 5) - (field.min || 1) + 1 }).map(
              (_, i) => {
                const ratingValue = i + (field.min || 1)
                const isSelected = value === ratingValue
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onChange(ratingValue)}
                    className={`transition-colors ${
                      isSelected
                        ? "text-yellow-500 hover:text-yellow-600"
                        : "text-muted-foreground hover:text-yellow-400"
                    }`}
                    aria-label={`Rating ${ratingValue}`}
                  >
                    {isSelected ? (
                      <IconStarFilled className="size-8" />
                    ) : (
                      <IconStar className="size-8" />
                    )}
                  </button>
                )
              }
            )}
          </div>
          {value != null && typeof value === "number" && (
            <span className="text-sm font-medium">
              {value} out of {field.max || 5}
            </span>
          )}
        </div>
      )}

      {/* Dropdown Field */}
      {field.type === "dropdown" && (
        <Select
          value={(value as string) || ""}
          onValueChange={onChange}
          required={field.required}
        >
          <SelectTrigger>
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

      {/* Checkbox Field */}
      {field.type === "checkbox" && (
        <div className="space-y-2">
          {field.options?.map((option) => {
            const checkedValues = (value as string[]) || []
            const isChecked = checkedValues.includes(option)
            return (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  id={`${field.id}-${option}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    const currentValues = (value as string[]) || []
                    if (checked) {
                      onChange([...currentValues, option])
                    } else {
                      onChange(currentValues.filter((v) => v !== option))
                    }
                  }}
                />
                <Label
                  htmlFor={`${field.id}-${option}`}
                  className="font-normal cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            )
          })}
        </div>
      )}

      {/* Date Field */}
      {field.type === "date" && (
        <Input
          type="date"
          value={
            value
              ? format(new Date(value as string), "yyyy-MM-dd")
              : ""
          }
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
        />
      )}

      {/* File Field */}
      {field.type === "file" && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <Input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                onChange(file.name)
              }
            }}
            required={field.required}
            className="cursor-pointer"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Upload a file
          </p>
        </div>
      )}
    </div>
  )
}
