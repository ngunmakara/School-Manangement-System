/**
 * Fictional demo data for the CampusHub frontend.
 * This data is generated locally for presentation purposes only.
 * No record here represents a real student, teacher, or institution.
 */

export const currentUser = {
  name: 'Amara Mensah',
  initials: 'AM',
  role: 'University Registrar',
  email: 'amara.mensah@campushub.demo',
}

export const academicTerm = {
  year: '2025 / 2026',
  term: 'Fall Semester',
}

export const dashboardStats = [
  {
    label: 'Total Students',
    value: '1,248',
    icon: 'bi-people',
    tone: 'indigo',
    delta: '+4.6%',
    direction: 'up',
    note: '84 new this month',
  },
  {
    label: 'Total Teachers',
    value: '86',
    icon: 'bi-person-video3',
    tone: 'green',
    delta: '+2.4%',
    direction: 'up',
    note: 'Across 12 departments',
  },
  {
    label: 'Active Courses',
    value: '32',
    icon: 'bi-journal-bookmark',
    tone: 'amber',
    delta: '+1',
    direction: 'up',
    note: '8 electives available',
  },
  {
    label: 'Departments',
    value: '12',
    icon: 'bi-building',
    tone: 'blue',
    delta: '0',
    direction: 'flat',
    note: '4 faculties',
  },
]

export const enrollmentTrend = {
  labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'],
  current: [1108, 1132, 1157, 1164, 1189, 1201, 1217, 1232, 1248],
  previous: [1042, 1058, 1074, 1081, 1096, 1112, 1126, 1138, 1150],
}

export const attendanceOverview = {
  present: 87,
  late: 7,
  absent: 4,
  excused: 2,
}

export const departmentDistribution = [
  { name: 'Computer Science', count: 286, color: '#4f5bd5' },
  { name: 'Business Administration', count: 254, color: '#128a6b' },
  { name: 'Engineering', count: 218, color: '#d19a2c' },
  { name: 'Health Sciences', count: 176, color: '#3d8fd1' },
  { name: 'Education', count: 132, color: '#b45a8f' },
  { name: 'Arts & Humanities', count: 108, color: '#7b8499' },
]

export const recentStudents = [
  {
    id: 'STU-2026-0148',
    name: 'Aisha Bello',
    email: 'aisha.bello@student.demo.edu',
    department: 'Computer Science',
    program: 'BSc Computer Science',
    date: 'Nov 10, 2026',
    status: 'Active',
    initials: 'AB',
    tone: 1,
  },
  {
    id: 'STU-2026-0147',
    name: 'Daniel Okafor',
    email: 'daniel.okafor@student.demo.edu',
    department: 'Business Administration',
    program: 'BBA Finance',
    date: 'Nov 09, 2026',
    status: 'Active',
    initials: 'DO',
    tone: 2,
  },
  {
    id: 'STU-2026-0146',
    name: 'Sofia Almeida',
    email: 'sofia.almeida@student.demo.edu',
    department: 'Health Sciences',
    program: 'BSc Nursing',
    date: 'Nov 09, 2026',
    status: 'Pending',
    initials: 'SA',
    tone: 3,
  },
  {
    id: 'STU-2026-0145',
    name: 'Liam Chen',
    email: 'liam.chen@student.demo.edu',
    department: 'Engineering',
    program: 'BEng Mechanical',
    date: 'Nov 08, 2026',
    status: 'Active',
    initials: 'LC',
    tone: 4,
  },
  {
    id: 'STU-2026-0144',
    name: 'Priya Nair',
    email: 'priya.nair@student.demo.edu',
    department: 'Computer Science',
    program: 'MSc Data Science',
    date: 'Nov 07, 2026',
    status: 'Active',
    initials: 'PN',
    tone: 5,
  },
]

export const upcomingSchedule = [
  {
    time: '09:00',
    duration: '90 min',
    title: 'Data Structures & Algorithms',
    teacher: 'Dr. Elena Park',
    room: 'Room B-204',
    students: '48 students',
    tone: 'indigo',
  },
  {
    time: '11:00',
    duration: '90 min',
    title: 'Financial Accounting II',
    teacher: 'Prof. Samuel Adeyemi',
    room: 'Room A-110',
    students: '62 students',
    tone: 'green',
  },
  {
    time: '13:00',
    duration: '120 min',
    title: 'Human Anatomy Lab',
    teacher: 'Dr. Layla Hassan',
    room: 'Lab C-012',
    students: '24 students',
    tone: 'blue',
  },
  {
    time: '15:00',
    duration: '60 min',
    title: 'Faculty Board Meeting',
    teacher: 'Academic Affairs',
    room: 'Senate Room',
    students: 'Faculty leads',
    tone: 'amber',
  },
]

export const recentActivities = [
  {
    text: '<strong>Aisha Bello</strong> submitted a new student application.',
    time: '12 minutes ago',
    icon: 'bi-person-plus',
    tone: 'indigo',
  },
  {
    text: 'Grades were published for <strong>CS-301 Database Systems</strong>.',
    time: '1 hour ago',
    icon: 'bi-journal-check',
    tone: 'green',
  },
  {
    text: '<strong>Daniel Okafor</strong> completed a tuition payment.',
    time: '2 hours ago',
    icon: 'bi-cash-coin',
    tone: 'amber',
  },
  {
    text: 'Schedule updated for <strong>CS-204 Web Development</strong>.',
    time: '4 hours ago',
    icon: 'bi-calendar-event',
    tone: 'blue',
  },
  {
    text: 'Monthly attendance report was generated.',
    time: 'Yesterday',
    icon: 'bi-bar-chart-line',
    tone: 'rose',
  },
]

export const notifications = [
  {
    id: 1,
    title: '12 enrollment applications await review',
    body: 'Undergraduate admissions · 10 minutes ago',
    icon: 'bi-person-plus',
    tone: '',
    unread: true,
    time: '10m',
  },
  {
    id: 2,
    title: 'Fall semester grade submission closes Friday',
    body: 'Academic Affairs · 1 hour ago',
    icon: 'bi-journal-check',
    tone: 'warning',
    unread: true,
    time: '1h',
  },
  {
    id: 3,
    title: 'Tuition payment received from Daniel Okafor',
    body: 'Finance Office · 2 hours ago',
    icon: 'bi-cash-coin',
    tone: 'success',
    unread: true,
    time: '2h',
  },
  {
    id: 4,
    title: 'Room change: Human Anatomy Lab moved to C-012',
    body: 'Health Sciences · Yesterday',
    icon: 'bi-geo-alt',
    tone: '',
    unread: true,
    time: '1d',
  },
  {
    id: 5,
    title: 'New teacher profile added for Engineering',
    body: 'Human Resources · 2 days ago',
    icon: 'bi-person-video3',
    tone: 'success',
    unread: false,
    time: '2d',
  },
]

export const moduleComingSoon = {
  students: 2,
  teachers: 3,
  departments: 3,
  courses: 4,
  semesters: 4,
  sections: 4,
  enrollment: 4,
  attendance: 5,
  grades: 5,
  payments: 5,
  reports: 6,
  notifications: 6,
  users: 6,
  settings: 6,
}
