<script setup>
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import { useSectionsStore } from '../../stores/sections'
import { useSubjectsStore } from '../../stores/subjects'
import { useSemestersStore } from '../../stores/semesters'
import { useTeachersStore } from '../../stores/teachers'
import { SECTION_LIMITS, SECTION_STATUSES } from '../../utils/sections'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  section: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const store = useSectionsStore()
const subjectsStore = useSubjectsStore()
const semestersStore = useSemestersStore()
const teachersStore = useTeachersStore()
const formId = 'section-form'

const fieldIds = {
  code: 'section-field-code',
  subjectUid: 'section-field-subject',
  teacherUid: 'section-field-teacher',
  semesterUid: 'section-field-semester',
  room: 'section-field-room',
  schedule: 'section-field-schedule',
  capacity: 'section-field-capacity',
  status: 'section-field-status',
  description: 'section-field-description',
}

function blankForm() {
  return {
    code: '',
    subjectUid: '',
    teacherUid: '',
    teacherName: '',
    semesterUid: '',
    room: '',
    schedule: '',
    capacity: '',
    status: 'Active',
    description: '',
  }
}

const form = reactive(blankForm())
const errors = reactive({})
const isSubmitting = ref(false)
const showDiscardWarning = ref(false)
const initialSnapshot = ref('')
const isEdit = computed(() => Boolean(props.section))
const modalTitle = computed(() => (isEdit.value ? 'Edit section' : 'Add section'))

function serializeForm() {
  return JSON.stringify({
    code: form.code,
    subjectUid: form.subjectUid,
    teacherUid: form.teacherUid,
    teacherName: form.teacherName,
    semesterUid: form.semesterUid,
    room: form.room,
    schedule: form.schedule,
    capacity: form.capacity,
    status: form.status,
    description: form.description,
  })
}

const isDirty = computed(
  () => initialSnapshot.value !== '' && serializeForm() !== initialSnapshot.value,
)

const storageNote = computed(() => {
  if (store.storageState === 'unavailable' || store.persistenceState === 'unavailable') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is unavailable. This section will last for this session only.',
    }
  }

  if (store.persistenceState === 'failed') {
    return {
      warning: true,
      icon: 'bi-exclamation-triangle',
      text: 'Browser storage is not accepting saves. Section changes will last for this session only.',
    }
  }

  return {
    warning: false,
    icon: 'bi-hdd',
    text: "Section records are stored in this browser's localStorage. Teacher choices are loaded from the CampusHub Teachers API.",
  }
})

const subjectChoices = computed(() => {
  const options = [...subjectsStore.subjects]
    .sort((left, right) =>
      String(left.code ?? '').localeCompare(String(right.code ?? ''), 'en', {
        sensitivity: 'base',
        numeric: true,
      }),
    )
    .map((subject) => ({
      uid: subject.uid,
      label: `${subject.code} · ${subject.name}`,
    }))

  if (form.subjectUid && !options.some((option) => option.uid === form.subjectUid)) {
    options.unshift({
      uid: form.subjectUid,
      label: `Unknown subject (${form.subjectUid})`,
    })
  }

  return options
})

const teacherChoices = computed(() => {
  const options = teachersStore.teacherOptions.map((teacher) => ({
    uid: teacher.uid,
    label: `${teacher.fullName}${teacher.department ? ` · ${teacher.department}` : ''}`,
  }))

  if (form.teacherUid && !options.some((option) => option.uid === form.teacherUid)) {
    options.unshift({
      uid: form.teacherUid,
      label: `${form.teacherName || 'Unknown teacher'} (not in current directory)`,
    })
  }

  return options
})

const semesterChoices = computed(() => {
  const options = [...semestersStore.semesters]
    .sort((left, right) =>
      String(right.startDate ?? '').localeCompare(String(left.startDate ?? '')),
    )
    .map((semester) => ({
      uid: semester.uid,
      label: `${semester.name} · ${semester.academicYear}`,
    }))

  if (form.semesterUid && !options.some((option) => option.uid === form.semesterUid)) {
    options.unshift({
      uid: form.semesterUid,
      label: `Unknown semester (${form.semesterUid})`,
    })
  }

  return options
})

