export const demoGradeStudents = [
  {
    uid: 'demo_grade_student_1',
    studentId: 'DEMO-G01',
    fullName: 'Avery Demo',
    status: 'Active',
  },
  {
    uid: 'demo_grade_student_2',
    studentId: 'DEMO-G02',
    fullName: 'Blair Demo',
    status: 'Active',
  },
  {
    uid: 'demo_grade_student_3',
    studentId: 'DEMO-G03',
    fullName: 'Casey Demo',
    status: 'Active',
  },
  {
    uid: 'demo_grade_student_4',
    studentId: 'DEMO-G04',
    fullName: 'Devon Demo',
    status: 'Active',
  },
]

export const demoGradeSemesters = [
  {
    uid: 'demo_grade_semester_1',
    name: 'Demo Semester',
    academicYear: '2026-2027',
    status: 'Active',
  },
]

export const demoGradeSubjects = [
  {
    uid: 'demo_grade_subject_1',
    code: 'DEMO-MATH',
    name: 'Demo Mathematics',
    status: 'Active',
  },
  {
    uid: 'demo_grade_subject_2',
    code: 'DEMO-SCI',
    name: 'Demo Science',
    status: 'Active',
  },
]

export const demoGradeSections = [
  {
    uid: 'demo_grade_section_1',
    code: 'DEMO-GA',
    subjectUid: 'demo_grade_subject_1',
    semesterUid: 'demo_grade_semester_1',
    teacherName: 'Frontend demo teacher',
    room: 'Demo room',
    schedule: 'Frontend-only example',
    capacity: 30,
    status: 'Active',
  },
  {
    uid: 'demo_grade_section_2',
    code: 'DEMO-GB',
    subjectUid: 'demo_grade_subject_2',
    semesterUid: 'demo_grade_semester_1',
    teacherName: 'Frontend demo teacher',
    room: 'Demo room',
    schedule: 'Frontend-only example',
    capacity: 30,
    status: 'Active',
  },
]

export const demoGradeEnrollments = [
  {
    uid: 'demo_grade_enrollment_1',
    studentUid: 'demo_grade_student_1',
    sectionUid: 'demo_grade_section_1',
    status: 'enrolled',
  },
  {
    uid: 'demo_grade_enrollment_2',
    studentUid: 'demo_grade_student_2',
    sectionUid: 'demo_grade_section_1',
    status: 'enrolled',
  },
  {
    uid: 'demo_grade_enrollment_3',
    studentUid: 'demo_grade_student_3',
    sectionUid: 'demo_grade_section_2',
    status: 'enrolled',
  },
  {
    uid: 'demo_grade_enrollment_4',
    studentUid: 'demo_grade_student_4',
    sectionUid: 'demo_grade_section_2',
    status: 'enrolled',
  },
]

export const demoGradeContext = Object.freeze({
  students: demoGradeStudents,
  sections: demoGradeSections,
  subjects: demoGradeSubjects,
  semesters: demoGradeSemesters,
  enrollments: demoGradeEnrollments,
})
