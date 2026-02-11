import type { WorkflowTemplate } from "../types"

export const demoWorkflowTemplates: WorkflowTemplate[] = [
  // PROCEDURE TYPE 1: Simple Evaluation Meeting Procedure
  // Only consists of an evaluation meeting between employee and manager
  {
    id: "workflow-simple-meeting",
    name: "Quarterly Review Meeting",
    description: "Simple quarterly review procedure consisting of a single review meeting between employee and their direct manager. No forms to fill - just a documented meeting discussion.",
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
        name: "Review Meeting with Manager",
        description: "Direct one-on-one review meeting between employee and their manager to discuss performance, achievements, challenges, and goals. Manager will document the meeting notes.",
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
    description: "Comprehensive semi-annual performance appraisal process including employee self-review, manager meeting, manager review, and senior management approval.",
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
        name: "Employee Self-Review",
        description: "Employee completes a comprehensive self-review form assessing their performance, achievements, skills development, and goals for the review period.",
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

      // STAGE 2: Manager Evaluation Form (Manager Level 1)
      // Sent at the same time as employee evaluation form
      {
        id: "stage-manager-evaluation",
        name: "Manager Review",
        description: "Direct manager completes a comprehensive review form rating the employee's performance across multiple criteria, providing feedback, and making recommendations. This form is sent at the same time as the employee self-review form.",
        order: 2,
        type: "evaluation",
        managerLevel: 1,
        evaluationFormId: "form-manager-evaluation",
        attendees: ["manager_level_1"], // Only manager level 1 fills this
        dueDateType: "before_interval",
        dueDateOffset: 1, // 1 week before the interval date (same as employee form)
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 7, // Remind 7 days before due date
          channels: ["email", "in-app"],
        },
      },

      // STAGE 3: Evaluation Meeting (Employee + Manager Level 1)
      // This meeting requires both employee and manager evaluation forms to be completed
      {
        id: "stage-evaluation-meeting",
        name: "Performance Discussion Meeting",
        description: "One-on-one meeting between employee and their direct manager to discuss the self-review, performance, feedback, goals, and development opportunities. This meeting can only be scheduled after both the employee self-review and manager review forms are completed.",
        order: 3,
        type: "meeting",
        managerLevel: 1,
        attendees: ["employee", "manager_level_1"], // Both employee and manager attend
        dueDateType: "on_interval",
        dueDateOffset: 0, // On the interval date
        required: true,
        requiredStageIds: ["stage-employee-self-eval", "stage-manager-evaluation"], // Both evaluation forms must be completed before meeting
        reminderSettings: {
          enabled: true,
          reminderDays: 5, // Remind 5 days before
          channels: ["email", "in-app"],
        },
      },

      // STAGE 4: Senior Manager Approval (Manager Level 2)
      {
        id: "stage-senior-approval",
        name: "Senior Manager Approval",
        description: "Senior manager (Level 2) reviews the complete appraisal including employee self-review and manager review, then approves or provides feedback on ratings, recommendations, and compensation decisions.",
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

  // PROCEDURE TYPE 3: Monthly Check-in Procedure
  // Lightweight monthly check-in for quick feedback
  {
    id: "workflow-monthly-checkin",
    name: "Monthly Performance Check-in",
    description: "Lightweight monthly check-in procedure for regular feedback and goal tracking. Quick meeting format with minimal documentation.",
    applicablePositions: [
      "Software Engineer",
      "Junior Software Engineer",
      "QA Engineer",
      "Financial Analyst",
      "UI Designer",
      "Graphic Designer",
      "HR Specialist"
    ],
    applicableDepartments: [
      "Engineering",
      "QA",
      "Finance",
      "Design",
      "HR"
    ],
    stages: [
      {
        id: "stage-monthly-meeting",
        name: "Monthly Check-in Meeting",
        description: "Quick 30-minute check-in meeting between employee and manager to discuss progress, blockers, and immediate goals.",
        order: 1,
        type: "meeting",
        managerLevel: 1,
        evaluationFormId: "form-meeting-notes",
        attendees: ["employee", "manager_level_1"],
        dueDateType: "on_interval",
        dueDateOffset: 0,
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 3,
          channels: ["email", "in-app"],
        },
      },
    ],
    meetingFrequencies: [],
    interval: {
      type: "monthly",
    },
    managerLevels: [1],
    notificationSettings: {
      meetingReminderDays: 3,
      formReminderDays: 2,
      enabled: true,
      channels: ["email", "in-app"],
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // PROCEDURE TYPE 4: Annual Performance Review
  // Comprehensive annual review with multiple stages
  {
    id: "workflow-annual-review",
    name: "Annual Performance Review",
    description: "Comprehensive annual performance review process including self-evaluation, manager review, goal setting, and senior leadership approval.",
    applicablePositions: [
      "Senior Software Engineer",
      "Engineering Manager",
      "Senior QA Engineer",
      "QA Manager",
      "Senior Financial Analyst",
      "Finance Manager",
      "Senior UX Designer",
      "Design Manager",
      "HR Manager"
    ],
    applicableDepartments: [
      "Engineering",
      "QA",
      "Finance",
      "Design",
      "HR"
    ],
    stages: [
      {
        id: "stage-annual-employee-self",
        name: "Annual Self-Assessment",
        description: "Employee completes comprehensive annual self-assessment covering the entire year's performance, achievements, and development.",
        order: 1,
        type: "evaluation",
        evaluationFormId: "form-employee-self",
        attendees: ["employee"],
        dueDateType: "before_interval",
        dueDateOffset: 14, // 2 weeks before review date
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 14,
          channels: ["email", "in-app"],
        },
      },
      {
        id: "stage-annual-manager-review",
        name: "Manager Annual Review",
        description: "Manager completes comprehensive annual review form assessing employee's year-long performance, growth, and contributions.",
        order: 2,
        type: "evaluation",
        managerLevel: 1,
        evaluationFormId: "form-manager-evaluation",
        attendees: ["manager_level_1"],
        dueDateType: "before_interval",
        dueDateOffset: 7, // 1 week before review date
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 10,
          channels: ["email", "in-app"],
        },
      },
      {
        id: "stage-annual-meeting",
        name: "Annual Review Meeting",
        description: "Comprehensive annual review meeting to discuss performance, achievements, areas for improvement, and set goals for the upcoming year.",
        order: 3,
        type: "meeting",
        managerLevel: 1,
        attendees: ["employee", "manager_level_1"],
        dueDateType: "on_interval",
        dueDateOffset: 0,
        required: true,
        requiredStageIds: ["stage-annual-employee-self", "stage-annual-manager-review"],
        reminderSettings: {
          enabled: true,
          reminderDays: 7,
          channels: ["email", "in-app"],
        },
      },
      {
        id: "stage-annual-approval",
        name: "Senior Leadership Approval",
        description: "Senior leadership reviews and approves the annual performance review, including compensation decisions and promotion recommendations.",
        order: 4,
        type: "approval",
        managerLevel: 2,
        evaluationFormId: "form-approval",
        attendees: ["manager_level_2"],
        dueDateType: "after_interval",
        dueDateOffset: 7, // 1 week after meeting
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 5,
          channels: ["email", "in-app"],
        },
      },
    ],
    meetingFrequencies: [],
    interval: {
      type: "annually",
    },
    managerLevels: [1, 2],
    notificationSettings: {
      meetingReminderDays: 14,
      formReminderDays: 10,
      enabled: true,
      channels: ["email", "in-app"],
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // PROCEDURE TYPE 5: Probationary Review
  // For new employees during probation period
  {
    id: "workflow-probationary-review",
    name: "Probationary Period Review",
    description: "Review process for employees during their probationary period (typically 3-6 months). Includes assessment of fit, performance, and decision on permanent employment.",
    applicablePositions: [
      "Software Engineer",
      "Junior Software Engineer",
      "QA Engineer",
      "Financial Analyst",
      "UI Designer",
      "Graphic Designer",
      "HR Specialist"
    ],
    applicableDepartments: [
      "Engineering",
      "QA",
      "Finance",
      "Design",
      "HR"
    ],
    stages: [
      {
        id: "stage-probation-manager-review",
        name: "Manager Probation Assessment",
        description: "Manager completes assessment form evaluating the employee's performance, cultural fit, and readiness for permanent employment.",
        order: 1,
        type: "evaluation",
        managerLevel: 1,
        evaluationFormId: "form-manager-evaluation",
        attendees: ["manager_level_1"],
        dueDateType: "on_interval",
        dueDateOffset: 0,
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 7,
          channels: ["email", "in-app"],
        },
      },
      {
        id: "stage-probation-meeting",
        name: "Probation Review Meeting",
        description: "Meeting between employee and manager to discuss probation period performance, provide feedback, and communicate employment decision.",
        order: 2,
        type: "meeting",
        managerLevel: 1,
        attendees: ["employee", "manager_level_1"],
        dueDateType: "after_interval",
        dueDateOffset: 3, // 3 days after assessment
        required: true,
        requiredStageIds: ["stage-probation-manager-review"],
        reminderSettings: {
          enabled: true,
          reminderDays: 2,
          channels: ["email", "in-app"],
        },
      },
      {
        id: "stage-probation-approval",
        name: "HR & Senior Approval",
        description: "HR and senior management review the probation assessment and make final decision on permanent employment.",
        order: 3,
        type: "approval",
        managerLevel: 2,
        evaluationFormId: "form-approval",
        attendees: ["manager_level_2"],
        dueDateType: "after_interval",
        dueDateOffset: 7, // 1 week after meeting
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 3,
          channels: ["email", "in-app"],
        },
      },
    ],
    meetingFrequencies: [],
    interval: {
      type: "custom",
      value: 3,
      unit: "months",
    },
    managerLevels: [1, 2],
    notificationSettings: {
      meetingReminderDays: 5,
      formReminderDays: 5,
      enabled: true,
      channels: ["email", "in-app"],
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // PROCEDURE TYPE 6: Goal Setting & Review
  // Focused on goal setting and tracking
  {
    id: "workflow-goal-setting",
    name: "Goal Setting & Quarterly Review",
    description: "Quarterly goal setting and review process. Employees set goals at the beginning of the quarter and review progress at the end.",
    applicablePositions: [
      "Software Engineer",
      "Senior Software Engineer",
      "QA Engineer",
      "Senior QA Engineer",
      "Financial Analyst",
      "Senior Financial Analyst",
      "UI Designer",
      "Senior UX Designer"
    ],
    applicableDepartments: [
      "Engineering",
      "QA",
      "Finance",
      "Design"
    ],
    stages: [
      {
        id: "stage-goal-setting-employee",
        name: "Employee Goal Setting",
        description: "Employee sets SMART goals for the upcoming quarter, aligned with team and company objectives.",
        order: 1,
        type: "evaluation",
        evaluationFormId: "form-employee-self",
        attendees: ["employee"],
        dueDateType: "before_interval",
        dueDateOffset: 7, // 1 week before quarter start
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 7,
          channels: ["email", "in-app"],
        },
      },
      {
        id: "stage-goal-setting-manager",
        name: "Manager Goal Review",
        description: "Manager reviews and approves employee goals, ensuring alignment with team objectives and providing feedback.",
        order: 2,
        type: "review",
        managerLevel: 1,
        evaluationFormId: "form-manager-evaluation",
        attendees: ["manager_level_1"],
        dueDateType: "before_interval",
        dueDateOffset: 3, // 3 days before quarter start
        required: true,
        requiredStageIds: ["stage-goal-setting-employee"],
        reminderSettings: {
          enabled: true,
          reminderDays: 5,
          channels: ["email", "in-app"],
        },
      },
      {
        id: "stage-goal-review-meeting",
        name: "Goal Review Meeting",
        description: "Quarterly meeting to review goal progress, discuss achievements, challenges, and adjust goals if needed.",
        order: 3,
        type: "meeting",
        managerLevel: 1,
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
      type: "quarterly",
    },
    managerLevels: [1],
    notificationSettings: {
      meetingReminderDays: 7,
      formReminderDays: 5,
      enabled: true,
      channels: ["email", "in-app"],
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // PROCEDURE TYPE 7: Project Completion Review
  // For reviewing performance at the end of major projects
  {
    id: "workflow-project-review",
    name: "Project Completion Review",
    description: "Review process conducted at the completion of major projects to assess performance, lessons learned, and project outcomes.",
    applicablePositions: [
      "Software Engineer",
      "Senior Software Engineer",
      "QA Engineer",
      "Senior QA Engineer",
      "Senior UX Designer",
      "UI Designer"
    ],
    applicableDepartments: [
      "Engineering",
      "QA",
      "Design"
    ],
    stages: [
      {
        id: "stage-project-employee-reflection",
        name: "Project Reflection",
        description: "Employee reflects on their contribution to the project, lessons learned, and areas for improvement.",
        order: 1,
        type: "evaluation",
        evaluationFormId: "form-employee-self",
        attendees: ["employee"],
        dueDateType: "on_interval",
        dueDateOffset: 0,
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 5,
          channels: ["email", "in-app"],
        },
      },
      {
        id: "stage-project-manager-review",
        name: "Manager Project Assessment",
        description: "Manager assesses employee's performance on the project, contribution to team success, and project outcomes.",
        order: 2,
        type: "evaluation",
        managerLevel: 1,
        evaluationFormId: "form-manager-evaluation",
        attendees: ["manager_level_1"],
        dueDateType: "after_interval",
        dueDateOffset: 3, // 3 days after project completion
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 5,
          channels: ["email", "in-app"],
        },
      },
      {
        id: "stage-project-retrospective",
        name: "Project Retrospective Meeting",
        description: "Team retrospective meeting to discuss project outcomes, lessons learned, and improvements for future projects.",
        order: 3,
        type: "meeting",
        managerLevel: 1,
        attendees: ["employee", "manager_level_1"],
        dueDateType: "after_interval",
        dueDateOffset: 7, // 1 week after project completion
        required: true,
        requiredStageIds: ["stage-project-employee-reflection", "stage-project-manager-review"],
        reminderSettings: {
          enabled: true,
          reminderDays: 3,
          channels: ["email", "in-app"],
        },
      },
    ],
    meetingFrequencies: [],
    interval: {
      type: "custom",
      value: 6,
      unit: "months", // Typically triggered manually per project
    },
    managerLevels: [1],
    notificationSettings: {
      meetingReminderDays: 5,
      formReminderDays: 5,
      enabled: true,
      channels: ["email", "in-app"],
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // PROCEDURE TYPE 8: Skill Development Review
  // Focused on learning and development
  {
    id: "workflow-skill-development",
    name: "Skill Development Review",
    description: "Bi-annual review focused on skill development, learning progress, training completion, and career growth planning.",
    applicablePositions: [
      "Junior Software Engineer",
      "Software Engineer",
      "QA Engineer",
      "Financial Analyst",
      "UI Designer",
      "Graphic Designer"
    ],
    applicableDepartments: [
      "Engineering",
      "QA",
      "Finance",
      "Design"
    ],
    stages: [
      {
        id: "stage-skill-employee-assessment",
        name: "Learning & Development Self-Assessment",
        description: "Employee assesses their learning progress, skills acquired, training completed, and identifies areas for further development.",
        order: 1,
        type: "evaluation",
        evaluationFormId: "form-employee-self",
        attendees: ["employee"],
        dueDateType: "before_interval",
        dueDateOffset: 7, // 1 week before review
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 7,
          channels: ["email", "in-app"],
        },
      },
      {
        id: "stage-skill-manager-review",
        name: "Manager Development Review",
        description: "Manager reviews employee's learning progress, provides feedback on skill development, and recommends training opportunities.",
        order: 2,
        type: "evaluation",
        managerLevel: 1,
        evaluationFormId: "form-manager-evaluation",
        attendees: ["manager_level_1"],
        dueDateType: "before_interval",
        dueDateOffset: 3, // 3 days before review
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 5,
          channels: ["email", "in-app"],
        },
      },
      {
        id: "stage-skill-development-meeting",
        name: "Development Planning Meeting",
        description: "Meeting to discuss learning progress, set development goals, plan training activities, and create individual development plan.",
        order: 3,
        type: "meeting",
        managerLevel: 1,
        attendees: ["employee", "manager_level_1"],
        dueDateType: "on_interval",
        dueDateOffset: 0,
        required: true,
        requiredStageIds: ["stage-skill-employee-assessment", "stage-skill-manager-review"],
        reminderSettings: {
          enabled: true,
          reminderDays: 5,
          channels: ["email", "in-app"],
        },
      },
    ],
    meetingFrequencies: [],
    interval: {
      type: "biannually",
    },
    managerLevels: [1],
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

  // PROCEDURE TYPE 9: Weekly Stand-up Review
  // Very lightweight weekly check-in
  {
    id: "workflow-weekly-standup",
    name: "Weekly Stand-up Review",
    description: "Lightweight weekly stand-up procedure for quick progress updates, blocker identification, and team alignment. Minimal documentation required.",
    applicablePositions: [
      "Software Engineer",
      "Junior Software Engineer",
      "QA Engineer"
    ],
    applicableDepartments: [
      "Engineering",
      "QA"
    ],
    stages: [
      {
        id: "stage-weekly-standup",
        name: "Weekly Stand-up Meeting",
        description: "Brief weekly stand-up meeting (15-30 minutes) to discuss progress, blockers, and upcoming tasks. Manager documents key points.",
        order: 1,
        type: "meeting",
        managerLevel: 1,
        evaluationFormId: "form-meeting-notes",
        attendees: ["employee", "manager_level_1"],
        dueDateType: "on_interval",
        dueDateOffset: 0,
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 1,
          channels: ["email", "in-app"],
        },
      },
    ],
    meetingFrequencies: [],
    interval: {
      type: "weekly",
    },
    managerLevels: [1],
    notificationSettings: {
      meetingReminderDays: 1,
      formReminderDays: 1,
      enabled: true,
      channels: ["email", "in-app"],
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // PROCEDURE TYPE 10: Promotion Review Process
  // For employees being considered for promotion
  {
    id: "workflow-promotion-review",
    name: "Promotion Review Process",
    description: "Comprehensive review process for employees being considered for promotion. Includes performance assessment, skill evaluation, and leadership potential review.",
    applicablePositions: [
      "Software Engineer",
      "Senior Software Engineer",
      "QA Engineer",
      "Senior QA Engineer",
      "Financial Analyst",
      "Senior Financial Analyst",
      "UI Designer",
      "Senior UX Designer"
    ],
    applicableDepartments: [
      "Engineering",
      "QA",
      "Finance",
      "Design"
    ],
    stages: [
      {
        id: "stage-promotion-employee-application",
        name: "Promotion Application",
        description: "Employee submits application for promotion, including self-assessment of readiness, achievements, and justification for promotion.",
        order: 1,
        type: "evaluation",
        evaluationFormId: "form-employee-self",
        attendees: ["employee"],
        dueDateType: "on_interval",
        dueDateOffset: 0,
        required: true,
        reminderSettings: {
          enabled: true,
          reminderDays: 7,
          channels: ["email", "in-app"],
        },
      },
      {
        id: "stage-promotion-manager-assessment",
        name: "Manager Promotion Assessment",
        description: "Direct manager completes comprehensive assessment of employee's readiness for promotion, including performance, skills, and leadership potential.",
        order: 2,
        type: "evaluation",
        managerLevel: 1,
        evaluationFormId: "form-manager-evaluation",
        attendees: ["manager_level_1"],
        dueDateType: "after_interval",
        dueDateOffset: 7, // 1 week after application
        required: true,
        requiredStageIds: ["stage-promotion-employee-application"],
        reminderSettings: {
          enabled: true,
          reminderDays: 7,
          channels: ["email", "in-app"],
        },
      },
      {
        id: "stage-promotion-panel-review",
        name: "Promotion Panel Review",
        description: "Senior management panel reviews promotion application and manager assessment, conducts additional evaluation if needed.",
        order: 3,
        type: "review",
        managerLevel: 2,
        evaluationFormId: "form-approval",
        attendees: ["manager_level_2"],
        dueDateType: "after_interval",
        dueDateOffset: 14, // 2 weeks after manager assessment
        required: true,
        requiredStageIds: ["stage-promotion-manager-assessment"],
        reminderSettings: {
          enabled: true,
          reminderDays: 5,
          channels: ["email", "in-app"],
        },
      },
      {
        id: "stage-promotion-decision-meeting",
        name: "Promotion Decision Meeting",
        description: "Meeting with employee to communicate promotion decision, discuss new role expectations, and set goals for transition.",
        order: 4,
        type: "meeting",
        managerLevel: 1,
        attendees: ["employee", "manager_level_1"],
        dueDateType: "after_interval",
        dueDateOffset: 21, // 3 weeks after application
        required: true,
        requiredStageIds: ["stage-promotion-panel-review"],
        reminderSettings: {
          enabled: true,
          reminderDays: 3,
          channels: ["email", "in-app"],
        },
      },
    ],
    meetingFrequencies: [],
    interval: {
      type: "custom",
      value: 12,
      unit: "months", // Typically triggered manually when promotion is considered
    },
    managerLevels: [1, 2],
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
