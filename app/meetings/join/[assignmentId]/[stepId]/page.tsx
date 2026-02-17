"use client"

import * as React from "react"
import {
  IconUser,
  IconUsers,
  IconFileText,
  IconCalendar,
  IconVideo,
  IconClock,
  IconCheck,
  IconX,
  IconMicrophone,
  IconMicrophoneOff,
  IconVideoOff,
  IconPhoneOff,
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
  getEffectiveManagers,
} from "@/lib/workflow-data"
import { demoEmployees } from "@/lib/data/demo-employees"

export default function MeetingJoinPage({
  params,
}: {
  params: Promise<{ assignmentId: string; stepId: string }>
}) {
  const resolvedParams = React.use(params)

  const [assignment, setAssignment] = React.useState<typeof workflowAssignments[number] | null>(null)
  const [template, setTemplate] = React.useState<ReturnType<typeof getWorkflowTemplate> | null>(null)
  const [employee, setEmployee] = React.useState<ReturnType<typeof getEmployee> | null>(null)
  const [stage, setStage] = React.useState<NonNullable<ReturnType<typeof getWorkflowTemplate>>["stages"][number] | null>(null)
  const [managerName, setManagerName] = React.useState<string>("")
  const [meetingNotes, setMeetingNotes] = React.useState<string>("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isInMeeting, setIsInMeeting] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)
  const [isVideoOff, setIsVideoOff] = React.useState(false)

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

    const stageData = templateData.stages.find((s) => s.id === resolvedParams.stepId)
    if (!stageData) {
      toast.error("Review stage not found")
      return
    }

    setStage(stageData)

    const employeeData = getEmployee(assignmentData.employeeId)
    if (!employeeData) {
      toast.error("Employee not found")
      return
    }

    setEmployee(employeeData)

    // Get manager name from stage attendees - use effective managers (assignment overrides or employee's managers)
    const effectiveManagers = getEffectiveManagers(assignmentData)
    if (stageData.attendees && effectiveManagers.length > 0) {
      stageData.attendees.forEach((attendee) => {
        if (attendee.startsWith("manager_level_")) {
          const levelMatch = attendee.match(/manager_level_(\d+)/)
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

    // Load existing meeting notes if available
    const existingData = assignmentData.stageCompletions[resolvedParams.stepId]?.formData as
      | { meetingNotes?: string }
      | undefined
    if (existingData?.meetingNotes) {
      setMeetingNotes(existingData.meetingNotes)
    }
  }, [resolvedParams.assignmentId, resolvedParams.stepId])

  // Handle join meeting
  const handleJoinMeeting = () => {
    setIsInMeeting(true)
    toast.success("Meeting started")
    // In a real app, this would integrate with Zoom, Teams, etc.
  }

  // Handle end meeting
  const handleEndMeeting = () => {
    if (!assignment || !resolvedParams.stepId) {
      toast.error("Missing required information")
      return
    }

    if (!meetingNotes.trim()) {
      toast.error("Please add meeting notes before ending the meeting")
      return
    }

    setIsSubmitting(true)

    // Update stage completion
    assignment.stageCompletions[resolvedParams.stepId] = {
      completed: true,
      completedDate: new Date().toISOString(),
      completedBy: assignment.employeeId,
      formData: {
        meetingNotes,
        meetingEndedAt: new Date().toISOString(),
      },
    }

    // Update assignment status if all stages are completed
    if (template) {
      const allCompleted = template.stages.every(
        (stage) => assignment.stageCompletions[stage.id]?.completed
      )
      if (allCompleted) {
        assignment.status = "completed"
      } else {
        assignment.status = "in_progress"
      }
      assignment.updatedAt = new Date().toISOString()
    }

    setTimeout(() => {
      setIsSubmitting(false)
      setIsInMeeting(false)
      toast.success("Meeting completed successfully!")
      window.close()
    }, 1000)
  }

  // Handle cancel meeting
  const handleCancelMeeting = () => {
    setIsInMeeting(false)
    toast.info("Meeting cancelled")
  }

  if (!assignment || !template || !employee || !stage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p>Loading meeting...</p>
      </div>
    )
  }

  const isCompleted = assignment.stageCompletions[resolvedParams.stepId]?.completed
  const completionData = assignment.stageCompletions[resolvedParams.stepId]?.formData as
    | { meetingNotes?: string; meetingEndedAt?: string }
    | undefined

  // Get meeting attendees - use effective managers (assignment overrides or employee's managers)
  const effectiveManagers = getEffectiveManagers(assignment)
  const attendees: string[] = []
  if (stage.attendees) {
    stage.attendees.forEach((attendee) => {
      if (attendee === "employee") {
        attendees.push(`${employee.firstName} ${employee.lastName}`)
      } else if (attendee.startsWith("manager_level_") && effectiveManagers.length > 0) {
        const levelMatch = attendee.match(/manager_level_(\d+)/)
        if (levelMatch) {
          const level = Number.parseInt(levelMatch[1], 10)
          const manager = effectiveManagers.find((m) => m.level === level)
          if (manager) {
            if (manager.isExternal && manager.externalName) {
              attendees.push(manager.externalName)
            } else if (manager.employeeId) {
              const managerEmp = getEmployee(manager.employeeId)
              if (managerEmp) {
                attendees.push(`${managerEmp.firstName} ${managerEmp.lastName}`)
              }
            }
          }
        }
      }
    })
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Join Button */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl">Performance Review Meeting</CardTitle>
                <CardDescription>
                  Join the scheduled performance review meeting
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {!isCompleted && !isInMeeting && (
                  <Button
                    onClick={handleJoinMeeting}
                    size="lg"
                    className="shrink-0"
                  >
                    <IconVideo className="size-4 mr-2" />
                    Join Meeting
                  </Button>
                )}
                {isCompleted && (
                  <Badge variant="default" className="flex items-center gap-1 shrink-0">
                    <IconCheck className="size-3" />
                    Completed
                  </Badge>
                )}
              </div>
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

        {/* Meeting Details */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Meeting Name</Label>
              <p className="text-sm mt-1">{stage.name}</p>
            </div>
            {stage.description && (
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm mt-1">{stage.description}</p>
              </div>
            )}
            {attendees.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Attendees</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {attendees.map((attendee, idx) => (
                    <Badge key={idx} variant="outline">
                      {attendee}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {stage.reminderSettings && (
              <div className="flex items-center gap-2">
                <IconClock className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Reminder</p>
                  <p className="text-sm">
                    {stage.reminderSettings.reminderDays} days before meeting
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meeting Actions */}
        {!isCompleted && (
          <>
            {!isInMeeting ? (
              <Card>
                <CardHeader>
                  <CardTitle>Join Meeting</CardTitle>
                  <CardDescription>
                    Click the button below to join the performance review meeting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleJoinMeeting}
                    className="w-full"
                    size="lg"
                  >
                    <IconVideo className="size-4 mr-2" />
                    Join Meeting
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Demo Meeting Interface */}
                <Card>
                  <CardHeader>
                    <CardTitle>Meeting in Progress</CardTitle>
                    <CardDescription>
                      Performance review meeting with {employee.firstName} {employee.lastName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Video Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Employee Video */}
                      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border-2 border-primary">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="size-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                              <IconUser className="size-10 text-primary" />
                            </div>
                            <p className="text-sm font-medium">{employee.firstName} {employee.lastName}</p>
                            <p className="text-xs text-muted-foreground">Employee</p>
                          </div>
                        </div>
                        {isVideoOff && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <IconVideoOff className="size-8 text-white" />
                          </div>
                        )}
                        {isMuted && (
                          <div className="absolute bottom-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                            <IconMicrophoneOff className="size-3" />
                            Muted
                          </div>
                        )}
                      </div>

                      {/* Manager Video */}
                      {managerName && (
                        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border-2">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="size-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                <IconUsers className="size-10 text-primary" />
                              </div>
                              <p className="text-sm font-medium">{managerName}</p>
                              <p className="text-xs text-muted-foreground">Manager</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Meeting Controls */}
                    <div className="flex items-center justify-center gap-2 pt-4 border-t">
                      <Button
                        variant={isMuted ? "destructive" : "outline"}
                        size="icon"
                        onClick={() => setIsMuted(!isMuted)}
                        title={isMuted ? "Unmute" : "Mute"}
                      >
                        {isMuted ? (
                          <IconMicrophoneOff className="size-4" />
                        ) : (
                          <IconMicrophone className="size-4" />
                        )}
                      </Button>
                      <Button
                        variant={isVideoOff ? "destructive" : "outline"}
                        size="icon"
                        onClick={() => setIsVideoOff(!isVideoOff)}
                        title={isVideoOff ? "Turn on video" : "Turn off video"}
                      >
                        {isVideoOff ? (
                          <IconVideoOff className="size-4" />
                        ) : (
                          <IconVideo className="size-4" />
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={handleEndMeeting}
                        disabled={isSubmitting}
                        title="End meeting"
                      >
                        <IconPhoneOff className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Meeting Notes Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Meeting Notes</CardTitle>
                    <CardDescription>
                      Add notes about the discussion, action items, feedback, etc.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="meeting-notes">Notes</Label>
                      <Textarea
                        id="meeting-notes"
                        value={meetingNotes}
                        onChange={(e) => setMeetingNotes(e.target.value)}
                        placeholder="Add notes about the discussion, action items, feedback, etc..."
                        className="min-h-32 mt-2"
                      />
                    </div>
                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        onClick={handleCancelMeeting}
                        disabled={isSubmitting}
                        className="flex-1"
                      >
                        <IconX className="size-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleEndMeeting}
                        disabled={isSubmitting || !meetingNotes.trim()}
                        className="flex-1"
                      >
                        <IconCheck className="size-4 mr-2" />
                        {isSubmitting ? "Ending..." : "End Meeting"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}

        {/* Completed Meeting Details */}
        {isCompleted && completionData && (
          <Card>
            <CardHeader>
              <CardTitle>Meeting Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {completionData.meetingNotes && (
                <div>
                  <Label className="text-sm font-medium">Meeting Notes</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded whitespace-pre-wrap">
                    {completionData.meetingNotes}
                  </p>
                </div>
              )}
              {completionData.meetingEndedAt && (
                <div>
                  <Label className="text-sm font-medium">Meeting Ended</Label>
                  <p className="text-sm mt-1">
                    {format(
                      new Date(completionData.meetingEndedAt),
                      "MMM dd, yyyy 'at' h:mm a"
                    )}
                  </p>
                </div>
              )}
              {assignment.stageCompletions[resolvedParams.stepId]?.completedDate && (
                <div>
                  <Label className="text-sm font-medium">Completed Date</Label>
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
      </div>
    </div>
  )
}
