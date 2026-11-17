import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createUniqueSectionUid,
  normalizeStoredSections,
  sanitizeSectionInput,
  validateSectionRecord,
} from '../utils/sections'

const STORAGE_KEY = 'campushub:sections:v1'
const LOAD_ERROR = 'Section records could not be loaded from browser storage.'
const STORAGE_UNAVAILABLE =
  'Browser storage could not be accessed. Changes will last for this session only.'
const STORAGE_WRITE_FAILED =
  'Browser storage is not accepting section saves. Changes will last for this session only.'

function getStorage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage || null
  } catch {
    return null
  }
}

function readStoredSections() {
  const storage = getStorage()
  if (!storage) {
    return {
      records: null,
      storageState: 'unavailable',
      recovery: null,
      storageError: STORAGE_UNAVAILABLE,
    }
  }

  let raw

  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return {
      records: null,
      storageState: 'unavailable',
      recovery: null,
      storageError: STORAGE_UNAVAILABLE,
    }
  }

  if (raw === null) {
    return { records: null, storageState: 'ok', recovery: null }
  }

  let parsed

  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      records: null,
      storageState: 'recovered',
      recovery: {
        kind: 'invalid-json',
        discarded: 0,
        corrected: 0,
        duplicateUids: 0,
        duplicateCodes: 0,
      },
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      records: null,
      storageState: 'recovered',
      recovery: {
        kind: 'invalid-format',
        discarded: 0,
        corrected: 0,
        duplicateUids: 0,
        duplicateCodes: 0,
      },
    }
  }

  const normalized = normalizeStoredSections(parsed)
  const recovered = normalized.discarded > 0 || normalized.corrected > 0

  return {
    records: normalized.records,
    storageState: recovered ? 'recovered' : 'ok',
    recovery: recovered ? { kind: 'records', ...normalized } : null,
  }
}

export const useSectionsStore = defineStore('sections', () => {
  const initial = readStoredSections()
  const sections = ref(initial.records ?? [])
  const storageState = ref(initial.storageState)
  const recovery = ref(initial.recovery)
  const persistenceState = ref(initial.storageState === 'unavailable' ? 'unavailable' : 'ok')
  const persistenceError = ref(initial.storageError || '')
  const loadState = ref('ready')
  const loadError = ref('')
  const source = ref('local')
  let hasUnpersistedChanges = false

  function persist() {
    const storage = getStorage()
    if (!storage) {
      storageState.value = 'unavailable'
      persistenceState.value = 'unavailable'
      persistenceError.value = STORAGE_UNAVAILABLE
      hasUnpersistedChanges = true
      return false
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(sections.value))
      persistenceState.value = 'ok'
      persistenceError.value = ''
      hasUnpersistedChanges = false
      return true
    } catch {
      persistenceState.value = 'failed'
      persistenceError.value = STORAGE_WRITE_FAILED
      hasUnpersistedChanges = true
      return false
    }
  }

  const totalSections = computed(() => sections.value.length)
  const activeSections = computed(
    () => sections.value.filter((section) => section.status === 'Active').length,
  )
  const inactiveSections = computed(
    () => sections.value.filter((section) => section.status === 'Inactive').length,
  )
  const totalCapacity = computed(() =>
    sections.value.reduce((sum, section) => sum + (Number(section.capacity) || 0), 0),
  )
  const semesterCount = computed(
    () => new Set(sections.value.map((section) => section.semesterUid).filter(Boolean)).size,
  )
  const teacherCount = computed(
    () => new Set(sections.value.map((section) => section.teacherUid).filter(Boolean)).size,
  )

  function loadSections() {
    loadState.value = 'loading'
    loadError.value = ''

    try {
      const next = readStoredSections()
      const preserveSessionChanges = hasUnpersistedChanges

      if (!preserveSessionChanges) {
        if (next.storageState !== 'unavailable') {
          sections.value = next.records ?? []
        }
        recovery.value = next.recovery
      }

      if (next.storageState === 'unavailable') {
        persistenceState.value = 'unavailable'
        persistenceError.value = next.storageError || STORAGE_UNAVAILABLE
      } else if (persistenceState.value === 'unavailable') {
        persistenceState.value = 'ok'
        persistenceError.value = ''
      }

      storageState.value = next.storageState
      loadState.value = 'ready'

      if (preserveSessionChanges) {
        if (next.storageState !== 'unavailable') persist()
      } else if (next.storageState === 'recovered') {
        persist()
      }

      return true
    } catch {
      loadState.value = 'error'
      loadError.value = LOAD_ERROR
      return false
    }
  }

  function addSection(input) {
    const errors = validateSectionRecord(input, sections.value)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    const values = sanitizeSectionInput(input)
    const now = new Date().toISOString()
    const section = {
      uid: createUniqueSectionUid(new Set(sections.value.map((record) => record.uid))),
      ...values,
      createdAt: now,
      updatedAt: now,
    }

    sections.value = [section, ...sections.value]
    const persisted = persist()
    return { ok: true, section, persisted }
  }

  function updateSection(uid, input) {
    const existing = sections.value.find((section) => section.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This section no longer exists.' } }
    }

    const values = sanitizeSectionInput(input)
    const errors = validateSectionRecord(input, sections.value, uid)
    if (Object.keys(errors).length) {
      return { ok: false, errors }
    }

    const section = {
      ...existing,
      ...values,
      updatedAt: new Date().toISOString(),
    }

    sections.value = sections.value.map((record) => (record.uid === uid ? section : record))
    const persisted = persist()
    return { ok: true, section, persisted }
  }

  function deleteSection(uid) {
    const existing = sections.value.find((section) => section.uid === uid)
    if (!existing) {
      return { ok: false, errors: { form: 'This section no longer exists.' } }
    }

    sections.value = sections.value.filter((section) => section.uid !== uid)
    const persisted = persist()
    return { ok: true, section: existing, persisted }
  }

  return {
    sections,
    source,
    storageState,
    recovery,
    persistenceState,
    persistenceError,
    loadState,
    loadError,
    totalSections,
    activeSections,
    inactiveSections,
    totalCapacity,
    semesterCount,
    teacherCount,
    loadSections,
    addSection,
    updateSection,
    deleteSection,
  }
})
