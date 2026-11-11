<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <section class="ch-card h-100">
    <div class="ch-card-header">
      <div>
        <h2 class="ch-card-title">{{ title }}</h2>
        <p v-if="subtitle" class="ch-card-subtitle">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </div>
    <div class="ch-card-body">
      <slot />
    </div>
  </section>
</template>
