<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppSidebar from '../components/layout/AppSidebar.vue'
import AppTopbar from '../components/layout/AppTopbar.vue'
import ToastStack from '../components/common/ToastStack.vue'

const STORAGE_KEY = 'campushub:sidebar-collapsed'

const route = useRoute()
const collapsed = ref(
  typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === '1',
)
const mobileOpen = ref(false)

watch(collapsed, (value) => {
  window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
})

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  },
)

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

function toggleMobileSidebar() {
  mobileOpen.value = !mobileOpen.value
}

function closeMobileSidebar() {
  mobileOpen.value = false
}

function handleEscape(event) {
  if (event.key === 'Escape') {
    mobileOpen.value = false
  }
}

onMounted(() => document.addEventListener('keydown', handleEscape))
onBeforeUnmount(() => document.removeEventListener('keydown', handleEscape))
</script>

<template>
  <div
    class="app-shell"
    :class="{ 'is-collapsed': collapsed, 'is-mobile-open': mobileOpen }"
  >
    <AppSidebar
      :collapsed="collapsed"
      @close="closeMobileSidebar"
      @toggle-collapse="toggleCollapse"
    />

    <div
      class="sidebar-overlay"
      aria-hidden="true"
      @click="closeMobileSidebar"
    ></div>

    <div class="app-main">
      <AppTopbar
        :collapsed="collapsed"
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
          Frontend demo — all data is generated locally in your browser.
        </span>
      </footer>
    </div>

    <ToastStack />
  </div>
</template>
