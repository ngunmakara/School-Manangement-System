<script>
let openModalCount = 0

export function resetBodyScrollLock() {
  openModalCount = 0
  if (typeof document !== 'undefined') document.body.classList.remove('ch-modal-open')
}

function lockBodyScroll() {
  if (typeof document === 'undefined') return
  openModalCount += 1
  if (openModalCount === 1) document.body.classList.add('ch-modal-open')
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return
  openModalCount = Math.max(0, openModalCount - 1)
  if (openModalCount === 0) document.body.classList.remove('ch-modal-open')
}
</script>

<script setup>
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  describedBy: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md',
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
  closeOnEscape: {
    type: Boolean,
    default: undefined,
  },
  hideClose: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'close'])

const dialogRef = ref(null)
const titleId = useId()
let previousFocus = null
let scrollLocked = false

function canCloseOnEscape() {
  return props.closeOnEscape ?? props.closeOnBackdrop
}

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function handleBackdrop() {
  if (props.closeOnBackdrop) close()
}

function getFocusable() {
  if (!dialogRef.value) return []
  return Array.from(
    dialogRef.value.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  )
}

function focusFirst() {
  const preferred = dialogRef.value?.querySelector('[data-autofocus]')
  const focusable = getFocusable()
  ;(preferred || focusable[0] || dialogRef.value)?.focus()
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    if (canCloseOnEscape()) {
      event.stopPropagation()
      close()
    }
    return
  }

  if (event.key !== 'Tab') return

  const focusable = getFocusable()
  if (!focusable.length) {
    event.preventDefault()
    dialogRef.value?.focus()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function handleDocumentKeydown(event) {
  if (event.key !== 'Escape' || !props.modelValue || !canCloseOnEscape()) return
  event.stopPropagation()
  close()
}

function openDialog() {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  if (!scrollLocked) {
    lockBodyScroll()
    scrollLocked = true
  }
  document.addEventListener('keydown', handleDocumentKeydown)
  nextTick(focusFirst)
}

function closeDialog() {
  document.removeEventListener('keydown', handleDocumentKeydown)
  if (scrollLocked) {
    unlockBodyScroll()
    scrollLocked = false
  }
  if (previousFocus && typeof previousFocus.focus === 'function') {
    previousFocus.focus()
  }
  previousFocus = null
}

watch(
  () => props.modelValue,
  (open, wasOpen) => {
    if (open === wasOpen) return
    if (open) openDialog()
    else closeDialog()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleDocumentKeydown)
  if (scrollLocked) {
    unlockBodyScroll()
    scrollLocked = false
  }
})

defineExpose({ focusFirst })
</script>

<template>
  <Teleport to="body">
    <Transition name="ch-modal">
      <div v-if="modelValue" class="ch-modal-backdrop" @mousedown.self="handleBackdrop">
        <div
          ref="dialogRef"
          class="ch-modal"
          :class="`ch-modal-${size}`"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          :aria-describedby="describedBy || undefined"
          tabindex="-1"
          @keydown="handleKeydown"
        >
          <header class="ch-modal-head">
            <div class="ch-modal-heading">
              <h2 v-if="title" :id="titleId" class="ch-modal-title">{{ title }}</h2>
              <slot name="subtitle" />
            </div>
            <button
              v-if="!hideClose"
              type="button"
              class="ch-modal-close"
              aria-label="Close dialog"
              @click="close"
            >
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </header>

          <div class="ch-modal-body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="ch-modal-foot">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
