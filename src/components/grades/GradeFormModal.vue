<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { useGradesStore } from '../../stores/grades'
import {
  ASSESSMENT_FIELDS,
  GRADE_SCALE_SUMMARY,
  calculateGradeResult,
  formatGpa,
  formatScore,
  gradeStatusLabel,
} from '../../utils/grades'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  grade: {
    type: Object,
    default: null,
  },
  students: {
    type: Array,
    default: () => [],
  },
  sections: {
    type: Array,
    default: () => [],
  },
  subjects: {
    type: Array,
    default: () => [],
  },
  semesters: {
    type: Array,
    default: () => [],
  },
  enrollments: {
    type: Array,
    default: () => [],
  },
  defaultSectionUid: {
    type: String,
    default: '',
  },
  defaultSubjectUid: {
    type: String,
    default: '',
  },
  defaultSemesterUid: {
    type: String,
    default: '',
  },
  studentDirectoryNotice: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const store = useGradesStore()
const formId = 'grade-form'
const isSubmitting = ref(false)

const fieldIds = {
  studentUid: 'grade-field-student',
  sectionUid: 'grade-field-section',
  subjectUid: 'grade-field-subject',
  semesterUid: 'grade-field-semester',
  assignment: 'grade-field-assignment',
  quiz: 'grade-field-quiz',
  midterm: 'grade-field-midterm',
  final: 'grade-field-final',
}

function blankForm() {
  const scores = {}
  ASSESSMENT_FIELDS.forEach((field) => {
    scores[field.key] = ''
  })

  return {
    studentUid: '',
    sectionUid: String(props.defaultSectionUid ?? '').trim(),
    subjectUid: String(props.defaultSubjectUid ?? '').trim(),
    semesterUid: String(props.defaultSemesterUid ?? '').trim(),
    scores,
  }
}

const form = reactive(blankForm())
const errors = reactive({})
const isEdit = computed(() => Boolean(props.grade))
const modalTitle = computed(() => (isEdit.value ? 'Edit grade' : 'Add grade'))
const preview = computed(() => calculateGradeResult(form))

function byUid(list, uid) {
  return list.find((item) => String(item?.uid ?? '').trim() === String(uid ?? '').trim())
}

function semesterLabel(semester) {
  if (!semester) return 'Unknown semester'
  return semester.academicYear
    ? `${semester.name} · ${semester.academicYear}`
    : semester.name
}

function makeLabel(record, prefix) {
  if (prefix === 'student') {
    return `${record.fullName || 'Unknown student'}${
      record.studentId ? ` · ${record.studentId}` : ''
    }`
  }
  if (prefix === 'section') {
    const subject = byUid(props.subjects, record.subjectUid)
    return `${record.code || 'Unknown section'} · ${subject?.name || 'Unknown subject'}`
  }
  if (prefix === 'subject') {
    return record.code ? `${record.code} · ${record.name}` : record.name
  }
  return semesterLabel(record)
}

function sortedChoices(list) {
  return [...list].sort((left, right) =>
    String(left.label ?? left.name ?? left.code ?? '').localeCompare(
      String(right.label ?? right.name ?? right.code ?? ''),
      'en',
      { sensitivity: 'base', numeric: true },
    ),
  )
}

const sectionChoices = computed(() =>
  sortedChoices(
    props.sections.map((section) => ({
      ...section,
      label: makeLabel(section, 'section'),
    })),
  ),
)

const subjectChoices = computed(() =>
  sortedChoices(
    props.subjects.map((subject) => ({
      ...subject,
      label: makeLabel(subject, 'subject'),
    })),
  ),
)

const semesterChoices = computed(() =>
  sortedChoices(
    props.semesters.map((semester) => ({
      ...semester,
      label: makeLabel(semester, 'semester'),
    })),
  ),
)

const selectedSection = computed(() => byUid(props.sections, form.sectionUid))

const rosterUids = computed(
  () =>
    new Set(
      props.enrollments
        .filter(
          (enrollment) =>
            String(enrollment?.status ?? '').toLowerCase() === 'enrolled' &&
            String(enrollment?.sectionUid ?? '').trim() === String(form.sectionUid ?? '').trim(),
        )
        .map((enrollment) => String(enrollment?.studentUid ?? '').trim())
        .filter(Boolean),
    ),
)

