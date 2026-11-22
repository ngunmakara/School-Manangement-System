<script setup>
import StatusBadge from '../common/StatusBadge.vue'
import {
  ASSESSMENT_FIELDS,
  formatGpa,
  formatScore,
  gradeStatusLabel,
} from '../../utils/grades'

const props = defineProps({
  grades: {
    type: Array,
    default: () => [],
  },
  sortKey: {
    type: String,
    default: 'studentName',
  },
  sortDir: {
    type: String,
    default: 'asc',
  },
})

const emit = defineEmits(['sort', 'view', 'edit', 'delete'])

const columns = [
  { key: 'studentName', label: 'Student' },
  { key: 'sectionCode', label: 'Section' },
  { key: 'subjectName', label: 'Subject' },
  { key: 'totalScore', label: 'Total' },
  { key: 'letterGrade', label: 'Grade' },
  { key: 'gpa', label: 'GPA' },
  { key: 'status', label: 'Status' },
]

function sortAria(key) {
  if (props.sortKey !== key) return 'none'
  return props.sortDir === 'asc' ? 'ascending' : 'descending'
}

function sortIcon(key) {
  if (props.sortKey !== key) return 'bi-arrow-down-up'
  return props.sortDir === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'
}

function sortLabel(key, label) {
  const state = sortAria(key)
  if (state === 'none') return `Sort by ${label}`

  const nextState = state === 'ascending' ? 'descending' : 'ascending'
  return `Sort by ${label}, currently ${state}. Activate to sort ${nextState}.`
}

function badgeStatus(record) {
  return record.status === 'Pass' ? 'present' : 'absent'
}

function scoreSummary(record) {
  return ASSESSMENT_FIELDS.map(
    (field) => `${field.label} ${formatScore(record.scores?.[field.key])}`,
  ).join(', ')
}
</script>

<template>
  <div class="table-responsive">
    <table class="ch-table student-table grades-table">
      <caption class="visually-hidden">
        Student grades and GPA records
      </caption>
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            :aria-sort="sortAria(column.key)"
          >
            <button
              type="button"
              class="th-sort"
              :aria-label="sortLabel(column.key, column.label)"
              @click="emit('sort', column.key)"
            >
              {{ column.label }}
              <i class="bi" :class="sortIcon(column.key)" aria-hidden="true"></i>
            </button>
          </th>
          <th scope="col">Assessment scores</th>
          <th scope="col" class="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="record in grades" :key="record.uid">
          <td>
            <div class="cell-primary">
              <span class="department-mark" aria-hidden="true">
                <i class="bi bi-mortarboard"></i>
              </span>
              <div class="cell-primary-text">
                <strong>{{ record.studentName }}</strong>
                <span>{{ record.studentId }}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="cell-primary-text">
              <strong>{{ record.sectionCode }}</strong>
              <span>{{ record.semesterName }}</span>
            </div>
          </td>
          <td>
            <div class="cell-primary-text">
              <strong>{{ record.subjectName }}</strong>
              <span>{{ record.subjectCode || 'Subject' }}</span>
            </div>
          </td>
          <td class="text-nowrap fw-semibold">{{ formatScore(record.totalScore) }}</td>
          <td>
            <span class="grade-letter" :class="`is-${record.letterGrade}`">
              {{ record.letterGrade }}
            </span>
          </td>
          <td class="text-nowrap">{{ formatGpa(record.gpa) }}</td>
          <td>
            <StatusBadge :status="badgeStatus(record)" :label="gradeStatusLabel(record.status)" />
          </td>
          <td>
            <div class="grades-scores" :aria-label="scoreSummary(record)">
              <div v-for="field in ASSESSMENT_FIELDS" :key="field.key" class="score-chip">
                <span>{{ field.shortLabel }}</span>
                <strong>{{ formatScore(record.scores?.[field.key]) }}</strong>
              </div>
            </div>
          </td>
          <td>
            <div class="row-actions">
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`View grade details for ${record.studentName}`"
                title="View grade details"
                @click="emit('view', record)"
              >
                <i class="bi bi-eye" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn"
                :aria-label="`Edit grade for ${record.studentName}`"
                title="Edit grade"
                @click="emit('edit', record)"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="row-action-btn is-danger"
                :aria-label="`Delete grade for ${record.studentName}`"
                title="Delete grade"
                @click="emit('delete', record)"
              >
                <i class="bi bi-trash3" aria-hidden="true"></i>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.grade-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  min-height: 2rem;
  border-radius: 0.65rem;
  font-weight: 700;
  background: var(--ch-soft-indigo, #eef2ff);
  color: var(--ch-indigo, #4f46e5);
}

.grade-letter.is-F {
  background: var(--ch-soft-red, #fff1f2);
  color: var(--ch-red, #e11d48);
}

.grades-scores {
  display: grid;
  grid-template-columns: repeat(2, minmax(4.5rem, 1fr));
  gap: 0.35rem;
  min-width: 11rem;
}

.score-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0.45rem;
  border-radius: 0.4rem;
  background: rgba(99, 102, 241, 0.08);
  font-size: 0.78rem;
}

.score-chip span {
  color: var(--ch-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

@media (max-width: 767.98px) {
  .grades-scores {
    grid-template-columns: repeat(4, minmax(3.5rem, 1fr));
    min-width: 15rem;
  }
}
</style>
