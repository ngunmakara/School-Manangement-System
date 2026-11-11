<script setup>
import BaseModal from './BaseModal.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Confirm action',
  },
  message: {
    type: String,
    default: '',
  },
  confirmLabel: {
    type: String,
    default: 'Confirm',
  },
  cancelLabel: {
    type: String,
    default: 'Cancel',
  },
  variant: {
    type: String,
    default: 'danger',
  },
  busy: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

function cancel() {
  if (props.busy) return
  emit('update:modelValue', false)
  emit('cancel')
}

function confirm() {
  if (props.busy) return
  emit('confirm')
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="title"
    size="sm"
    :close-on-backdrop="!busy"
    :hide-close="busy"
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('cancel')"
  >
    <div class="confirm-body">
      <span class="confirm-icon" :class="`is-${variant}`" aria-hidden="true">
        <i class="bi" :class="variant === 'danger' ? 'bi-exclamation-triangle' : 'bi-question-circle'"></i>
      </span>
      <div class="confirm-copy">
        <p v-if="message">{{ message }}</p>
        <slot />
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn-ch btn-ch-soft" :disabled="busy" @click="cancel">
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        class="btn-ch"
        :class="variant === 'danger' ? 'btn-ch-danger' : 'btn-ch-primary'"
        :disabled="busy"
        @click="confirm"
      >
        <i v-if="busy" class="bi bi-arrow-repeat" aria-hidden="true"></i>
        {{ confirmLabel }}
      </button>
    </template>
  </BaseModal>
</template>