const usingRoster = computed(() => Boolean(form.sectionUid) && rosterUids.value.size > 0)

const historicalStudentOption = computed(() => {
  if (!isEdit.value || !props.grade) return null
  const uid = String(props.grade.studentUid ?? '').trim()
  if (!uid || rosterUids.value.has(uid)) return null

  const historical = byUid(props.students, uid)
  return {
    uid,
    label: `${historical?.fullName || props.grade.studentName || 'Unknown student'}${
      props.grade.studentId ? ` · ${props.grade.studentId}` : ''
    } · historical selection`,
    historical: true,
  }
})

const studentChoices = computed(() => {
  const eligible = usingRoster.value
    ? props.students.filter((student) => rosterUids.value.has(String(student?.uid ?? '').trim()))
    : props.students

  const choices = eligible.map((student) => ({
    ...student,
    label: makeLabel(student, 'student'),
  }))

  if (historicalStudentOption.value) choices.unshift(historicalStudentOption.value)
  return sortedChoices(choices)
})

const studentSourceNote = computed(() => {
  if (!form.sectionUid) return 'Choose a class section to see its enrolled students.'
  if (usingRoster.value) {
    return `${rosterUids.value.size} actively enrolled student${
      rosterUids.value.size === 1 ? '' : 's'
    } available for this section.`
  }
  return 'No active enrollment roster is available here, so the student directory is shown as a frontend-only fallback.'
})

const storageNote = computed(() => {
  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    return {
      warning: true,
      text: 'Browser storage is unavailable. This grade will last for this session only.',
    }
  }
  if (store.persistenceState === 'failed') {
    return {
      warning: true,
      text: 'Browser storage is not accepting saves. This grade will last for this session only.',
    }
  }
  return {
    warning: false,
    text: "Grade records are stored in this browser's localStorage and are not synced to the CampusHub server.",
  }
})

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key])
}

function clearError(field) {
  if (errors[field]) delete errors[field]
  if (errors.form) delete errors.form
}

function resetForm() {
  Object.assign(form, blankForm())

  if (props.grade) {
    form.studentUid = String(props.grade.studentUid ?? '')
    form.sectionUid = String(props.grade.sectionUid ?? '')
    form.subjectUid = String(props.grade.subjectUid ?? '')
    form.semesterUid = String(props.grade.semesterUid ?? '')
    ASSESSMENT_FIELDS.forEach((field) => {
      form.scores[field.key] = props.grade?.scores?.[field.key] ?? ''
    })
  }

  clearErrors()
  isSubmitting.value = false
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) resetForm()
  },
)

watch(
  () => props.grade,
  () => {
    if (props.modelValue) resetForm()
  },
)

watch(
  () => form.sectionUid,
  () => {
    const section = selectedSection.value
    if (section?.subjectUid) form.subjectUid = String(section.subjectUid)
    if (section?.semesterUid) form.semesterUid = String(section.semesterUid)

    const available = new Set(studentChoices.value.map((student) => student.uid))
    if (form.studentUid && !available.has(form.studentUid) && !historicalStudentOption.value) {
      form.studentUid = ''
    }

    clearError('sectionUid')
    clearError('subjectUid')
    clearError('semesterUid')
  },
)

function validationContext() {
  return {
    students: props.students,
    sections: props.sections,
    subjects: props.subjects,
    semesters: props.semesters,
    rosterUids: usingRoster.value ? rosterUids.value : null,
  }
}

