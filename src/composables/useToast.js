import { reactive } from 'vue'

const state = reactive({
  toasts: [],
})

const ICONS = {
  info: 'bi-info-circle',
  success: 'bi-check-circle',
  warning: 'bi-exclamation-triangle',
  danger: 'bi-x-circle',
}

let nextId = 1

function dismiss(id) {
  const index = state.toasts.findIndex((toast) => toast.id === id)
  if (index !== -1) {
    state.toasts.splice(index, 1)
  }
}

function push({ title, message = '', variant = 'info', timeout = 4000 }) {
  const id = nextId++
  state.toasts.push({
    id,
    title,
    message,
    variant,
    icon: ICONS[variant] || ICONS.info,
  })

  if (timeout > 0) {
    window.setTimeout(() => dismiss(id), timeout)
  }

  return id
}

export function useToast() {
  return { state, push, dismiss }
}
