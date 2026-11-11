<script setup>
import { useId } from 'vue'

defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: 'Filter',
  },
  options: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue'])
const selectId = useId()
</script>

<template>
  <div class="ch-field">
    <label class="ch-field-label" :for="selectId">{{ label }}</label>
    <select
      :id="selectId"
      class="form-select ch-filter-select"
      :value="modelValue"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>
