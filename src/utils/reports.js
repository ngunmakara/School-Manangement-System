import { toLocalDateKey } from './attendance'
import { calculateGradeResult } from './grades'

export const REPORT_TYPES = Object.freeze([
  { value: 'all', label: 'All reports' },
  { value: 'enrollment', label: 'Student enrollment' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'performance', label: 'Academic performance' },
  { value: 'grades', label: 'Grades & GPA' },
])

function countByStatus(rows, statuses) {
  statuses.forEach((status) => {
    rows[status] = 0
  })

  return rows
}

function sortedByLabel(rows, key) {
  return [...rows].sort((left, right) =>
    String(left[key] ?? '').localeCompare(String(right[key] ?? ''), 'en', {
      sensitivity: 'base',
      numeric: true,
    }),
  )
}

function toDateKey(value) {
  if (value instanceof Date) return toLocalDateKey(value)

  const text = String(value ?? '').trim()
  const datePart = /^(\d{4}-\d{2}-\d{2})(?:[T ].*)?$/.exec(text)?.[1] ?? text
  return toLocalDateKey(datePart)
}

export function isWithinDateRange(value, start = '', end = '') {
  if (!start && !end) return true

  const key = toDateKey(value)
  if (!key) return false
  if (start && key < start) return false
  if (end && key > end) return false
  return true
}

export function studentDepartmentRows(students = []) {
  const groups = new Map()

  students.forEach((student) => {
    const department = String(student?.department ?? '').trim() || 'Unassigned'
    if (!groups.has(department)) {
      groups.set(department, {
        department,
        total: 0,
        active: 0,
        inactive: 0,
      })
    }

    const row = groups.get(department)
    row.total += 1
    if (String(student?.status ?? '').toLowerCase() === 'active') row.active += 1
    else row.inactive += 1
  })

  return sortedByLabel([...groups.values()], 'department')
}

export function sectionEnrollmentRows(enrollments = [], sections = []) {
  const sectionByUid = new Map(sections.map((section) => [section.uid, section]))
  const groups = new Map()

  enrollments.forEach((enrollment) => {
    const section = sectionByUid.get(enrollment?.sectionUid)
    const key = section?.uid || String(enrollment?.sectionUid ?? '').trim() || 'unknown'
    if (!groups.has(key)) {
      groups.set(key, {
        sectionUid: key,
        sectionCode: section?.code || 'Unknown section',
        semesterUid: section?.semesterUid || '',
        enrolled: 0,
        dropped: 0,
        completed: 0,
        total: 0,
        capacity: Number.isFinite(Number(section?.capacity)) ? Number(section.capacity) : null,
      })
    }

    const row = groups.get(key)
    const status = String(enrollment?.status ?? '').toLowerCase()
    const knownStatus = ['enrolled', 'dropped', 'completed'].includes(status) ? status : 'enrolled'
    row[knownStatus] += 1
    row.total += 1
  })

  return sortedByLabel([...groups.values()], 'sectionCode')
}

export function attendanceTotals(records = []) {
  const totals = countByStatus({ present: 0, absent: 0, late: 0, excused: 0, total: 0 }, [
    'present',
    'absent',
    'late',
    'excused',
  ])

  records.forEach((record) => {
    const status = String(record?.status ?? '').toLowerCase()
    if (Object.prototype.hasOwnProperty.call(totals, status) && status !== 'total') {
      totals[status] += 1
    }
    totals.total += 1
  })

  totals.attendanceRate = totals.total
    ? Math.round(((totals.present + totals.late) / totals.total) * 1000) / 10
    : 0
  return totals
}

