// Shared workflow data store
// In a real app, this would be replaced with API calls or a database

import type {
  WorkflowTemplate,
  WorkflowAssignment,
  EvaluationForm,
  Employee,
} from "./types"

// In-memory data stores (would be replaced with API/database in production)
export let workflowTemplates: WorkflowTemplate[] = []
export let workflowAssignments: WorkflowAssignment[] = []
export let evaluationForms: EvaluationForm[] = []
export let employees: Employee[] = []

// Initialize with sample data
export function initializeWorkflowData(initialEmployees: Employee[] = []) {
  // Ensure employees array is initialized
  if (!initialEmployees || !Array.isArray(initialEmployees)) {
    employees = []
    workflowAssignments = []
    return
  }
  
  employees = initialEmployees || []
  
  // Generate workflow assignments based on employees' assigned procedures
  workflowAssignments = []
  const now = new Date()
  
  initialEmployees.forEach((employee) => {
    if (employee.assignedWorkflowIds && employee.assignedWorkflowIds.length > 0) {
      employee.assignedWorkflowIds.forEach((workflowId, index) => {
        const template = workflowTemplates.find((t) => t.id === workflowId)
        if (!template) return
        
        // Calculate dates based on interval
        const startDate = new Date(now)
        startDate.setMonth(startDate.getMonth() - index) // Stagger assignments
        
        let endDate: Date | undefined
        const interval = template.interval
        
        switch (interval.type) {
          case "quarterly":
            endDate = new Date(startDate)
            endDate.setMonth(endDate.getMonth() + 3)
            break
          case "monthly":
            endDate = new Date(startDate)
            endDate.setMonth(endDate.getMonth() + 1)
            break
          case "annually":
            endDate = new Date(startDate)
            endDate.setFullYear(endDate.getFullYear() + 1)
            break
          case "biannually":
            endDate = new Date(startDate)
            endDate.setMonth(endDate.getMonth() + 6)
            break
          case "biweekly":
            endDate = new Date(startDate)
            endDate.setDate(endDate.getDate() + 14)
            break
          case "weekly":
            endDate = new Date(startDate)
            endDate.setDate(endDate.getDate() + 7)
            break
          case "daily":
            endDate = new Date(startDate)
            endDate.setDate(endDate.getDate() + 1)
            break
          case "custom":
            endDate = interval.value && interval.unit
              ? (() => {
                  const customEnd = new Date(startDate)
                  if (interval.unit === "days") customEnd.setDate(customEnd.getDate() + interval.value)
                  else if (interval.unit === "weeks") customEnd.setDate(customEnd.getDate() + interval.value * 7)
                  else if (interval.unit === "months") customEnd.setMonth(customEnd.getMonth() + interval.value)
                  else if (interval.unit === "years") customEnd.setFullYear(customEnd.getFullYear() + interval.value)
                  return customEnd
                })()
              : undefined
            break
        }
        
        // Determine status based on dates
        let status: "not_started" | "in_progress" | "completed" | "cancelled" = "not_started"
        if (endDate && endDate < now) {
          status = Math.random() > 0.3 ? "completed" : "in_progress" // Mix of completed and in progress
        } else if (startDate <= now) {
          status = Math.random() > 0.2 ? "in_progress" : "not_started"
        }
        
        // If employee is inactive, mark as cancelled
        if (employee.status === "Inactive" && status !== "completed") {
          status = "cancelled"
        }
        
        // Initialize step completions
        const stepCompletions: Record<string, { completed: boolean; completedDate?: string; completedBy?: string; formData?: Record<string, unknown> }> = {}
        template.steps.forEach((step) => {
          const isCompleted = status === "completed" || (status === "in_progress" && Math.random() > 0.5)
          stepCompletions[step.id] = {
            completed: isCompleted,
            completedDate: isCompleted ? new Date(startDate.getTime() + Math.random() * (endDate ? endDate.getTime() - startDate.getTime() : 0)).toISOString() : undefined,
            completedBy: step.attendees?.includes("employee") ? employee.id : undefined,
            formData: isCompleted && step.evaluationFormId ? {
              "field-1": Math.floor(Math.random() * 3) + 3, // Rating between 3-5
            } : undefined,
          }
        })
        
        // Find current step (first incomplete step)
        const currentStep = template.steps.find((step) => !stepCompletions[step.id]?.completed)
        
        const assignment: WorkflowAssignment = {
          id: `assignment-${employee.id}-${workflowId}-${index}`,
          workflowTemplateId: workflowId,
          employeeId: employee.id,
          status,
          startDate: startDate.toISOString(),
          endDate: endDate?.toISOString(),
          currentStepId: currentStep?.id,
          stepCompletions,
          meetings: [],
          createdAt: startDate.toISOString(),
          updatedAt: status === "completed" && endDate ? endDate.toISOString() : now.toISOString(),
        }
        
        workflowAssignments.push(assignment)
      })
    }
  })
  
  // Sample evaluation forms - Comprehensive Demo Forms
  evaluationForms = [
    // Form 1: Employee Self-Evaluation (for Software Engineers)
    {
      id: "form-1",
      name: "Employee Self-Evaluation Form",
      description: "Comprehensive self-evaluation form for employees to assess their own performance, achievements, and goals",
      fields: [
        {
          id: "field-1",
          label: "Overall Performance Rating",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Rate your overall performance from 1 (Needs Improvement) to 5 (Exceeds Expectations)",
        },
        {
          id: "field-2",
          label: "Key Achievements",
          type: "textarea",
          required: true,
          placeholder: "List your key achievements, completed projects, and significant contributions during this period",
        },
        {
          id: "field-3",
          label: "Technical Skills Development",
          type: "textarea",
          required: true,
          placeholder: "Describe new skills learned, certifications obtained, or technical growth",
        },
        {
          id: "field-4",
          label: "Goals Accomplished",
          type: "checkbox",
          required: false,
          options: ["Completed all assigned tasks", "Met project deadlines", "Exceeded performance targets", "Contributed to team success", "Improved processes"],
        },
        {
          id: "field-5",
          label: "Challenges Faced",
          type: "textarea",
          required: false,
          placeholder: "Describe any challenges or obstacles encountered and how you addressed them",
        },
        {
          id: "field-6",
          label: "Areas for Improvement",
          type: "textarea",
          required: true,
          placeholder: "Identify areas where you would like to improve or develop further",
        },
        {
          id: "field-7",
          label: "Career Goals",
          type: "textarea",
          required: false,
          placeholder: "Share your career aspirations and goals for the next period",
        },
        {
          id: "field-8",
          label: "Additional Comments",
          type: "textarea",
          required: false,
          placeholder: "Any additional comments or feedback",
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // Form 2: Manager Review Form
    {
      id: "form-2",
      name: "Manager Performance Review Form",
      description: "Form for managers to evaluate employee performance, provide feedback, and make recommendations",
      fields: [
        {
          id: "field-9",
          label: "Performance Rating",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Rate employee's overall performance (1 = Needs Improvement, 5 = Exceeds Expectations)",
        },
        {
          id: "field-10",
          label: "Job Knowledge & Skills",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Assess employee's technical knowledge and job-related skills",
        },
        {
          id: "field-11",
          label: "Quality of Work",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Evaluate the quality and accuracy of work produced",
        },
        {
          id: "field-12",
          label: "Communication Skills",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Assess communication effectiveness with team and stakeholders",
        },
        {
          id: "field-13",
          label: "Teamwork & Collaboration",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Evaluate ability to work effectively in a team",
        },
        {
          id: "field-14",
          label: "Strengths",
          type: "textarea",
          required: true,
          placeholder: "List employee's key strengths and positive attributes",
        },
        {
          id: "field-15",
          label: "Development Areas",
          type: "textarea",
          required: true,
          placeholder: "Identify areas for improvement and development opportunities",
        },
        {
          id: "field-16",
          label: "Recommendation",
          type: "dropdown",
          required: true,
          options: ["Promote", "Retain", "Develop", "Monitor", "Needs Improvement"],
        },
        {
          id: "field-17",
          label: "Development Plan",
          type: "textarea",
          required: false,
          placeholder: "Outline specific development goals and action items for the next period",
        },
        {
          id: "field-18",
          label: "Additional Comments",
          type: "textarea",
          required: false,
          placeholder: "Any additional feedback or comments",
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // Form 3: Probationary Review Form
    {
      id: "form-3",
      name: "Probationary Review Form",
      description: "Form for evaluating new employees during their probationary period",
      fields: [
        {
          id: "field-19",
          label: "Onboarding Progress",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Rate how well the employee has adapted and completed onboarding",
        },
        {
          id: "field-20",
          label: "Learning & Adaptability",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Assess ability to learn new skills and adapt to the role",
        },
        {
          id: "field-21",
          label: "Initial Contributions",
          type: "textarea",
          required: true,
          placeholder: "Describe the employee's contributions and work completed so far",
        },
        {
          id: "field-22",
          label: "Areas of Concern",
          type: "textarea",
          required: false,
          placeholder: "Any concerns or areas that need attention",
        },
        {
          id: "field-23",
          label: "Recommendation",
          type: "dropdown",
          required: true,
          options: ["Confirm Employment", "Extend Probation", "Terminate"],
        },
        {
          id: "field-24",
          label: "Manager Comments",
          type: "textarea",
          required: true,
          placeholder: "Overall assessment and recommendation rationale",
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // Form 4: Manager Annual Self-Assessment
    {
      id: "form-4",
      name: "Manager Annual Self-Assessment",
      description: "Comprehensive self-assessment form for managers covering leadership, team management, and strategic contributions",
      fields: [
        {
          id: "field-25",
          label: "Leadership Effectiveness",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Rate your effectiveness as a leader",
        },
        {
          id: "field-26",
          label: "Team Management",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Assess your team management and development capabilities",
        },
        {
          id: "field-27",
          label: "Strategic Contributions",
          type: "textarea",
          required: true,
          placeholder: "Describe your strategic contributions to the organization",
        },
        {
          id: "field-28",
          label: "Team Achievements",
          type: "textarea",
          required: true,
          placeholder: "Highlight key achievements of your team",
        },
        {
          id: "field-29",
          label: "Challenges & Solutions",
          type: "textarea",
          required: true,
          placeholder: "Describe major challenges faced and how you addressed them",
        },
        {
          id: "field-30",
          label: "Professional Development",
          type: "textarea",
          required: false,
          placeholder: "Describe your own professional development and growth",
        },
        {
          id: "field-31",
          label: "Future Goals",
          type: "textarea",
          required: true,
          placeholder: "Outline your goals and objectives for the coming year",
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // Form 5: Team Feedback Form (360-degree)
    {
      id: "form-5",
      name: "Team Feedback Form",
      description: "360-degree feedback form for collecting input from team members and peers",
      fields: [
        {
          id: "field-32",
          label: "Leadership & Direction",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Rate the manager's leadership and ability to provide clear direction",
        },
        {
          id: "field-33",
          label: "Communication",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Assess communication effectiveness",
        },
        {
          id: "field-34",
          label: "Support & Development",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Rate how well the manager supports team member development",
        },
        {
          id: "field-35",
          label: "Strengths",
          type: "textarea",
          required: true,
          placeholder: "What are the manager's key strengths?",
        },
        {
          id: "field-36",
          label: "Areas for Improvement",
          type: "textarea",
          required: true,
          placeholder: "What areas could the manager improve?",
        },
        {
          id: "field-37",
          label: "Additional Feedback",
          type: "textarea",
          required: false,
          placeholder: "Any additional comments or suggestions",
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // Form 6: Executive Self-Assessment
    {
      id: "form-6",
      name: "Executive Self-Assessment",
      description: "Comprehensive self-assessment form for senior executives covering strategic initiatives, leadership, and business impact",
      fields: [
        {
          id: "field-38",
          label: "Strategic Vision & Execution",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Rate your effectiveness in setting and executing strategic vision",
        },
        {
          id: "field-39",
          label: "Business Impact",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Assess the impact of your initiatives on business results",
        },
        {
          id: "field-40",
          label: "Key Strategic Initiatives",
          type: "textarea",
          required: true,
          placeholder: "Describe the major strategic initiatives you led or contributed to",
        },
        {
          id: "field-41",
          label: "Business Results",
          type: "textarea",
          required: true,
          placeholder: "Quantify business results, metrics, and achievements",
        },
        {
          id: "field-42",
          label: "Leadership & Team Building",
          type: "textarea",
          required: true,
          placeholder: "Describe your leadership approach and team building efforts",
        },
        {
          id: "field-43",
          label: "Stakeholder Management",
          type: "textarea",
          required: true,
          placeholder: "Describe your effectiveness in managing key stakeholders",
        },
        {
          id: "field-44",
          label: "Innovation & Transformation",
          type: "textarea",
          required: false,
          placeholder: "Describe innovative approaches or transformation initiatives",
        },
        {
          id: "field-45",
          label: "Future Strategic Priorities",
          type: "textarea",
          required: true,
          placeholder: "Outline your strategic priorities and objectives for the coming period",
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // Form 7: Stakeholder Feedback Form
    {
      id: "form-7",
      name: "Stakeholder Feedback Form",
      description: "Form for collecting feedback from board members, peers, and key stakeholders about executive performance",
      fields: [
        {
          id: "field-46",
          label: "Strategic Leadership",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Rate the executive's strategic leadership capabilities",
        },
        {
          id: "field-47",
          label: "Business Acumen",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Assess understanding of business and market dynamics",
        },
        {
          id: "field-48",
          label: "Decision Making",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Rate quality and timeliness of decisions",
        },
        {
          id: "field-49",
          label: "Communication & Influence",
          type: "rating",
          required: true,
          min: 1,
          max: 5,
          helpText: "Assess ability to communicate and influence stakeholders",
        },
        {
          id: "field-50",
          label: "Strengths",
          type: "textarea",
          required: true,
          placeholder: "What are the executive's key strengths?",
        },
        {
          id: "field-51",
          label: "Development Areas",
          type: "textarea",
          required: true,
          placeholder: "What areas could benefit from development?",
        },
        {
          id: "field-52",
          label: "Overall Assessment",
          type: "textarea",
          required: true,
          placeholder: "Provide your overall assessment of the executive's performance",
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  // Sample workflow templates - 4 Real-World Scenarios
  workflowTemplates = [
    // Scenario 1: Software Engineer Quarterly Appraisal
    {
      id: "workflow-1",
      name: "Software Engineer Quarterly Appraisal",
      description: "Standard quarterly performance review for software engineers. Includes self-evaluation, manager review, and feedback meeting.",
      applicablePositions: ["Software Engineer", "Senior Software Engineer"],
      applicableDepartments: ["Engineering"],
      steps: [
        {
          id: "step-1",
          name: "Employee Self Evaluation",
          description: "Employee fills out self-evaluation form covering achievements, challenges, and goals",
          order: 1,
          type: "evaluation",
          evaluationFormId: "form-1",
          attendees: ["employee"],
          dueDateType: "before_interval",
          dueDateOffset: 1,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 7,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-2",
          name: "Manager Level 1 Review",
          description: "Direct manager reviews employee's self-evaluation and provides initial feedback",
          order: 2,
          type: "review",
          managerLevel: 1,
          evaluationFormId: "form-2",
          attendees: ["manager_level_1"],
          dueDateType: "on_interval",
          dueDateOffset: 0,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 3,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-3",
          name: "Employee Meeting with Manager Level 1",
          description: "One-on-one meeting between employee and direct manager to discuss performance",
          order: 3,
          type: "meeting",
          managerLevel: 1,
          attendees: ["employee", "manager_level_1"],
          dueDateType: "after_interval",
          dueDateOffset: 1,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 7,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-4",
          name: "Manager Level 1 Evaluation Form",
          description: "Manager completes evaluation form after the meeting",
          order: 4,
          type: "evaluation",
          managerLevel: 1,
          evaluationFormId: "form-2",
          attendees: ["manager_level_1"],
          dueDateType: "after_interval",
          dueDateOffset: 1,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 3,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-5",
          name: "Manager Level 2 Final Review",
          description: "Senior manager reviews and approves the appraisal",
          order: 5,
          type: "approval",
          managerLevel: 2,
          attendees: ["manager_level_2"],
          dueDateType: "after_interval",
          dueDateOffset: 2,
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
        type: "quarterly",
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
    // Scenario 2: Manager Annual Appraisal
    {
      id: "workflow-2",
      name: "Manager Annual Performance Review",
      description: "Comprehensive annual performance review for managers. Includes 360-degree feedback and multi-level approvals.",
      applicablePositions: ["Engineering Manager", "Marketing Manager", "HR Manager", "Finance Manager", "Operations Manager"],
      applicableDepartments: ["Engineering", "Marketing", "HR", "Finance", "Operations"],
      steps: [
        {
          id: "step-6",
          name: "Manager Self Assessment",
          description: "Manager completes comprehensive self-assessment covering leadership, team management, and strategic contributions",
          order: 1,
          type: "evaluation",
          evaluationFormId: "form-4",
          attendees: ["employee"],
          dueDateType: "before_interval",
          dueDateOffset: 2,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 14,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-7",
          name: "Team Feedback Collection",
          description: "Collect feedback from direct reports and peers",
          order: 2,
          type: "evaluation",
          evaluationFormId: "form-5",
          attendees: ["employee"],
          dueDateType: "before_interval",
          dueDateOffset: 1,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 7,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-8",
          name: "Manager Level 1 Review",
          description: "Direct manager reviews all feedback and performance data",
          order: 3,
          type: "review",
          managerLevel: 1,
          evaluationFormId: "form-2",
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
          id: "step-9",
          name: "Performance Discussion Meeting",
          description: "Comprehensive performance discussion meeting with direct manager",
          order: 4,
          type: "meeting",
          managerLevel: 1,
          attendees: ["employee", "manager_level_1"],
          dueDateType: "after_interval",
          dueDateOffset: 1,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 7,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-10",
          name: "Manager Level 1 Evaluation",
          description: "Direct manager completes final evaluation form",
          order: 5,
          type: "evaluation",
          managerLevel: 1,
          evaluationFormId: "form-2",
          attendees: ["manager_level_1"],
          dueDateType: "after_interval",
          dueDateOffset: 1,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 5,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-11",
          name: "Manager Level 2 Approval",
          description: "Senior manager reviews and approves the annual appraisal",
          order: 6,
          type: "approval",
          managerLevel: 2,
          attendees: ["manager_level_2"],
          dueDateType: "after_interval",
          dueDateOffset: 2,
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
        meetingReminderDays: 7,
        formReminderDays: 7,
        enabled: true,
        channels: ["email", "in-app"],
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // Scenario 3: New Employee Probationary Review
    {
      id: "workflow-3",
      name: "New Employee Probationary Review",
      description: "Monthly reviews for new employees during probationary period. Focuses on onboarding progress and early performance feedback.",
      applicablePositions: ["Software Engineer", "Marketing Specialist", "HR Coordinator", "Sales Representative"],
      applicableDepartments: ["Engineering", "Marketing", "HR", "Sales"],
      steps: [
        {
          id: "step-12",
          name: "Employee Progress Update",
          description: "New employee provides update on onboarding progress, learning achievements, and initial contributions",
          order: 1,
          type: "evaluation",
          evaluationFormId: "form-1",
          attendees: ["employee"],
          dueDateType: "before_interval",
          dueDateOffset: 1,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 3,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-13",
          name: "Manager Level 1 Review",
          description: "Direct manager reviews employee's progress and provides feedback",
          order: 2,
          type: "review",
          managerLevel: 1,
          evaluationFormId: "form-3",
          attendees: ["manager_level_1"],
          dueDateType: "on_interval",
          dueDateOffset: 0,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 2,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-14",
          name: "Probationary Review Meeting",
          description: "Meeting to discuss progress, address concerns, and set expectations",
          order: 3,
          type: "meeting",
          managerLevel: 1,
          attendees: ["employee", "manager_level_1"],
          dueDateType: "after_interval",
          dueDateOffset: 1,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 3,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-15",
          name: "Manager Evaluation and Recommendation",
          description: "Manager completes evaluation and provides recommendation (continue, extend probation, or terminate)",
          order: 4,
          type: "evaluation",
          managerLevel: 1,
          evaluationFormId: "form-3",
          attendees: ["manager_level_1"],
          dueDateType: "after_interval",
          dueDateOffset: 1,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 2,
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
        formReminderDays: 3,
        enabled: true,
        channels: ["email", "in-app"],
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // Scenario 4: Senior Executive Performance Review
    {
      id: "workflow-4",
      name: "Senior Executive Performance Review",
      description: "Comprehensive bi-annual review for senior executives. Includes board-level review and strategic performance assessment.",
      applicablePositions: ["CFO", "VP Engineering", "VP Marketing", "VP Sales", "Director"],
      applicableDepartments: ["Finance", "Engineering", "Marketing", "Sales", "Operations"],
      steps: [
        {
          id: "step-16",
          name: "Executive Self Assessment",
          description: "Executive completes comprehensive self-assessment covering strategic initiatives, leadership, and business impact",
          order: 1,
          type: "evaluation",
          evaluationFormId: "form-6",
          attendees: ["employee"],
          dueDateType: "before_interval",
          dueDateOffset: 2,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 14,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-17",
          name: "Stakeholder Feedback Collection",
          description: "Collect feedback from board members, peers, and key stakeholders",
          order: 2,
          type: "evaluation",
          evaluationFormId: "form-7",
          attendees: ["employee"],
          dueDateType: "before_interval",
          dueDateOffset: 1,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 10,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-18",
          name: "Manager Level 1 Initial Review",
          description: "CEO or direct supervisor conducts initial review",
          order: 3,
          type: "review",
          managerLevel: 1,
          evaluationFormId: "form-2",
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
          id: "step-19",
          name: "Executive Performance Meeting",
          description: "Comprehensive performance discussion meeting with CEO",
          order: 4,
          type: "meeting",
          managerLevel: 1,
          attendees: ["employee", "manager_level_1"],
          dueDateType: "after_interval",
          dueDateOffset: 1,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 7,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-20",
          name: "Manager Level 1 Evaluation",
          description: "CEO completes evaluation form",
          order: 5,
          type: "evaluation",
          managerLevel: 1,
          evaluationFormId: "form-2",
          attendees: ["manager_level_1"],
          dueDateType: "after_interval",
          dueDateOffset: 1,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 5,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-21",
          name: "Board Level Review",
          description: "Board of directors reviews and approves executive performance",
          order: 6,
          type: "approval",
          managerLevel: 2,
          attendees: ["manager_level_2"],
          dueDateType: "after_interval",
          dueDateOffset: 2,
          required: true,
          reminderSettings: {
            enabled: true,
            reminderDays: 7,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-22",
          name: "Final Approval",
          description: "Final approval from board chair or highest level manager",
          order: 7,
          type: "approval",
          managerLevel: 3,
          attendees: ["manager_level_3"],
          dueDateType: "after_interval",
          dueDateOffset: 3,
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
        type: "biannually",
      },
      managerLevels: [1, 2, 3],
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
    // Scenario 5: 1-on-1 Meeting Procedure
    {
      id: "workflow-5",
      name: "1-on-1 Meeting Procedure",
      description: "Regular one-on-one meetings between employees and their managers for ongoing feedback, goal tracking, and career development discussions.",
      applicablePositions: ["Software Engineer", "Senior Software Engineer", "Marketing Manager", "Sales Representative", "HR Specialist", "Financial Analyst", "Operations Manager", "UX Designer", "Product Manager"],
      applicableDepartments: ["Engineering", "Marketing", "Sales", "HR", "Finance", "Operations", "Design", "Product"],
      steps: [
        {
          id: "step-23",
          name: "Meeting Preparation",
          description: "Employee prepares agenda items and updates on current work",
          order: 1,
          type: "evaluation",
          evaluationFormId: "form-1",
          attendees: ["employee"],
          dueDateType: "before_interval",
          dueDateOffset: 1,
          required: false,
          reminderSettings: {
            enabled: true,
            reminderDays: 1,
            channels: ["email", "in-app"],
          },
        },
        {
          id: "step-24",
          name: "1-on-1 Meeting",
          description: "Regular one-on-one meeting between employee and manager",
          order: 2,
          type: "meeting",
          managerLevel: 1,
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
        {
          id: "step-25",
          name: "Meeting Notes & Action Items",
          description: "Manager documents meeting notes and action items",
          order: 3,
          type: "evaluation",
          managerLevel: 1,
          evaluationFormId: "form-2",
          attendees: ["manager_level_1"],
          dueDateType: "after_interval",
          dueDateOffset: 1,
          required: false,
          reminderSettings: {
            enabled: true,
            reminderDays: 1,
            channels: ["email", "in-app"],
          },
        },
      ],
      meetingFrequencies: [],
      interval: {
        type: "biweekly",
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
  ]
}

// Helper functions
export function getWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((w) => w.id === id)
}

export function getWorkflowAssignmentsForEmployee(
  employeeId: string
): WorkflowAssignment[] {
  return workflowAssignments.filter((a) => a.employeeId === employeeId)
}

export function getEvaluationForm(id: string): EvaluationForm | undefined {
  return evaluationForms.find((f) => f.id === id)
}

export function getEmployee(id: string): Employee | undefined {
  return employees.find((e) => e.id === id)
}
