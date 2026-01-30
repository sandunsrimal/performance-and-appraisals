"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  IconUser,
  IconUsers,
  IconFileText,
  IconStarFilled,
  IconCalendar,
  IconDownload,
  IconCheck,
} from "@tabler/icons-react"
import { format } from "date-fns"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  getEvaluationForm,
  getWorkflowTemplate,
  getEmployee,
  workflowAssignments,
  initializeWorkflowData,
} from "@/lib/workflow-data"
import { demoEmployees } from "@/lib/data/demo-employees"
import type { EvaluationForm } from "@/lib/types"
import { useRole } from "@/lib/role-context"
import { getTaskContext, formatTaskContextDisplay } from "@/lib/employee-role-utils"

export default function FormViewPage({
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
  const [employeeName, setEmployeeName] = React.useState<string>("")
  const [managerName, setManagerName] = React.useState<string>("")
  const [procedureName, setProcedureName] = React.useState<string>("")
  const [stepName, setStepName] = React.useState<string>("")
  const [completedDate, setCompletedDate] = React.useState<string>("")
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

        // Load form data
        const completion = assignment.stepCompletions[stepId]
        if (completion?.formData) {
          setFormData(completion.formData as Record<string, unknown>)
        }
        if (completion?.completedDate) {
          setCompletedDate(completion.completedDate)
        }
      }
    }
  }, [resolvedParams.formId, assignmentId, stepId, router, currentUserId, currentUserName])

  // Download form data
  const handleDownload = () => {
    if (!form) return

    const data = {
      formName: form.name,
      employeeName,
      managerName,
      procedureName,
      stepName,
      completedDate,
      responses: formData,
    }

    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${form.name}-${employeeName}-${format(new Date(), "yyyy-MM-dd")}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Form data downloaded")
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
              <Badge variant="default" className="flex items-center gap-1">
                <IconCheck className="size-3" />
                Completed
              </Badge>
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
                {completedDate && (
                  <div className="flex items-center gap-2">
                    <IconCheck className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Completed Date</p>
                      <p className="text-sm font-medium">
                        {format(new Date(completedDate), "MMM dd, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Responses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Form Responses</CardTitle>
              <Button variant="outline" onClick={handleDownload}>
                <IconDownload className="size-4 mr-2" />
                Download
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {form.fields.map((field) => {
              const fieldValue = formData[field.id]

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
                            className={`${
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
                  ) : field.type === "file" ? (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">{String(fieldValue)}</p>
                    </div>
                  ) : (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">{String(fieldValue)}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
