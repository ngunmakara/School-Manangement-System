<script setup>
import { computed } from 'vue'
import BaseModal from '../common/BaseModal.vue'
import EmptyState from '../common/EmptyState.vue'
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
})

const emit = defineEmits(['update:modelValue', 'edit'])

const result = computed(() => calculateGradeResult(props.grade))

const detailGroups = computed(() => [
  { label: 'Student', value: props.grade?.studentName || 'Unknown student' },
  { label: 'Student ID', value: props.grade?.studentId || '—' },
  { label: 'Class section', value: props.grade?.sectionCode || 'Unknown section' },
  { label: 'Subject', value: props.grade?.subjectName || 'Unknown subject' },
  { label: 'Semester', value: props.grade?.semesterName || 'Unknown semester' },
  { label: 'Status', value: gradeStatusLabel(result.value.status) },
])
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Grade details"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #subtitle>
      <p class="ch-modal-subtitle">
        Weighted assessment breakdown and calculated result for this browser-only grade record.
      </p>
    </template>

    <div v-if="grade" class="grade-details">
      <div class="detail-grid">
        <div v-for="item in detailGroups" :key="item.label" class="detail-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>

      <div class="result-strip" aria-live="polite">
        <div>
          <span>Total score</span>
          <strong>{{ formatScore(result.totalScore) }}</strong>
        </div>
        <div>
          <span>Letter grade</span>
          <strong>{{ result.letterGrade }}</strong>
        </div>
        <div>
          <span>GPA points</span>
          <strong>{{ formatGpa(result.gradePoints) }}</strong>
        </div>
      </div>

      <h3 class="details-heading">Assessment breakdown</h3>
      <ul class="breakdown-list">
        <li v-for="field in ASSESSMENT_FIELDS" :key="field.key">
          <span>
            {{ field.label }}
            <small>{{ Math.round(field.weight * 100) }}% weight</small>
          </span>
          <strong>{{ formatScore(grade.scores?.[field.key]) }}</strong>
        </li>
      </ul>

      <p class="form-note">
        <i class="bi bi-info-circle" aria-hidden="true"></i>
        {{ GRADE_SCALE_SUMMARY }}
      </p>
    </div>

    <EmptyState
      v-else
      icon="bi-mortarboard"
      title="No grade selected"
      message="Select a grade record to view its calculation."
    />

    <template #footer>
      <button type="button" class="btn-ch btn-ch-soft" @click="emit('update:modelValue', false)">
        Close
      </button>
      <button
        v-if="grade"
        type="button"
        class="btn-ch btn-ch-primary"
        @click="emit('edit', grade)"
      >
        <i class="bi bi-pencil" aria-hidden="true"></i>
        Edit scores
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.detail-item {
  padding: 0.65rem 0.75rem;
  border-radius: 0.6rem;
  background: rgba(15, 23, 42, 0.04);
}

.detail-item span,
.result-strip span {
  display: block;
  color: var(--ch-muted, #64748b);
  font-size: 0.78rem;
}

.result-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 1rem;
}

.result-strip > div {
  padding: 0.75rem;
  border: 1px solid rgba(79, 70, 229, 0.18);
  border-radius: 0.75rem;
  text-align: center;
}

.result-strip strong {
  display: block;
  margin-top: 0.2rem;
  font-size: 1.25rem;
}

.details-heading {
  margin: 1.25rem 0 0.6rem;
  font-size: 1rem;
  font-weight: 700;
}

.breakdown-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.breakdown-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.breakdown-list small {
  display: block;
  color: var(--ch-muted, #64748b);
}

@media (max-width: 575.98px) {
  .detail-grid,
  .result-strip {
    grid-template-columns: 1fr;
  }
}
</style>
