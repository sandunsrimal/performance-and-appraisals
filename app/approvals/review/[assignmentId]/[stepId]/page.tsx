"use client"

import * as React from "react"
import {
  IconUser,
  IconUsers,
  IconFileText,
  IconCalendar,
  IconThumbUp,
  IconX,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react"
import { format } from "date-fns"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  getWorkflowTemplate,
  getEmployee,
  workflowAssignments,
  initializeWorkflowData,
  getEvaluationForm,
  getEffectiveManagers,
} from "@/lib/workflow-data"
import { demoEmployees } from "@/lib/data/demo-employees"
import { type ReviewStage } from "@/lib/types"

export default function ApprovalReviewPage({
  params,
}: {
  readonly params: Promise<{ assignmentId: string; stepId: string }>
}) {
  const resolvedParams = React.use(params)

  const [assignment, setAssignment] = React.useState<typeof workflowAssignments[number] | null>(null)
  const [template, setTemplate] = React.useState<ReturnType<typeof getWorkflowTemplate> | null>(null)
  const [employee, setEmployee] = React.useState<ReturnType<typeof getEmployee> | null>(null)
  const [step, setStep] = React.useState<ReviewStage | null>(null)
  const [managerName, setManagerName] = React.useState<string>("")
  const [approvalComment, setApprovalComment] = React.useState<string>("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [expandedSteps, setExpandedSteps] = React.useState<Set<string>>(new Set())

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

    const stepData = templateData.stages.find((s) => s.id === resolvedParams.stepId)
    if (!stepData) {
      toast.error("Review stage not found")
      return
    }

    setStep(stepData)

    const employeeData = getEmployee(assignmentData.employeeId)
    if (!employeeData) {
      toast.error("Employee not found")
      return
    }

    setEmployee(employeeData)

    // Get manager name from step attendees - use effective managers (assignment overrides or employee's managers)
    const effectiveManagers = getEffectiveManagers(assignmentData)
    if (stepData.attendees && effectiveManagers.length > 0) {
      const managerLevelRegex = /manager_level_(\d+)/
      stepData.attendees.forEach((attendee) => {
        if (attendee.startsWith("manager_level_")) {
          const levelMatch = managerLevelRegex.exec(attendee)
          if (levelMatch) {
            const level = Number.parseInt(levelMatch[1], 10)
            const manager = effectiveManagers.find((m) => m.level === level)
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

  // Handle approval
  const handleApprove = () => {
    if (!assignment || !resolvedParams.stepId || !template) {
      toast.error("Missing required information")
      return
    }

    setIsSubmitting(true)

    // Update step completion
    const updatedStepCompletions = {
      ...assignment.stageCompletions,
      [resolvedParams.stepId]: {
        completed: true,
        completedDate: new Date().toISOString(),
        completedBy: assignment.employeeId, // In real app, this would be the approver's ID
        formData: {
          approved: true,
          comment: approvalComment,
          approvedAt: new Date().toISOString(),
        },
      },
    }

    // Update assignment status if all review stages are completed
    const allCompleted = template.stages.every(
      (stage) => updatedStepCompletions[stage.id]?.completed
    )
    const newStatus = allCompleted ? "completed" : "in_progress"

    // Update assignment using setter
    setAssignment({
      ...assignment,
      stageCompletions: updatedStepCompletions,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    })

    setTimeout(() => {
      setIsSubmitting(false)
      toast.success("Appraisal approved successfully!")
      window.close()
    }, 1000)
  }

  // Handle rejection
  const handleReject = () => {
    if (!assignment || !resolvedParams.stepId) {
      toast.error("Missing required information")
      return
    }

    if (!approvalComment.trim()) {
      toast.error("Please provide a reason for rejection")
      return
    }

    setIsSubmitting(true)

    // Update step completion with rejection
    const updatedStepCompletions = {
      ...assignment.stageCompletions,
      [resolvedParams.stepId]: {
        completed: true,
        completedDate: new Date().toISOString(),
        completedBy: assignment.employeeId,
        formData: {
          approved: false,
          comment: approvalComment,
          rejectedAt: new Date().toISOString(),
        },
      },
    }

    // Update assignment using setter
    setAssignment({
      ...assignment,
      stageCompletions: updatedStepCompletions,
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    })

    setTimeout(() => {
      setIsSubmitting(false)
      toast.success("Appraisal rejected")
      window.close()
    }, 1000)
  }

  if (!assignment || !template || !employee || !step) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p>Loading approval review...</p>
      </div>
    )
  }

  const isCompleted = assignment.stageCompletions[resolvedParams.stepId]?.completed
  const completionData = assignment.stageCompletions[resolvedParams.stepId]?.formData as
    | { approved?: boolean; comment?: string }
    | undefined

  // Get all completed review stages to show progress
  const completedStages = template.stages.filter(
    (s) => assignment.stageCompletions[s.id]?.completed
  )
  const totalStages = template.stages.length

  // Toggle step expansion
  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(stepId)) {
        newSet.delete(stepId)
      } else {
        newSet.add(stepId)
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Appraisal Approval</CardTitle>
                <CardDescription>
                  Review and approve the performance appraisal
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
                  <p className="text-xs text-muted-foreground">Review Cycle</p>
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
                  {completedStages.length} / {totalStages}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${(completedStages.length / totalStages) * 100}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
            {step.attendees && step.attendees.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Attendees</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {step.attendees.map((attendee) => (
                    <Badge key={attendee} variant="outline">
                      {attendee === "employee"
                        ? `${employee.firstName} ${employee.lastName}`
                        : attendee}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Review Stages with Expandable Details */}
        {completedStages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Completed Review Stages</CardTitle>
              <CardDescription>
                Click on a review stage to view details and form feedbacks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedStages.map((completedStage) => {
                  const completion = assignment.stageCompletions[completedStage.id]
                  const isExpanded = expandedSteps.has(completedStage.id)
                  const form = completedStage.evaluationFormId 
                    ? getEvaluationForm(completedStage.evaluationFormId)
                    : null
                  const formData = completion?.formData
                  
                  // Filter out approval-specific formData fields
                  const evaluationFormData = formData ? Object.fromEntries(
                    Object.entries(formData).filter(
                      ([key]) => !["approved", "comment", "approvedAt", "rejectedAt"].includes(key)
                    )
                  ) : undefined
                  
                  const hasFormData = evaluationFormData && Object.keys(evaluationFormData).length > 0
                  
                  return (
                    <div
                      key={completedStage.id}
                      className="border rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleStep(completedStage.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <IconChevronUp className="size-4 text-muted-foreground" />
                          ) : (
                            <IconChevronDown className="size-4 text-muted-foreground" />
                          )}
                          <div className="text-left">
                            <p className="text-sm font-medium">{completedStage.name}</p>
                            {completion?.completedDate && (
                              <p className="text-xs text-muted-foreground">
                                Completed on {format(
                                  new Date(completion.completedDate),
                                  "MMM dd, yyyy"
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        {form && hasFormData && (
                          <Badge variant="outline" className="text-xs">
                            Has Form Feedback
                          </Badge>
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="border-t bg-muted/30 p-4 space-y-4">
                          {/* Step Details */}
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground">
                              Step Details
                            </Label>
                            {completedStage.description && (
                              <p className="text-sm">{completedStage.description}</p>
                            )}
                            {completedStage.attendees && completedStage.attendees.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {completedStage.attendees.map((attendee) => (
                                  <Badge key={attendee} variant="outline" className="text-xs">
                                    {attendee === "employee"
                                      ? `${employee.firstName} ${employee.lastName}`
                                      : attendee}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Form Feedback */}
                          {form && hasFormData && (
                            <div className="space-y-3 pt-3 border-t">
                              <div className="flex items-center gap-2 mb-2">
                                <IconFileText className="size-4 text-muted-foreground" />
                                <Label className="text-xs font-semibold text-muted-foreground">
                                  Form: {form.name}
                                </Label>
                              </div>
                              <div className="space-y-3 pl-4 border-l-2 border-muted">
                                {form.fields.map((field) => {
                                  const fieldValue = evaluationFormData?.[field.id]
                                  if (fieldValue === undefined || fieldValue === null) return null
                                  
                                  const safeStringify = (value: unknown): string => {
                                    if (value === null || value === undefined) {
                                      return String(value)
                                    }
                                    if (typeof value === "object") {
                                      return JSON.stringify(value)
                                    }
                                    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                                      return String(value)
                                    }
                                    return JSON.stringify(value)
                                  }
                                  
                                  const renderFieldValue = () => {
                                    if (field.type === "rating" && typeof fieldValue === "number") {
                                      return (
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{fieldValue}</span>
                                          <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => {
                                              const starClassName = star <= fieldValue
                                                ? "text-yellow-500"
                                                : "text-muted-foreground"
                                              return (
                                                <span
                                                  key={star}
                                                  className={`text-sm ${starClassName}`}
                                                >
                                                  ★
                                                </span>
                                              )
                                            })}
                                          </div>
                                          {field.max && (
                                            <span className="text-xs text-muted-foreground">
                                              / {field.max}
                                            </span>
                                          )}
                                        </div>
                                      )
                                    }
                                    
                                    if (field.type === "checkbox" && Array.isArray(fieldValue)) {
                                      return (
                                        <div className="flex flex-wrap gap-2">
                                          {fieldValue.map((item, idx) => {
                                            const itemKey = `${field.id}-${idx}`
                                            return (
                                              <Badge key={itemKey} variant="outline" className="text-xs">
                                                {safeStringify(item)}
                                              </Badge>
                                            )
                                          })}
                                        </div>
                                      )
                                    }
                                    
                                    if (field.type === "textarea") {
                                      const displayValue = typeof fieldValue === "object" && fieldValue !== null
                                        ? JSON.stringify(fieldValue, null, 2)
                                        : safeStringify(fieldValue)
                                      return (
                                        <p className="whitespace-pre-wrap p-2 bg-background rounded text-xs">
                                          {displayValue}
                                        </p>
                                      )
                                    }
                                    
                                    return <p className="text-xs">{safeStringify(fieldValue)}</p>
                                  }
                                  
                                  return (
                                    <div key={field.id} className="text-sm">
                                      <div className="font-medium text-muted-foreground mb-1">
                                        {field.label}
                                      </div>
                                      <div className="text-foreground">
                                        {renderFieldValue()}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          
                          {form && !hasFormData && (
                            <div className="pt-3 border-t">
                              <p className="text-xs text-muted-foreground">
                                No form feedback available for this step
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approval Actions */}
        {!isCompleted && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Approval</CardTitle>
              <CardDescription>
                Review the appraisal details and provide your approval decision
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="comment">Comments (Optional)</Label>
                <Textarea
                  id="comment"
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="Add any comments or notes about this appraisal..."
                  className="min-h-24 mt-2"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Approval Details */}
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
              {assignment.stageCompletions[resolvedParams.stepId]?.completedDate && (
                <div>
                  <Label className="text-sm font-medium">Decision Date</Label>
                  <p className="text-sm mt-1">
                    {format(
                      new Date(
                        assignment.stageCompletions[resolvedParams.stepId]
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

        {/* Sticky Approval Action Bar */}
        {!isCompleted && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 p-4">
            <div className="max-w-4xl mx-auto space-y-3">
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="flex-1"
                  size="lg"
                >
                  <IconX className="size-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="flex-1"
                  size="lg"
                >
                  <IconThumbUp className="size-4 mr-2" />
                  {isSubmitting ? "Processing..." : "Approve"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
