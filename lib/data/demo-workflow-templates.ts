import type { WorkflowTemplate } from "../types"

export const demoWorkflowTemplates: WorkflowTemplate[] = [
  // PROCEDURE TYPE 1: Simple Evaluation Meeting Procedure
  // Only consists of an evaluation meeting between employee and manager
  {
    id: "workflow-simple-meeting",
    name: "Quarterly Evaluation Meeting",
    description: "Simple quarterly evaluation procedure consisting of a single evaluation meeting between employee and their direct manager. No forms to fill - just a documented meeting discussion.",
    applicablePositions: [
      "Engineering Manager",
      "QA Manager", 
      "HR Manager",
      "Finance Manager",
      "Design Manager"
    ],
    applicableDepartments: [
      "Engineering",
      "QA",
      "HR",
      "Finance",
      "Design"
    ],
    stages: [
      {
        id: "stage-meeting-only",
        name: "Evaluation Meeting with Manager",
        description: "Direct one-on-one evaluation meeting between employee and their manager to discuss performance, achievements, challenges, and goals. Manager will document the meeting notes.",
        order: 1,
        type: "meeting",
        managerLevel: 1,
        evaluationFormId: "form-meeting-notes", // Manager fills this during/after meeting
        attendees: ["employee", "manager_level_1"],
        dueDateType: "on_interval",
        dueDateOffset: 0,
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 7,
          channels: ["email", "in-app"],
        },
      },
    ],
    meetingFrequencies: [],
    interval: {
      type: "quarterly", // Every 3 months
    },
    managerLevels: [1], // Only requires direct manager
    notificationSettings: {
      meetingReminderDays: 7,
      formReminderDays: 7,
      enabled: true,
      channels: ["email", "in-app"],
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // PROCEDURE TYPE 2: Complete Evaluation Process with Multiple Stages
  // Stage 1: Employee fills self-evaluation form
  // Stage 2: Meeting between employee and manager (level 1)
  // Stage 3: Manager (level 1) fills evaluation form
  // Stage 4: Manager (level 2) approval
  {
    id: "workflow-complete-evaluation",
    name: "Semi-Annual Performance Appraisal",
    description: "Comprehensive semi-annual performance appraisal process including employee self-evaluation, manager meeting, manager evaluation, and senior management approval.",
    applicablePositions: [
      "Senior Software Engineer",
      "Software Engineer",
      "Junior Software Engineer",
      "Senior QA Engineer",
      "QA Engineer",
      "HR Specialist",
      "Senior Financial Analyst",
      "Financial Analyst",
      "Senior UX Designer",
      "UI Designer",
      "Graphic Designer"
    ],
    applicableDepartments: [
      "Engineering",
      "QA",
      "HR",
      "Finance",
      "Design"
    ],
    stages: [
      // STAGE 1: Employee Self-Evaluation Form
      {
        id: "stage-employee-self-eval",
        name: "Employee Self-Evaluation",
        description: "Employee completes a comprehensive self-evaluation form assessing their performance, achievements, skills development, and goals for the review period.",
        order: 1,
        type: "evaluation",
        evaluationFormId: "form-employee-self",
        attendees: ["employee"], // Only employee fills this
        dueDateType: "before_interval",
        dueDateOffset: 1, // 1 week before the interval date
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 7, // Remind 7 days before due date
          channels: ["email", "in-app"],
        },
      },

      // STAGE 2: Evaluation Meeting (Employee + Manager Level 1)
      {
        id: "stage-evaluation-meeting",
        name: "Performance Discussion Meeting",
        description: "One-on-one meeting between employee and their direct manager to discuss the self-evaluation, performance, feedback, goals, and development opportunities.",
        order: 2,
        type: "meeting",
        managerLevel: 1,
        attendees: ["employee", "manager_level_1"], // Both employee and manager attend
        dueDateType: "on_interval",
        dueDateOffset: 0, // On the interval date
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 5, // Remind 5 days before
          channels: ["email", "in-app"],
        },
      },

      // STAGE 3: Manager Evaluation Form (Manager Level 1)
      {
        id: "stage-manager-evaluation",
        name: "Manager Evaluation",
        description: "Direct manager completes a comprehensive evaluation form rating the employee's performance across multiple criteria, providing feedback, and making recommendations.",
        order: 3,
        type: "evaluation",
        managerLevel: 1,
        evaluationFormId: "form-manager-evaluation",
        attendees: ["manager_level_1"], // Only manager level 1 fills this
        dueDateType: "after_interval",
        dueDateOffset: 1, // 1 week after the meeting
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 3, // Remind 3 days before due date
          channels: ["email", "in-app"],
        },
      },

      // STAGE 4: Senior Manager Approval (Manager Level 2)
      {
        id: "stage-senior-approval",
        name: "Senior Manager Approval",
        description: "Senior manager (Level 2) reviews the complete appraisal including employee self-evaluation and manager evaluation, then approves or provides feedback on ratings, recommendations, and compensation decisions.",
        order: 4,
        type: "approval",
        managerLevel: 2,
        evaluationFormId: "form-approval",
        attendees: ["manager_level_2"], // Only manager level 2 handles this
        dueDateType: "after_interval",
        dueDateOffset: 2, // 2 weeks after the meeting
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 5, // Remind 5 days before due date
          channels: ["email", "in-app"],
        },
      },
    ],
    meetingFrequencies: [],
    interval: {
      type: "biannually", // Every 6 months (twice a year)
    },
    managerLevels: [1, 2], // Requires both level 1 and level 2 managers
    notificationSettings: {
      meetingReminderDays: 7,
      formReminderDays: 7,
      enabled: true,
      channels: ["email", "in-app"],
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]
