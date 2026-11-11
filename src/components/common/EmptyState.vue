<script setup>
defineProps({
  icon: {
    type: String,
    default: 'bi-inbox',
  },
  title: {
    type: String,
    default: 'Nothing to show yet',
  },
  message: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="empty-state">
    <span class="empty-state-icon" aria-hidden="true">
      <i class="bi" :class="icon"></i>
    </span>
    <h3>{{ title }}</h3>
    <p v-if="message">{{ message }}</p>
    <div v-if="$slots.default" class="empty-state-actions">
      <slot />
    </div>
  </div>
</template>
