<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    default: '',
  },
})

const VARIANT_MAP = {
  active: 'success',
  present: 'success',
  paid: 'success',
  completed: 'success',
  published: 'success',
  pending: 'warning',
  late: 'warning',
  partial: 'warning',
  draft: 'neutral',
  scheduled: 'info',
  upcoming: 'info',
  excused: 'info',
  excused_absence: 'info',
  archived: 'neutral',
  inactive: 'danger',
  absent: 'danger',
  overdue: 'danger',
  unpaid: 'danger',
  dropped: 'danger',
}

const variant = computed(() => VARIANT_MAP[props.status.toLowerCase()] || 'neutral')
const text = computed(() => props.label || props.status)
</script>

<template>
  <span class="status-badge" :class="`is-${variant}`">{{ text }}</span>
</template>
