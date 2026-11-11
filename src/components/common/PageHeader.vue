<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  eyebrow: {
    type: String,
    default: '',
  },
  eyebrowIcon: {
    type: String,
    default: 'bi-calendar4-week',
  },
})
</script>

<template>
  <header class="page-header">
    <div>
      <div v-if="eyebrow" class="page-header-eyebrow">
        <i class="bi" :class="eyebrowIcon" aria-hidden="true"></i>
        {{ eyebrow }}
      </div>
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="description" class="page-description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>