const subjectSourceNote = computed(() =>
  subjectsStore.subjects.length
    ? "Subjects are loaded from this browser's Subject catalog."
    : 'No subjects are available yet. Add a subject before creating a section.',
)

const semesterSourceNote = computed(() =>
  semestersStore.semesters.length
    ? "Semesters are loaded from this browser's Semester calendar."
    : 'No semesters are available yet. Add a semester before creating a section.',
)

const teacherSourceNote = computed(() => {
  if (teachersStore.optionsState === 'loading') return 'Loading teachers from the CampusHub API…'
  if (teachersStore.optionsState === 'error') return 'Teacher directory unavailable.'
  if (!teachersStore.teacherOptions.length) {
    return 'No teachers are available from the CampusHub Teachers API.'
  }
  return 'Teachers are loaded from the CampusHub Teachers API.'
})

function clearErrors() {
  Object.keys(errors).forEach((key) => delete errors[key])
}

function clearError(field) {
  if (errors[field]) delete errors[field]
  if (errors.form) delete errors.form
}

function syncTeacherName() {
  const teacher = teachersStore.teacherOptions.find((option) => option.uid === form.teacherUid)
  if (teacher) form.teacherName = teacher.fullName
  else if (!form.teacherUid) form.teacherName = ''
}

function handleTeacherChange() {
  clearError('teacherUid')
  syncTeacherName()
}

function loadReferenceData() {
  subjectsStore.loadSubjects()
  semestersStore.loadSemesters()
  teachersStore.loadTeacherOptions()
}

function retryTeacherOptions() {
  teachersStore.loadTeacherOptions(true)
}

function resetForm() {
  Object.assign(form, blankForm())

  if (props.section) {
    Object.assign(form, {
      code: props.section.code,
      subjectUid: props.section.subjectUid,
      teacherUid: props.section.teacherUid,
      teacherName: props.section.teacherName,
      semesterUid: props.section.semesterUid,
      room: props.section.room,
      schedule: props.section.schedule,
      capacity: props.section.capacity,
      status: props.section.status,
      description: props.section.description,
    })
  }

  clearErrors()
  showDiscardWarning.value = false
  initialSnapshot.value = serializeForm()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
      loadReferenceData()
    }
  },
)

watch(
  () => props.section,
  () => {
    if (props.modelValue) resetForm()
  },
)

function close() {
  emit('update:modelValue', false)
}

function requestClose() {
  if (!isDirty.value) {
    close()
    return
  }

  showDiscardWarning.value = true
}

function cancelDiscard() {
  showDiscardWarning.value = false
}

function discardChanges() {
  showDiscardWarning.value = false
  close()
}

function handleModalUpdate(value) {
  if (value) {
    emit('update:modelValue', value)
    return
  }

  requestClose()
}

