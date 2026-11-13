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
