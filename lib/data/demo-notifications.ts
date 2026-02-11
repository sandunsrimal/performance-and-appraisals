import type { Notification } from "../types"

// Demo notifications for testing and demonstration
// These are sample notifications that can be used alongside dynamically generated ones
export const demoNotifications: Notification[] = [
  {
    id: "demo-notif-1",
    userId: "eng-employee-1", // Sandun Srimal
    category: "evaluation_pending",
    title: "Review Form Pending",
    message: "Your self-evaluation review form is due in 3 days",
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    link: "/forms/fill/form-employee-self-eval?assignmentId=assignment-1&stageId=stage-employee-self-eval",
    metadata: {
      assignmentId: "assignment-1",
      stageId: "stage-employee-self-eval",
      employeeId: "eng-employee-1",
      formId: "form-employee-self-eval",
    },
  },
  {
    id: "demo-notif-2",
    userId: "eng-manager-1", // Rajitha Wickramasinghe
    category: "action_required",
    title: "Action Required - Review Overdue",
    message: "Manager review for Sandun Srimal is overdue",
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    link: "/forms/fill/form-manager-evaluation?assignmentId=assignment-1&stageId=stage-manager-evaluation",
    metadata: {
      assignmentId: "assignment-1",
      stageId: "stage-manager-evaluation",
      employeeId: "eng-employee-1",
      formId: "form-manager-evaluation",
    },
  },
  {
    id: "demo-notif-3",
    userId: "eng-employee-1",
    category: "evaluation_completed",
    title: "Review Form Completed",
    message: "Your self-evaluation review has been completed",
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    link: "/appraisals?assignmentId=assignment-1",
    metadata: {
      assignmentId: "assignment-1",
      stageId: "stage-employee-self-eval",
      employeeId: "eng-employee-1",
    },
  },
  {
    id: "demo-notif-4",
    userId: "eng-manager-1",
    category: "evaluation_pending",
    title: "Review Form Pending",
    message: "Manager review for Kamal Perera is due in 5 days",
    read: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    link: "/forms/fill/form-manager-evaluation?assignmentId=assignment-2&stageId=stage-manager-evaluation",
    metadata: {
      assignmentId: "assignment-2",
      stageId: "stage-manager-evaluation",
      employeeId: "eng-employee-2",
      formId: "form-manager-evaluation",
    },
  },
  {
    id: "demo-notif-5",
    userId: "eng-employee-2", // Kamal Perera
    category: "action_required",
    title: "Action Required - Dependencies",
    message: "Performance Discussion Meeting cannot proceed until prerequisite steps are completed",
    read: false,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    link: "/appraisals?assignmentId=assignment-2",
    metadata: {
      assignmentId: "assignment-2",
      stageId: "stage-performance-discussion",
      employeeId: "eng-employee-2",
    },
  },
  {
    id: "demo-notif-6",
    userId: "eng-employee-1",
    category: "assignment_created",
    title: "New Procedure Assigned",
    message: "A new Complete Employee Evaluation has been assigned to you",
    read: false,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    link: "/appraisals?assignmentId=assignment-1",
    metadata: {
      assignmentId: "assignment-1",
      employeeId: "eng-employee-1",
    },
  },
  {
    id: "demo-notif-7",
    userId: "eng-manager-1",
    category: "stage_completed",
    title: "Step Completed",
    message: "Self-evaluation review step has been completed for Sandun Srimal",
    read: true,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    link: "/appraisals?assignmentId=assignment-1",
    metadata: {
      assignmentId: "assignment-1",
      stageId: "stage-employee-self-eval",
      employeeId: "eng-employee-1",
    },
  },
  {
    id: "demo-notif-8",
    userId: "admin-1", // Nimali Perera
    category: "form_overdue",
    title: "Form Overdue",
    message: "Self-evaluation review for Sandun Srimal is overdue by 2 days",
    read: false,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    link: "/appraisals?assignmentId=assignment-1",
    metadata: {
      assignmentId: "assignment-1",
      stageId: "stage-employee-self-eval",
      employeeId: "eng-employee-1",
    },
  },
  {
    id: "demo-notif-9",
    userId: "eng-employee-1",
    category: "meeting_scheduled",
    title: "Meeting Scheduled",
    message: "Performance Discussion Meeting has been scheduled for next week",
    read: false,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    link: "/meetings/join/assignment-1/stage-performance-discussion",
    metadata: {
      assignmentId: "assignment-1",
      stageId: "stage-performance-discussion",
      employeeId: "eng-employee-1",
      meetingId: "meeting-1",
    },
  },
  {
    id: "demo-notif-10",
    userId: "eng-manager-1",
    category: "meeting_reminder",
    title: "Meeting Reminder",
    message: "Performance Discussion Meeting with Sandun Srimal is scheduled in 2 days",
    read: false,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    link: "/meetings/join/assignment-1/stage-performance-discussion",
    metadata: {
      assignmentId: "assignment-1",
      stageId: "stage-performance-discussion",
      employeeId: "eng-employee-1",
      meetingId: "meeting-1",
    },
  },
  {
    id: "demo-notif-11",
    userId: "eng-employee-2",
    category: "form_due",
    title: "Form Due Soon",
    message: "Your self-evaluation review form is due in 2 days",
    read: false,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
    link: "/forms/fill/form-employee-self-eval?assignmentId=assignment-2&stageId=stage-employee-self-eval",
    metadata: {
      assignmentId: "assignment-2",
      stageId: "stage-employee-self-eval",
      employeeId: "eng-employee-2",
      formId: "form-employee-self-eval",
    },
  },
  {
    id: "demo-notif-12",
    userId: "admin-1",
    category: "system",
    title: "System Notification",
    message: "New procedure template 'Quarterly Review' has been created",
    read: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    link: "/procedures",
    metadata: {},
  },
]
