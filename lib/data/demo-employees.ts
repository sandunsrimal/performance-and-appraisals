import type { Employee } from "../types"

export const demoEmployees: Employee[] = [
  // HR Admin - Top level administrator
  {
    id: "admin-1",
    firstName: "Nimali",
    lastName: "Perera",
    email: "nimali.perera@company.lk",
    phone: "+94 77 123 4567",
    department: "HR",
    position: "HR Director",
    status: "Active",
    hireDate: "2015-03-15",
    address: "45/1 Wijerama Road",
    city: "Colombo 07",
    state: "Western Province",
    zipCode: "00700",
    emergencyContact: "Kasun Perera",
    emergencyPhone: "+94 77 123 4568",
    assignedWorkflowIds: ["workflow-complete-evaluation"], // HR Director has evaluation tasks as employee
  },

  // Engineering Department
  // Engineering Manager (Level 1 Manager for Engineers)
  {
    id: "eng-manager-1",
    firstName: "Rajitha",
    lastName: "Wickramasinghe",
    email: "rajitha.wickramasinghe@company.lk",
    phone: "+94 71 234 5678",
    department: "Engineering",
    position: "Engineering Manager",
    status: "Active",
    hireDate: "2017-06-20",
    address: "23 Dutugemunu Street",
    city: "Dehiwala",
    state: "Western Province",
    zipCode: "10350",
    emergencyContact: "Sanduni Wickramasinghe",
    emergencyPhone: "+94 71 234 5679",
    assignedWorkflowIds: ["workflow-simple-meeting", "workflow-complete-evaluation"], // Both simple meeting and complete evaluation procedures
    managers: [
      {
        level: 1,
        employeeId: "admin-1", // Reports to HR Director
        isExternal: false,
      },
    ],
  },

  // Senior Software Engineer
  {
    id: "eng-1",
    firstName: "Kavindu",
    lastName: "Silva",
    email: "kavindu.silva@company.lk",
    phone: "+94 76 345 6789",
    department: "Engineering",
    position: "Senior Software Engineer",
    status: "Active",
    hireDate: "2019-02-10",
    address: "67 Galle Road",
    city: "Moratuwa",
    state: "Western Province",
    zipCode: "10400",
    emergencyContact: "Dilini Silva",
    emergencyPhone: "+94 76 345 6790",
    assignedWorkflowIds: ["workflow-complete-evaluation"], // Complete evaluation procedure
    managers: [
      {
        level: 1,
        employeeId: "eng-manager-1", // Reports to Engineering Manager
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "admin-1", // Level 2 approval from HR Director
        isExternal: false,
      },
    ],
  },

  // Software Engineer
  {
    id: "eng-2",
    firstName: "Tharushi",
    lastName: "Fernando",
    email: "tharushi.fernando@company.lk",
    phone: "+94 75 456 7890",
    department: "Engineering",
    position: "Software Engineer",
    status: "Active",
    hireDate: "2020-08-15",
    address: "12/A Templers Road",
    city: "Mount Lavinia",
    state: "Western Province",
    zipCode: "10370",
    emergencyContact: "Roshan Fernando",
    emergencyPhone: "+94 75 456 7891",
    assignedWorkflowIds: ["workflow-complete-evaluation"],
    managers: [
      {
        level: 1,
        employeeId: "eng-manager-1",
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "admin-1",
        isExternal: false,
      },
    ],
  },

  // Junior Software Engineer
  {
    id: "eng-3",
    firstName: "Aravinda",
    lastName: "Rathnayake",
    email: "aravinda.rathnayake@company.lk",
    phone: "+94 72 567 8901",
    department: "Engineering",
    position: "Junior Software Engineer",
    status: "Active",
    hireDate: "2022-01-20",
    address: "89 Station Road",
    city: "Nugegoda",
    state: "Western Province",
    zipCode: "10250",
    emergencyContact: "Malini Rathnayake",
    emergencyPhone: "+94 72 567 8902",
    assignedWorkflowIds: ["workflow-complete-evaluation"],
    managers: [
      {
        level: 1,
        employeeId: "eng-manager-1",
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "admin-1",
        isExternal: false,
      },
    ],
  },

  // QA Department
  // QA Manager (Level 1 Manager for QA team)
  {
    id: "qa-manager-1",
    firstName: "Prasanna",
    lastName: "Jayawardena",
    email: "prasanna.jayawardena@company.lk",
    phone: "+94 77 678 9012",
    department: "QA",
    position: "QA Manager",
    status: "Active",
    hireDate: "2018-04-12",
    address: "34 Kandy Road",
    city: "Kaduwela",
    state: "Western Province",
    zipCode: "10640",
    emergencyContact: "Nimesha Jayawardena",
    emergencyPhone: "+94 77 678 9013",
    assignedWorkflowIds: ["workflow-simple-meeting"],
    managers: [
      {
        level: 1,
        employeeId: "admin-1",
        isExternal: false,
      },
    ],
  },

  // Senior QA Engineer
  {
    id: "qa-1",
    firstName: "Chamara",
    lastName: "Gunasekara",
    email: "chamara.gunasekara@company.lk",
    phone: "+94 71 789 0123",
    department: "QA",
    position: "Senior QA Engineer",
    status: "Active",
    hireDate: "2019-09-05",
    address: "56 Baseline Road",
    city: "Colombo 09",
    state: "Western Province",
    zipCode: "00900",
    emergencyContact: "Sachini Gunasekara",
    emergencyPhone: "+94 71 789 0124",
    assignedWorkflowIds: ["workflow-complete-evaluation"],
    managers: [
      {
        level: 1,
        employeeId: "qa-manager-1",
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "admin-1",
        isExternal: false,
      },
    ],
  },

  // QA Engineer
  {
    id: "qa-2",
    firstName: "Thilini",
    lastName: "Samaraweera",
    email: "thilini.samaraweera@company.lk",
    phone: "+94 76 890 1234",
    department: "QA",
    position: "QA Engineer",
    status: "Active",
    hireDate: "2021-03-10",
    address: "78 Peradeniya Road",
    city: "Kandy",
    state: "Central Province",
    zipCode: "20000",
    emergencyContact: "Nuwan Samaraweera",
    emergencyPhone: "+94 76 890 1235",
    assignedWorkflowIds: ["workflow-complete-evaluation"],
    managers: [
      {
        level: 1,
        employeeId: "qa-manager-1",
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "admin-1",
        isExternal: false,
      },
    ],
  },

  // HR Department
  // HR Manager
  {
    id: "hr-manager-1",
    firstName: "Samanthi",
    lastName: "Wijekoon",
    email: "samanthi.wijekoon@company.lk",
    phone: "+94 75 901 2345",
    department: "HR",
    position: "HR Manager",
    status: "Active",
    hireDate: "2016-11-08",
    address: "45 Ward Place",
    city: "Colombo 07",
    state: "Western Province",
    zipCode: "00700",
    emergencyContact: "Chanaka Wijekoon",
    emergencyPhone: "+94 75 901 2346",
    assignedWorkflowIds: ["workflow-simple-meeting"],
    managers: [
      {
        level: 1,
        employeeId: "admin-1",
        isExternal: false,
      },
    ],
  },

  // HR Specialist
  {
    id: "hr-1",
    firstName: "Dinusha",
    lastName: "Rajapaksha",
    email: "dinusha.rajapaksha@company.lk",
    phone: "+94 72 012 3456",
    department: "HR",
    position: "HR Specialist",
    status: "Active",
    hireDate: "2020-05-18",
    address: "23 Flower Road",
    city: "Colombo 07",
    state: "Western Province",
    zipCode: "00700",
    emergencyContact: "Harsha Rajapaksha",
    emergencyPhone: "+94 72 012 3457",
    assignedWorkflowIds: ["workflow-complete-evaluation"],
    managers: [
      {
        level: 1,
        employeeId: "hr-manager-1",
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "admin-1",
        isExternal: false,
      },
    ],
  },

  // Finance Department
  // Finance Manager
  {
    id: "fin-manager-1",
    firstName: "Ruwan",
    lastName: "Dissanayake",
    email: "ruwan.dissanayake@company.lk",
    phone: "+94 77 123 4560",
    department: "Finance",
    position: "Finance Manager",
    status: "Active",
    hireDate: "2017-02-14",
    address: "12 Gregory's Road",
    city: "Colombo 07",
    state: "Western Province",
    zipCode: "00700",
    emergencyContact: "Ishara Dissanayake",
    emergencyPhone: "+94 77 123 4561",
    assignedWorkflowIds: ["workflow-simple-meeting"],
    managers: [
      {
        level: 1,
        employeeId: "admin-1",
        isExternal: false,
      },
    ],
  },

  // Senior Financial Analyst
  {
    id: "fin-1",
    firstName: "Mahesh",
    lastName: "Liyanage",
    email: "mahesh.liyanage@company.lk",
    phone: "+94 71 234 5601",
    department: "Finance",
    position: "Senior Financial Analyst",
    status: "Active",
    hireDate: "2019-07-22",
    address: "67 Dharmapala Mawatha",
    city: "Colombo 03",
    state: "Western Province",
    zipCode: "00300",
    emergencyContact: "Anusha Liyanage",
    emergencyPhone: "+94 71 234 5602",
    assignedWorkflowIds: ["workflow-complete-evaluation"],
    managers: [
      {
        level: 1,
        employeeId: "fin-manager-1",
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "admin-1",
        isExternal: false,
      },
    ],
  },

  // Financial Analyst
  {
    id: "fin-2",
    firstName: "Nishantha",
    lastName: "Kumara",
    email: "nishantha.kumara@company.lk",
    phone: "+94 76 345 6012",
    department: "Finance",
    position: "Financial Analyst",
    status: "Active",
    hireDate: "2021-10-05",
    address: "89 Main Street",
    city: "Galle",
    state: "Southern Province",
    zipCode: "80000",
    emergencyContact: "Madhavi Kumara",
    emergencyPhone: "+94 76 345 6013",
    assignedWorkflowIds: ["workflow-complete-evaluation"],
    managers: [
      {
        level: 1,
        employeeId: "fin-manager-1",
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "admin-1",
        isExternal: false,
      },
    ],
  },

  // Design Department
  // Design Manager
  {
    id: "des-manager-1",
    firstName: "Chathurika",
    lastName: "Amarasinghe",
    email: "chathurika.amarasinghe@company.lk",
    phone: "+94 75 456 7123",
    department: "Design",
    position: "Design Manager",
    status: "Active",
    hireDate: "2018-08-20",
    address: "34 Wijerama Mawatha",
    city: "Colombo 07",
    state: "Western Province",
    zipCode: "00700",
    emergencyContact: "Ishan Amarasinghe",
    emergencyPhone: "+94 75 456 7124",
    assignedWorkflowIds: ["workflow-simple-meeting"],
    managers: [
      {
        level: 1,
        employeeId: "admin-1",
        isExternal: false,
      },
    ],
  },

  // Senior UX Designer
  {
    id: "des-1",
    firstName: "Ransika",
    lastName: "Herath",
    email: "ransika.herath@company.lk",
    phone: "+94 72 567 8234",
    department: "Design",
    position: "Senior UX Designer",
    status: "Active",
    hireDate: "2019-11-12",
    address: "56 Bauddhaloka Mawatha",
    city: "Colombo 04",
    state: "Western Province",
    zipCode: "00400",
    emergencyContact: "Hasitha Herath",
    emergencyPhone: "+94 72 567 8235",
    assignedWorkflowIds: ["workflow-complete-evaluation"],
    managers: [
      {
        level: 1,
        employeeId: "des-manager-1",
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "admin-1",
        isExternal: false,
      },
    ],
  },

  // UI Designer
  {
    id: "des-2",
    firstName: "Sachini",
    lastName: "Mendis",
    email: "sachini.mendis@company.lk",
    phone: "+94 77 678 9345",
    department: "Design",
    position: "UI Designer",
    status: "Active",
    hireDate: "2020-12-03",
    address: "12 Hospital Road",
    city: "Matara",
    state: "Southern Province",
    zipCode: "81000",
    emergencyContact: "Dilan Mendis",
    emergencyPhone: "+94 77 678 9346",
    assignedWorkflowIds: ["workflow-complete-evaluation"],
    managers: [
      {
        level: 1,
        employeeId: "des-manager-1",
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "admin-1",
        isExternal: false,
      },
    ],
  },

  // Graphic Designer
  {
    id: "des-3",
    firstName: "Udara",
    lastName: "Bandara",
    email: "udara.bandara@company.lk",
    phone: "+94 71 789 0456",
    department: "Design",
    position: "Graphic Designer",
    status: "Active",
    hireDate: "2021-06-15",
    address: "78 Castle Street",
    city: "Colombo 08",
    state: "Western Province",
    zipCode: "00800",
    emergencyContact: "Buddhika Bandara",
    emergencyPhone: "+94 71 789 0457",
    assignedWorkflowIds: ["workflow-complete-evaluation"],
    managers: [
      {
        level: 1,
        employeeId: "des-manager-1",
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "admin-1",
        isExternal: false,
      },
    ],
  },

  // Additional employees for admin-1 to manage (for manager evaluation tasks)
  // HR Assistant - reports directly to HR Director (admin-1)
  {
    id: "hr-2",
    firstName: "Sanduni",
    lastName: "Perera",
    email: "sanduni.perera@company.lk",
    phone: "+94 73 234 5678",
    department: "HR",
    position: "HR Assistant",
    status: "Active",
    hireDate: "2022-03-10",
    address: "12 Cotta Road",
    city: "Colombo 08",
    state: "Western Province",
    zipCode: "00800",
    emergencyContact: "Kamal Perera",
    emergencyPhone: "+94 73 234 5679",
    assignedWorkflowIds: ["workflow-complete-evaluation"],
    managers: [
      {
        level: 1,
        employeeId: "admin-1", // Reports directly to HR Director
        isExternal: false,
      },
    ],
  },

  // Finance Assistant - reports directly to HR Director (admin-1) for cross-department management
  {
    id: "fin-3",
    firstName: "Dilshan",
    lastName: "Wijesinghe",
    email: "dilshan.wijesinghe@company.lk",
    phone: "+94 74 345 6789",
    department: "Finance",
    position: "Financial Assistant",
    status: "Active",
    hireDate: "2022-06-15",
    address: "45 Galle Road",
    city: "Colombo 03",
    state: "Western Province",
    zipCode: "00300",
    emergencyContact: "Nadeesha Wijesinghe",
    emergencyPhone: "+94 74 345 6790",
    assignedWorkflowIds: ["workflow-complete-evaluation"],
    managers: [
      {
        level: 1,
        employeeId: "admin-1", // Reports to HR Director for evaluation purposes
        isExternal: false,
      },
      {
        level: 2,
        employeeId: "fin-manager-1", // Also reports to Finance Manager
        isExternal: false,
      },
    ],
  },
]
