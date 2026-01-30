"use client"

import * as React from "react"
import {
  IconUser,
  IconUsers,
  IconFileText,
  IconCalendar,
  IconCheck,
} from "@tabler/icons-react"
import { format } from "date-fns"
import { toast } from "sonner"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  getWorkflowTemplate,
  getEmployee,
  workflowAssignments,
  initializeWorkflowData,
} from "@/lib/workflow-data"
import { demoEmployees } from "@/lib/data/demo-employees"

export default function ApprovalViewPage({
  params,
}: {
  params: Promise<{ assignmentId: string; stepId: string }>
}) {
  const resolvedParams = React.use(params)

  const [assignment, setAssignment] = React.useState<typeof workflowAssignments[number] | null>(null)
  const [template, setTemplate] = React.useState<ReturnType<typeof getWorkflowTemplate> | null>(null)
  const [employee, setEmployee] = React.useState<ReturnType<typeof getEmployee> | null>(null)
  const [step, setStep] = React.useState<NonNullable<ReturnType<typeof getWorkflowTemplate>>["steps"][number] | null>(null)
  const [managerName, setManagerName] = React.useState<string>("")

  // Initialize workflow data
  React.useEffect(() => {
    initializeWorkflowData(demoEmployees)
  }, [])

  // Load assignment and related data
  React.useEffect(() => {
    initializeWorkflowData(demoEmployees)

    const assignmentData = workflowAssignments.find(
      (a) => a.id === resolvedParams.assignmentId
    )

    if (!assignmentData) {
      toast.error("Assignment not found")
      return
    }

    setAssignment(assignmentData)

    const templateData = getWorkflowTemplate(assignmentData.workflowTemplateId)
    if (!templateData) {
      toast.error("Workflow template not found")
      return
    }

    setTemplate(templateData)

    const stepData = templateData.steps.find((s) => s.id === resolvedParams.stepId)
    if (!stepData) {
      toast.error("Step not found")
      return
    }

    setStep(stepData)

    const employeeData = getEmployee(assignmentData.employeeId)
    if (!employeeData) {
      toast.error("Employee not found")
      return
    }

    setEmployee(employeeData)

    // Get manager name from step attendees
    if (stepData.attendees && employeeData.managers) {
      stepData.attendees.forEach((attendee) => {
        if (attendee.startsWith("manager_level_")) {
          const levelMatch = attendee.match(/manager_level_(\d+)/)
          if (levelMatch) {
            const level = Number.parseInt(levelMatch[1], 10)
            const manager = employeeData.managers?.find((m) => m.level === level)
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
  }, [resolvedParams.assignmentId, resolvedParams.stepId])

  if (!assignment || !template || !employee || !step) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p>Loading approval details...</p>
      </div>
    )
  }

  const isCompleted = assignment.stepCompletions[resolvedParams.stepId]?.completed
  const completionData = assignment.stepCompletions[resolvedParams.stepId]?.formData as
    | { approved?: boolean; comment?: string }
    | undefined

  // Get all completed steps
  const completedSteps = template.steps.filter(
    (s) => assignment.stepCompletions[s.id]?.completed
  )
  const totalSteps = template.steps.length

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Approval Details</CardTitle>
                <CardDescription>
                  View the approval decision for this appraisal
                </CardDescription>
              </div>
              {isCompleted && (
                <Badge
                  variant={completionData?.approved ? "default" : "destructive"}
                  className="flex items-center gap-1"
                >
                  <IconCheck className="size-3" />
                  {completionData?.approved ? "Approved" : "Rejected"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <IconUser className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Employee</p>
                  <p className="text-sm font-medium">
                    {employee.firstName} {employee.lastName}
                  </p>
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
              <div className="flex items-center gap-2">
                <IconFileText className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Procedure</p>
                  <p className="text-sm font-medium">{template.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <IconCalendar className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Review Period</p>
                  <p className="text-sm font-medium">
                    {format(new Date(assignment.startDate), "MMM dd, yyyy")} -{" "}
                    {assignment.endDate
                      ? format(new Date(assignment.endDate), "MMM dd, yyyy")
                      : "Ongoing"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Steps Completed
                </span>
                <span className="text-sm font-medium">
                  {completedSteps.length} / {totalSteps}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${(completedSteps.length / totalSteps) * 100}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Decision */}
        {isCompleted && completionData && (
          <Card>
            <CardHeader>
              <CardTitle>Approval Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="mt-1">
                  <Badge
                    variant={completionData.approved ? "default" : "destructive"}
                  >
                    {completionData.approved ? "Approved" : "Rejected"}
                  </Badge>
                </div>
              </div>
              {completionData.comment && (
                <div>
                  <Label className="text-sm font-medium">Comments</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded">
                    {completionData.comment}
                  </p>
                </div>
              )}
              {assignment.stepCompletions[resolvedParams.stepId]?.completedDate && (
                <div>
                  <Label className="text-sm font-medium">Decision Date</Label>
                  <p className="text-sm mt-1">
                    {format(
                      new Date(
                        assignment.stepCompletions[resolvedParams.stepId]
                          ?.completedDate || ""
                      ),
                      "MMM dd, yyyy 'at' h:mm a"
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step Details */}
        <Card>
          <CardHeader>
            <CardTitle>Step Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Step Name</Label>
              <p className="text-sm mt-1">{step.name}</p>
            </div>
            {step.description && (
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm mt-1">{step.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
