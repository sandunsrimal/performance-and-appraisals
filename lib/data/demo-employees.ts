import type { Employee } from "../types"

export const demoEmployees: Employee[] = [
  // HR Admin - Top level, no manager
  {
    id: "admin-1",
    firstName: "Sarah",
    lastName: "Admin",
    email: "sarah.admin@company.com",
    phone: "(555) 000-0001",
    department: "HR",
    position: "HR Administrator",
    status: "Active",
    hireDate: "2018-01-10",
    address: "100 Admin St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94102",
    emergencyContact: "Admin Contact",
    emergencyPhone: "(555) 000-0002",
    assignedWorkflowIds: ["workflow-2", "workflow-5"], // Annual Review + 1-on-1 Meetings
  },
  // Senior Manager - Reports to HR
  {
    id: "manager-1",
    firstName: "Robert",
    lastName: "Taylor",
    email: "robert.taylor@company.com",
    phone: "(555) 789-0123",
    department: "Operations",
    position: "Operations Manager",
    status: "Active",
    hireDate: "2018-07-22",
    address: "147 Birch Way",
    city: "Austin",
    state: "TX",
    zipCode: "73301",
    emergencyContact: "Mary Taylor",
    emergencyPhone: "(555) 789-0124",
    assignedWorkflowIds: ["workflow-2", "workflow-5"], // Annual Review + 1-on-1 Meetings
    managers: [
      {
        level: 1,
        employeeId: "admin-1", // Sarah Admin (HR) as manager
        isExternal: false,
      },
    ],
  },
  // Marketing Manager - Reports to Operations Manager
  {
    id: "2",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@company.com",
    phone: "(555) 234-5678",
    department: "Marketing",
    position: "Marketing Manager",
    status: "Active",
    hireDate: "2019-03-20",
    address: "456 Oak Ave",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90001",
    emergencyContact: "Bob Smith",
    emergencyPhone: "(555) 234-5679",
    assignedWorkflowIds: ["workflow-2", "workflow-5"], // Annual Review + 1-on-1 Meetings
    managers: [
      {
        level: 1,
        employeeId: "manager-1", // Robert Taylor (Operations Manager) as Level 1 manager
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "admin-1", // Sarah Admin (HR) as Level 2 manager
        isExternal: false,
      },
    ],
  },
  // Engineering Employees - Report to Jane Smith (Marketing Manager acting as Engineering Manager)
  {
    id: "1",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@company.com",
    phone: "(555) 123-4567",
    department: "Engineering",
    position: "Senior Software Engineer",
    status: "Active",
    hireDate: "2020-01-15",
    address: "123 Main St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94102",
    emergencyContact: "Jane Doe",
    emergencyPhone: "(555) 123-4568",
    assignedWorkflowIds: ["workflow-1", "workflow-5"], // Quarterly Appraisal + 1-on-1 Meetings
    managers: [
      {
        level: 1,
        employeeId: "2", // Jane Smith (Marketing Manager) as Level 1 manager
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "manager-1", // Robert Taylor (Operations Manager) as Level 2 manager
        isExternal: false,
      },
    ],
  },
  {
    id: "5",
    firstName: "David",
    lastName: "Wilson",
    email: "david.wilson@company.com",
    phone: "(555) 567-8901",
    department: "Engineering",
    position: "Software Engineer",
    status: "Active",
    hireDate: "2022-02-14",
    address: "654 Maple Dr",
    city: "Seattle",
    state: "WA",
    zipCode: "98101",
    emergencyContact: "Lisa Wilson",
    emergencyPhone: "(555) 567-8902",
    assignedWorkflowIds: ["workflow-1", "workflow-5"], // Quarterly Appraisal + 1-on-1 Meetings
    managers: [
      {
        level: 1,
        employeeId: "2", // Jane Smith (Marketing Manager) as Level 1 manager
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "manager-1", // Robert Taylor (Operations Manager) as Level 2 manager
        isExternal: false,
      },
    ],
  },
  // Sales Employee - Reports to Jane Smith
  {
    id: "3",
    firstName: "Michael",
    lastName: "Johnson",
    email: "michael.johnson@company.com",
    phone: "(555) 345-6789",
    department: "Sales",
    position: "Sales Representative",
    status: "Active",
    hireDate: "2021-06-10",
    address: "789 Pine Rd",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    emergencyContact: "Sarah Johnson",
    emergencyPhone: "(555) 345-6790",
    assignedWorkflowIds: ["workflow-3", "workflow-5"], // Probationary Review + 1-on-1 Meetings
    managers: [
      {
        level: 1,
        employeeId: "2", // Jane Smith (Marketing Manager) as Level 1 manager
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "manager-1", // Robert Taylor (Operations Manager) as Level 2 manager
        isExternal: false,
      },
    ],
  },
  // Finance Employee - Reports to Jane Smith
  {
    id: "6",
    firstName: "Sarah",
    lastName: "Brown",
    email: "sarah.brown@company.com",
    phone: "(555) 678-9012",
    department: "Finance",
    position: "Financial Analyst",
    status: "Active",
    hireDate: "2021-11-08",
    address: "987 Cedar Ln",
    city: "Boston",
    state: "MA",
    zipCode: "02101",
    emergencyContact: "Mark Brown",
    emergencyPhone: "(555) 678-9013",
    assignedWorkflowIds: ["workflow-2", "workflow-5"], // Annual Review + 1-on-1 Meetings
    managers: [
      {
        level: 1,
        employeeId: "2", // Jane Smith (Marketing Manager) as Level 1 manager
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "manager-1", // Robert Taylor (Operations Manager) as Level 2 manager
        isExternal: false,
      },
    ],
  },
  // Design Employee - Reports to Jane Smith
  {
    id: "8",
    firstName: "Jessica",
    lastName: "Anderson",
    email: "jessica.anderson@company.com",
    phone: "(555) 890-1234",
    department: "Design",
    position: "UX Designer",
    status: "Active",
    hireDate: "2021-04-12",
    address: "258 Spruce St",
    city: "Portland",
    state: "OR",
    zipCode: "97201",
    emergencyContact: "Chris Anderson",
    emergencyPhone: "(555) 890-1235",
    assignedWorkflowIds: ["workflow-2", "workflow-5"], // Annual Review + 1-on-1 Meetings
    managers: [
      {
        level: 1,
        employeeId: "2", // Jane Smith (Marketing Manager) as Level 1 manager
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "manager-1", // Robert Taylor (Operations Manager) as Level 2 manager
        isExternal: false,
      },
    ],
  },
  // HR Employee - Reports to Sarah Admin
  {
    id: "4",
    firstName: "Emily",
    lastName: "Davis",
    email: "emily.davis@company.com",
    phone: "(555) 456-7890",
    department: "HR",
    position: "HR Specialist",
    status: "Active",
    hireDate: "2020-09-05",
    address: "321 Elm St",
    city: "Chicago",
    state: "IL",
    zipCode: "60601",
    emergencyContact: "Tom Davis",
    emergencyPhone: "(555) 456-7891",
    assignedWorkflowIds: ["workflow-2", "workflow-5"], // Annual Review + 1-on-1 Meetings
    managers: [
      {
        level: 1,
        employeeId: "admin-1", // Sarah Admin (HR Administrator) as manager
        isExternal: false,
      },
    ],
  },
]