async function handleSubmit() {
  if (isSubmitting.value) return
  isSubmitting.value = true

  const payload = {
    studentUid: form.studentUid,
    sectionUid: form.sectionUid,
    subjectUid: form.subjectUid,
    semesterUid: form.semesterUid,
    studentName: byUid(props.students, form.studentUid)?.fullName || props.grade?.studentName || '',
    studentId: byUid(props.students, form.studentUid)?.studentId || props.grade?.studentId || '',
    sectionCode: selectedSection.value?.code || props.grade?.sectionCode || '',
    subjectName: byUid(props.subjects, form.subjectUid)?.name || props.grade?.subjectName || '',
    semesterName: byUid(props.semesters, form.semesterUid)
      ? semesterLabel(byUid(props.semesters, form.semesterUid))
      : props.grade?.semesterName || '',
    scores: { ...form.scores },
  }

  let result
  try {
    result = isEdit.value
      ? store.updateGrade(props.grade.uid, payload, validationContext())
      : store.addGrade(payload, validationContext())
  } catch {
    clearErrors()
    errors.form = 'The grade could not be saved. Please try again.'
    isSubmitting.value = false
    return
  }

  isSubmitting.value = false

  if (!result.ok) {
    clearErrors()
    Object.assign(errors, result.errors)

    const unmapped = Object.keys(result.errors).find((key) => key !== 'form' && !fieldIds[key])
    if (unmapped && !errors.form) errors.form = result.errors[unmapped]

    const firstField = Object.keys(result.errors).find((key) => fieldIds[key])
    if (firstField) document.getElementById(fieldIds[firstField])?.focus()
    return
  }

  emit('saved', {
    mode: isEdit.value ? 'edit' : 'add',
    grade: result.grade,
    persisted: result.persisted,
  })
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="modalTitle"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #subtitle>
      <p class="ch-modal-subtitle">
        Enter assessment scores from 0 to 100. Total, letter grade, GPA, and status are calculated
        automatically.
      </p>
    </template>

    <form :id="formId" class="student-form" novalidate @submit.prevent="handleSubmit">
      <div v-if="errors.form" class="form-alert" role="alert">
        <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
        {{ errors.form }}
      </div>

      <div v-if="studentDirectoryNotice" class="form-alert" role="status">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
        {{ studentDirectoryNotice }}
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label class="form-label" :for="fieldIds.sectionUid">
            Class section <span class="req" aria-hidden="true">*</span>
          </label>
          <select
            :id="fieldIds.sectionUid"
            v-model="form.sectionUid"
            class="form-select"
            :class="{ 'is-invalid': errors.sectionUid }"
            :disabled="isSubmitting"
            :aria-invalid="errors.sectionUid ? 'true' : 'false'"
            :aria-describedby="errors.sectionUid ? `${fieldIds.sectionUid}-error` : undefined"
            @change="clearError('sectionUid')"
          >
            <option value="" disabled>Select a class section</option>
            <option v-for="section in sectionChoices" :key="section.uid" :value="section.uid">
              {{ section.label }}
            </option>
          </select>
          <p v-if="errors.sectionUid" :id="`${fieldIds.sectionUid}-error`" class="field-error">
            {{ errors.sectionUid }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.studentUid">
            Student <span class="req" aria-hidden="true">*</span>
          </label>
          <select
            :id="fieldIds.studentUid"
            v-model="form.studentUid"
            class="form-select"
            :class="{ 'is-invalid': errors.studentUid }"
            :disabled="isSubmitting || !studentChoices.length"
            :aria-invalid="errors.studentUid ? 'true' : 'false'"
            :aria-describedby="errors.studentUid ? `${fieldIds.studentUid}-error` : undefined"
            @change="clearError('studentUid')"
          >
            <option value="" disabled>Select a student</option>
            <option v-for="student in studentChoices" :key="student.uid" :value="student.uid">
              {{ student.label }}
            </option>
          </select>
          <p v-if="errors.studentUid" :id="`${fieldIds.studentUid}-error`" class="field-error">
            {{ errors.studentUid }}
          </p>
          <p class="field-hint">{{ studentSourceNote }}</p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.subjectUid">
            Subject <span class="req" aria-hidden="true">*</span>
          </label>
          <select
            :id="fieldIds.subjectUid"
            v-model="form.subjectUid"
            class="form-select"
            :class="{ 'is-invalid': errors.subjectUid }"
            :disabled="isSubmitting"
            :aria-invalid="errors.subjectUid ? 'true' : 'false'"
            :aria-describedby="errors.subjectUid ? `${fieldIds.subjectUid}-error` : undefined"
            @change="clearError('subjectUid')"
          >
            <option value="" disabled>Select a subject</option>
            <option v-for="subject in subjectChoices" :key="subject.uid" :value="subject.uid">
              {{ subject.label }}
            </option>
          </select>
          <p v-if="errors.subjectUid" :id="`${fieldIds.subjectUid}-error`" class="field-error">
            {{ errors.subjectUid }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.semesterUid">
            Semester <span class="req" aria-hidden="true">*</span>
          </label>
          <select
            :id="fieldIds.semesterUid"
            v-model="form.semesterUid"
            class="form-select"
            :class="{ 'is-invalid': errors.semesterUid }"
            :disabled="isSubmitting"
            :aria-invalid="errors.semesterUid ? 'true' : 'false'"
            :aria-describedby="errors.semesterUid ? `${fieldIds.semesterUid}-error` : undefined"
            @change="clearError('semesterUid')"
          >
            <option value="" disabled>Select a semester</option>
            <option v-for="semester in semesterChoices" :key="semester.uid" :value="semester.uid">
              {{ semester.label }}
            </option>
          </select>
          <p v-if="errors.semesterUid" :id="`${fieldIds.semesterUid}-error`" class="field-error">
            {{ errors.semesterUid }}
          </p>
        </div>
      </div>

      <h3 class="score-heading">Assessment scores</h3>
      <div class="form-grid score-grid">
        <div v-for="field in ASSESSMENT_FIELDS" :key="field.key" class="form-field">
          <label class="form-label" :for="fieldIds[field.key]">
            {{ field.label }} ({{ Math.round(field.weight * 100) }}%)
            <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds[field.key]"
            v-model="form.scores[field.key]"
            type="number"
            min="0"
            max="100"
            step="0.1"
            inputmode="decimal"
            class="form-control"
            :class="{ 'is-invalid': errors[field.key] }"
            :placeholder="`0–100`"
            :disabled="isSubmitting"
            :aria-invalid="errors[field.key] ? 'true' : 'false'"
            :aria-describedby="errors[field.key] ? `${fieldIds[field.key]}-error` : undefined"
            @input="clearError(field.key)"
          />
          <p v-if="errors[field.key]" :id="`${fieldIds[field.key]}-error`" class="field-error">
            {{ errors[field.key] }}
          </p>
        </div>
      </div>

      <div class="calculated-preview" aria-live="polite">
        <div>
          <span>Total score</span>
          <strong>{{ formatScore(preview.totalScore) }}</strong>
        </div>
        <div>
          <span>Letter grade</span>
          <strong>{{ preview.letterGrade }}</strong>
        </div>
        <div>
          <span>GPA</span>
          <strong>{{ formatGpa(preview.gradePoints) }}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{{ gradeStatusLabel(preview.status) }}</strong>
        </div>
      </div>

      <p class="form-note">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
        {{ GRADE_SCALE_SUMMARY }}
      </p>
      <p class="form-note" :class="{ 'is-warning': storageNote.warning }">
        <i class="bi bi-hdd" aria-hidden="true"></i>
        {{ storageNote.text }}
      </p>
    </form>

    <template #footer>
      <button
        type="button"
        class="btn-ch btn-ch-soft"
        :disabled="isSubmitting"
        @click="emit('update:modelValue', false)"
      >
        Cancel
      </button>
      <button type="submit" :form="formId" class="btn-ch btn-ch-primary" :disabled="isSubmitting">
        <i
          class="bi"
          :class="isSubmitting ? 'bi-arrow-repeat' : 'bi-check2'"
          aria-hidden="true"
        ></i>
        {{ isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add grade' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.score-heading {
  margin: 1.25rem 0 0.75rem;
  font-size: 1rem;
  font-weight: 700;
}

.score-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.calculated-preview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.6rem;
  margin-top: 1.25rem;
  padding: 0.8rem;
  border-radius: 0.75rem;
  background: rgba(79, 70, 229, 0.08);
}

.calculated-preview span {
  display: block;
  color: var(--ch-muted, #64748b);
  font-size: 0.78rem;
}

.calculated-preview strong {
  display: block;
  margin-top: 0.15rem;
  font-size: 1.05rem;
}

@media (max-width: 767.98px) {
  .score-grid,
  .calculated-preview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