async function handleSubmit() {
  if (isSubmitting.value) return

  syncTeacherName()
  isSubmitting.value = true

  let result
  try {
    result = isEdit.value
      ? await store.updateSection(props.section.uid, form)
      : await store.addSection(form)
  } catch {
    isSubmitting.value = false
    return
  }

  isSubmitting.value = false

  if (!result.ok) {
    clearErrors()
    Object.assign(errors, result.errors)
    const firstField = Object.keys(result.errors).find((key) => fieldIds[key])
    if (firstField) document.getElementById(fieldIds[firstField])?.focus()
    return
  }

  emit('saved', {
    mode: isEdit.value ? 'edit' : 'add',
    section: result.section,
    persisted: result.persisted,
  })
  showDiscardWarning.value = false
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="modalTitle"
    size="md"
    @update:model-value="handleModalUpdate"
  >
    <template #subtitle>
      <p class="ch-modal-subtitle">
        {{
          isEdit
            ? 'Update the section assignment, schedule, or capacity.'
            : 'Create a new class section and assign its subject, teacher, and term.'
        }}
      </p>
    </template>

    <form :id="formId" class="student-form" novalidate @submit.prevent="handleSubmit">
      <div v-if="showDiscardWarning" class="ch-alert is-warning" role="alert">
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
        <div>
          <strong>Discard unsaved changes?</strong>
          <span class="d-block">Your edits to this section have not been saved yet.</span>
          <div class="d-flex flex-wrap gap-2 mt-2">
            <button type="button" class="btn-ch btn-ch-soft btn-ch-sm" @click="cancelDiscard">
              Keep editing
            </button>
            <button type="button" class="btn-ch btn-ch-ghost btn-ch-sm" @click="discardChanges">
              Discard changes
            </button>
          </div>
        </div>
      </div>

      <div v-if="errors.form" class="form-alert" role="alert">
        <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
        {{ errors.form }}
      </div>

      <div v-if="teachersStore.optionsState === 'error'" class="form-alert" role="alert">
        <i class="bi bi-person-x" aria-hidden="true"></i>
        <div>
          <span>{{ teachersStore.optionsError }}</span>
          <button
            type="button"
            class="btn-ch btn-ch-soft btn-ch-sm ms-2"
            @click="retryTeacherOptions"
          >
            <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
            Retry
          </button>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label class="form-label" :for="fieldIds.code">
            Section code <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.code"
            v-model.trim="form.code"
            type="text"
            class="form-control text-uppercase"
            :class="{ 'is-invalid': errors.code }"
            placeholder="CS101-A"
            autocomplete="off"
            :maxlength="SECTION_LIMITS.codeMaxLength"
            :aria-invalid="errors.code ? 'true' : 'false'"
            :aria-describedby="errors.code ? `${fieldIds.code}-error` : undefined"
            data-autofocus
            @input="clearError('code')"
          />
          <p v-if="errors.code" :id="`${fieldIds.code}-error`" class="field-error">
            {{ errors.code }}
          </p>
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
            :aria-invalid="errors.subjectUid ? 'true' : 'false'"
            :aria-describedby="errors.subjectUid ? `${fieldIds.subjectUid}-error` : undefined"
            @change="clearError('subjectUid')"
          >
            <option value="" disabled>Select a subject</option>
            <option v-for="option in subjectChoices" :key="option.uid" :value="option.uid">
              {{ option.label }}
            </option>
          </select>
          <p v-if="errors.subjectUid" :id="`${fieldIds.subjectUid}-error`" class="field-error">
            {{ errors.subjectUid }}
          </p>
          <p class="field-hint">{{ subjectSourceNote }}</p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.teacherUid">
            Teacher <span class="req" aria-hidden="true">*</span>
          </label>
          <select
            :id="fieldIds.teacherUid"
            v-model="form.teacherUid"
            class="form-select"
            :class="{ 'is-invalid': errors.teacherUid }"
            :disabled="teachersStore.optionsState === 'loading'"
            :aria-invalid="errors.teacherUid ? 'true' : 'false'"
            :aria-describedby="errors.teacherUid ? `${fieldIds.teacherUid}-error` : undefined"
            @change="handleTeacherChange"
          >
            <option value="" disabled>Select a teacher</option>
            <option v-for="option in teacherChoices" :key="option.uid" :value="option.uid">
              {{ option.label }}
            </option>
          </select>
          <p v-if="errors.teacherUid" :id="`${fieldIds.teacherUid}-error`" class="field-error">
            {{ errors.teacherUid }}
          </p>
          <p class="field-hint">{{ teacherSourceNote }}</p>
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
            :aria-invalid="errors.semesterUid ? 'true' : 'false'"
            :aria-describedby="errors.semesterUid ? `${fieldIds.semesterUid}-error` : undefined"
            @change="clearError('semesterUid')"
          >
            <option value="" disabled>Select a semester</option>
            <option v-for="option in semesterChoices" :key="option.uid" :value="option.uid">
              {{ option.label }}
            </option>
          </select>
          <p v-if="errors.semesterUid" :id="`${fieldIds.semesterUid}-error`" class="field-error">
            {{ errors.semesterUid }}
          </p>
          <p class="field-hint">{{ semesterSourceNote }}</p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.room">
            Room <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.room"
            v-model.trim="form.room"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': errors.room }"
            placeholder="Room 101"
            autocomplete="off"
            :maxlength="SECTION_LIMITS.roomMaxLength"
            :aria-invalid="errors.room ? 'true' : 'false'"
            :aria-describedby="errors.room ? `${fieldIds.room}-error` : undefined"
            @input="clearError('room')"
          />
          <p v-if="errors.room" :id="`${fieldIds.room}-error`" class="field-error">
            {{ errors.room }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.schedule">
            Schedule <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.schedule"
            v-model.trim="form.schedule"
            type="text"
            class="form-control"
            :class="{ 'is-invalid': errors.schedule }"
            placeholder="Mon 09:00 - 10:00"
            autocomplete="off"
            :maxlength="SECTION_LIMITS.scheduleMaxLength"
            :aria-invalid="errors.schedule ? 'true' : 'false'"
            :aria-describedby="errors.schedule ? `${fieldIds.schedule}-error` : undefined"
            @input="clearError('schedule')"
          />
          <p v-if="errors.schedule" :id="`${fieldIds.schedule}-error`" class="field-error">
            {{ errors.schedule }}
          </p>
          <p class="field-hint">Schedule is free text, such as “Tue/Thu 13:30 - 15:00”.</p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.capacity">
            Capacity <span class="req" aria-hidden="true">*</span>
          </label>
          <input
            :id="fieldIds.capacity"
            v-model.number="form.capacity"
            type="number"
            class="form-control"
            :class="{ 'is-invalid': errors.capacity }"
            min="1"
            step="1"
            placeholder="30"
            :aria-invalid="errors.capacity ? 'true' : 'false'"
            :aria-describedby="errors.capacity ? `${fieldIds.capacity}-error` : undefined"
            @input="clearError('capacity')"
          />
          <p v-if="errors.capacity" :id="`${fieldIds.capacity}-error`" class="field-error">
            {{ errors.capacity }}
          </p>
        </div>

        <div class="form-field">
          <label class="form-label" :for="fieldIds.status">Status</label>
          <select
            :id="fieldIds.status"
            v-model="form.status"
            class="form-select"
            :class="{ 'is-invalid': errors.status }"
            :aria-invalid="errors.status ? 'true' : 'false'"
            :aria-describedby="errors.status ? `${fieldIds.status}-error` : undefined"
            @change="clearError('status')"
          >
            <option v-for="status in SECTION_STATUSES" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
          <p v-if="errors.status" :id="`${fieldIds.status}-error`" class="field-error">
            {{ errors.status }}
          </p>
        </div>

        <div class="form-field is-full">
          <label class="form-label" :for="fieldIds.description">
            Description <span class="field-optional">optional</span>
          </label>
          <textarea
            :id="fieldIds.description"
            v-model.trim="form.description"
            class="form-control"
            :class="{ 'is-invalid': errors.description }"
            rows="3"
            :maxlength="SECTION_LIMITS.descriptionMaxLength"
            placeholder="Add notes about the section, meeting pattern, or learning space."
            :aria-invalid="errors.description ? 'true' : 'false'"
            :aria-describedby="errors.description ? `${fieldIds.description}-error` : undefined"
            @input="clearError('description')"
          ></textarea>
          <p v-if="errors.description" :id="`${fieldIds.description}-error`" class="field-error">
            {{ errors.description }}
          </p>
          <p class="field-hint">
            {{ form.description.length }}/{{ SECTION_LIMITS.descriptionMaxLength }} characters
          </p>
        </div>
      </div>

      <p class="form-note" :class="{ 'is-warning': storageNote.warning }">
        <i class="bi" :class="storageNote.icon" aria-hidden="true"></i>
        {{ storageNote.text }}
      </p>
    </form>

    <template #footer>
      <button type="button" class="btn-ch btn-ch-soft" @click="requestClose">Cancel</button>
      <button type="submit" :form="formId" class="btn-ch btn-ch-primary" :disabled="isSubmitting">
        <i
          class="bi"
          :class="isSubmitting ? 'bi-arrow-repeat' : 'bi-check2'"
          aria-hidden="true"
        ></i>
        {{ isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add section' }}
      </button>
    </template>
  </BaseModal>
</template>
