<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: 'bi-graph-up',
  },
  tone: {
    type: String,
    default: 'indigo',
  },
  delta: {
    type: String,
    default: '',
  },
  direction: {
    type: String,
    default: 'flat',
  },
  note: {
    type: String,
    default: '',
  },
})

const deltaIcon = computed(() => {
  if (props.direction === 'up') return 'bi-arrow-up-right'
  if (props.direction === 'down') return 'bi-arrow-down-right'
  return 'bi-dash'
})
</script>

<template>
  <article class="stat-card">
    <div class="stat-card-top">
      <div>
        <p class="stat-label">{{ label }}</p>
        <p class="stat-value">{{ value }}</p>
      </div>
      <span class="stat-icon" :class="`tone-${tone}`" aria-hidden="true">
        <i class="bi" :class="icon"></i>
      </span>
    </div>
    <div class="stat-foot">
      <span v-if="delta" class="stat-delta" :class="`is-${direction}`">
        <i class="bi" :class="deltaIcon" aria-hidden="true"></i>
        {{ delta }}
      </span>
      <span v-if="note">{{ note }}</span>
    </div>
  </article>
</template>