export function attendanceRows(attendance = [], sections = []) {
  const sectionByUid = new Map(sections.map((section) => [section.uid, section]))
  const groups = new Map()

  attendance.forEach((record) => {
    const section = sectionByUid.get(record?.sectionUid)
    const key = section?.uid || String(record?.sectionUid ?? '').trim() || 'unknown'
    if (!groups.has(key)) {
      groups.set(key, {
        sectionUid: key,
        sectionCode: section?.code || 'Unknown section',
        semesterUid: section?.semesterUid || '',
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
      })
    }

    const row = groups.get(key)
    const status = String(record?.status ?? '').toLowerCase()
    if (['present', 'absent', 'late', 'excused'].includes(status)) row[status] += 1
    row.total += 1
  })

  return sortedByLabel([...groups.values()], 'sectionCode').map((row) => ({
    ...row,
    attendanceRate: row.total ? Math.round(((row.present + row.late) / row.total) * 1000) / 10 : 0,
  }))
}

export function performanceRows(courses = [], subjects = [], sections = []) {
  const groups = new Map()

  function groupFor(department) {
    const key = String(department ?? '').trim() || 'Unassigned'
    if (!groups.has(key)) {
      groups.set(key, {
        department: key,
        courses: 0,
        activeCourses: 0,
        subjects: 0,
        creditHours: 0,
        sections: 0,
      })
    }
    return groups.get(key)
  }

  courses.forEach((course) => {
    const row = groupFor(course?.department)
    row.courses += 1
    if (String(course?.status ?? '').toLowerCase() === 'active') row.activeCourses += 1
    const credits = Number(course?.credits)
    if (Number.isFinite(credits)) row.creditHours += credits
  })

  subjects.forEach((subject) => {
    const row = groupFor(subject?.department)
    row.subjects += 1
    const credits = Number(subject?.credits)
    if (Number.isFinite(credits)) row.creditHours += credits
  })

  const subjectByUid = new Map(subjects.map((subject) => [subject.uid, subject]))
  sections.forEach((section) => {
    const subject = subjectByUid.get(section?.subjectUid)
    const row = groupFor(subject?.department || 'Unassigned')
    row.sections += 1
  })

  return sortedByLabel([...groups.values()], 'department')
}

export function gradeBandCounts(grades = []) {
  const bands = ['A', 'B', 'C', 'D', 'F'].map((letter) => ({ letter, count: 0 }))

  grades.forEach((grade) => {
    const result = calculateGradeResult(grade)
    const band = bands.find((item) => item.letter === result.letterGrade)
    if (band) band.count += 1
  })

  return bands
}

export function gradeRows(grades = [], lookups = {}) {
  const students = lookups.students ?? []
  const sections = lookups.sections ?? []
  const subjects = lookups.subjects ?? []
  const semesters = lookups.semesters ?? []
  const studentByUid = new Map(students.map((student) => [student.uid, student]))
  const sectionByUid = new Map(sections.map((section) => [section.uid, section]))
  const subjectByUid = new Map(subjects.map((subject) => [subject.uid, subject]))
  const semesterByUid = new Map(semesters.map((semester) => [semester.uid, semester]))

  return grades.map((grade) => {
    const student = studentByUid.get(grade.studentUid)
    const section = sectionByUid.get(grade.sectionUid)
    const subject = subjectByUid.get(grade.subjectUid)
    const semester = semesterByUid.get(grade.semesterUid)
    const result = calculateGradeResult(grade)

    return {
      uid: grade.uid,
      studentName: student?.fullName || grade.studentName || 'Unknown student',
      studentId: student?.studentId || grade.studentId || '—',
      sectionCode: section?.code || grade.sectionCode || 'Unknown section',
      semesterUid: grade.semesterUid || section?.semesterUid || '',
      semesterName: semester
        ? `${semester.name}${semester.academicYear ? ` · ${semester.academicYear}` : ''}`
        : grade.semesterName || 'Unknown semester',
      subjectName: subject?.name || grade.subjectName || 'Unknown subject',
      totalScore: result.totalScore,
      letterGrade: result.letterGrade,
      gpa: result.gradePoints,
      status: result.status,
      createdAt: grade.createdAt || '',
    }
  })
}

export function escapeCsvCell(value) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ')
  if (/[",]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function buildCsv(rows = []) {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}
