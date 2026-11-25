<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppSidebar from '../components/layout/AppSidebar.vue'
import AppTopbar from '../components/layout/AppTopbar.vue'
import ToastStack from '../components/common/ToastStack.vue'
import { useSettingsStore } from '../stores/settings'

const MOBILE_MEDIA_QUERY = '(max-width: 991.98px)'

const route = useRoute()
const settingsStore = useSettingsStore()
const collapsed = ref(settingsStore.sidebarDefaultCollapsed)
const mobileOpen = ref(false)
const isMobile = ref(false)
const sidebarRef = ref(null)
const mobileTriggerRef = ref(null)
let mobileMedia = null
let previousMobileFocus = null

const sidebarHidden = computed(() => isMobile.value && !mobileOpen.value)

function resolveElement(target) {
  if (target instanceof HTMLElement) return target
  if (target?.$el instanceof HTMLElement) return target.$el
  if (target?.el instanceof HTMLElement) return target.el
  return null
}

function getFocusable(container) {
  const element = resolveElement(container)
  if (!element || typeof element.querySelectorAll !== 'function') return []
  return Array.from(
    element.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((node) => node instanceof HTMLElement && !node.hasAttribute('disabled'))
}

function focusMobileTrigger() {
  const trigger = resolveElement(mobileTriggerRef.value)
  if (trigger && typeof trigger.focus === 'function') trigger.focus()
}

function restoreMobileFocus() {
  const trigger = resolveElement(mobileTriggerRef.value)
  const target =
    previousMobileFocus && document.contains(previousMobileFocus) ? previousMobileFocus : trigger
  if (target && typeof target.focus === 'function') target.focus()
  previousMobileFocus = null
}

watch(
  () => settingsStore.sidebarDefaultCollapsed,
  (value) => {
    collapsed.value = value
  },
)

watch(
  () => route.fullPath,
  () => {
    if (!mobileOpen.value) return
    mobileOpen.value = false
    nextTick(() => {
      const sidebar = resolveElement(sidebarRef.value)
      if (sidebar?.contains(document.activeElement)) focusMobileTrigger()
      previousMobileFocus = null
    })
  },
)

function toggleCollapse() {
  collapsed.value = !collapsed.value
  settingsStore.updateSettings({ sidebarDefaultCollapsed: collapsed.value })
}

function toggleMobileSidebar() {
  if (!isMobile.value) return
  if (mobileOpen.value) {
    closeMobileSidebar()
    return
  }
  previousMobileFocus =
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  mobileOpen.value = true
  nextTick(() => {
    const focusable = getFocusable(sidebarRef.value)
    ;(focusable[0] || resolveElement(sidebarRef.value))?.focus?.()
  })
}

function closeMobileSidebar({ restoreFocus = false } = {}) {
  if (!mobileOpen.value) return
  mobileOpen.value = false
  nextTick(() => {
    if (restoreFocus) restoreMobileFocus()
    else if (resolveElement(sidebarRef.value)?.contains(document.activeElement)) focusMobileTrigger()
  })
}

function handleEscape(event) {
  if (event.key === 'Escape' && mobileOpen.value) {
    event.preventDefault()
    closeMobileSidebar({ restoreFocus: true })
  }
}

function handleSidebarKeydown(event) {
  if (!mobileOpen.value || !isMobile.value || event.key !== 'Tab') return

  const focusable = getFocusable(sidebarRef.value)
  if (!focusable.length) {
    event.preventDefault()
    resolveElement(sidebarRef.value)?.focus?.()
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

function handleMobileMediaChange(event) {
  isMobile.value = event.matches
  if (!isMobile.value) {
    mobileOpen.value = false
    previousMobileFocus = null
  }
}

onMounted(() => {
  settingsStore.loadSettings()
  collapsed.value = settingsStore.sidebarDefaultCollapsed

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    mobileMedia = window.matchMedia(MOBILE_MEDIA_QUERY)
    isMobile.value = mobileMedia.matches
    if (typeof mobileMedia.addEventListener === 'function') {
      mobileMedia.addEventListener('change', handleMobileMediaChange)
    } else if (typeof mobileMedia.addListener === 'function') {
      mobileMedia.addListener(handleMobileMediaChange)
    }
  }

  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEscape)
  if (mobileMedia) {
    if (typeof mobileMedia.removeEventListener === 'function') {
      mobileMedia.removeEventListener('change', handleMobileMediaChange)
    } else if (typeof mobileMedia.removeListener === 'function') {
      mobileMedia.removeListener(handleMobileMediaChange)
    }
  }
})
</script>

<template>
  <div
    class="app-shell"
    :class="{
      'is-collapsed': collapsed,
      'is-mobile-open': mobileOpen,
      'is-density-compact': settingsStore.tableDensity === 'compact',
    }"
  >
    <AppSidebar
      id="app-sidebar"
      ref="sidebarRef"
      :collapsed="collapsed"
      :mobile-open="mobileOpen"
      :is-mobile="isMobile"
      :hidden="sidebarHidden"
      @close="closeMobileSidebar"
      @toggle-collapse="toggleCollapse"
      @keydown="handleSidebarKeydown"
    />

    <div
      v-if="mobileOpen"
      class="sidebar-overlay"
      aria-hidden="true"
      @click="closeMobileSidebar({ restoreFocus: true })"
    ></div>

    <div class="app-main">
      <AppTopbar
        :collapsed="collapsed"
        :mobile-open="mobileOpen"
        @mobile-trigger-mounted="mobileTriggerRef = $event"
        @toggle-sidebar="toggleMobileSidebar"
        @toggle-collapse="toggleCollapse"
      />

      <main class="app-content">
        <RouterView />
      </main>

      <footer class="app-footer">
        <span>
          <i class="bi bi-mortarboard-fill" aria-hidden="true"></i>
          CampusHub · University Management System
        </span>
        <span>
          <i class="bi bi-info-circle" aria-hidden="true"></i>
          Mixed data sources — some modules use the CampusHub API while others store records in this browser.
        </span>
      </footer>
    </div>

    <ToastStack />
  </div>
</template>
