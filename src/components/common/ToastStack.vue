<script setup>
import { useToast } from '../../composables/useToast'

const { state, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack" aria-live="polite" aria-atomic="false">
      <div
        v-for="toast in state.toasts"
        :key="toast.id"
        class="ch-toast"
        :class="`is-${toast.variant}`"
        role="status"
      >
        <i class="bi ch-toast-icon" :class="toast.icon" aria-hidden="true"></i>
        <div class="ch-toast-body">
          <strong>{{ toast.title }}</strong>
          <span v-if="toast.message">{{ toast.message }}</span>
        </div>
        <button
          type="button"
          class="ch-toast-close"
          aria-label="Dismiss notification"
          @click="dismiss(toast.id)"
        >
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  </Teleport>
</template>
