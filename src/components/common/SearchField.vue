<script setup>
import { useId } from 'vue'

defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: 'Search',
  },
  placeholder: {
    type: String,
    default: 'Search…',
  },
})

const emit = defineEmits(['update:modelValue'])
const inputId = useId()

function handleInput(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="ch-field">
    <label class="ch-field-label" :for="inputId">{{ label }}</label>
    <div class="ch-search-input">
      <i class="bi bi-search" aria-hidden="true"></i>
      <input
        :id="inputId"
        :value="modelValue"
        type="search"
        :placeholder="placeholder"
        autocomplete="off"
        @input="handleInput"
      />
      <button
        v-if="modelValue"
        type="button"
        class="ch-search-clear"
        aria-label="Clear search"
        @click="emit('update:modelValue', '')"
      >
        <i class="bi bi-x-lg" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>
