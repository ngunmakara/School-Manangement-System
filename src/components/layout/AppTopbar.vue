<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { currentUser, notifications as demoNotifications } from '../../data/demoData'
import { searchablePages } from '../../data/navigation'
import { useToast } from '../../composables/useToast'

defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggle-sidebar', 'toggle-collapse'])

const route = useRoute()
const router = useRouter()
const { push: toast } = useToast()

const pageTitle = computed(() => route.meta.title || 'CampusHub')
const pageGroup = computed(() => route.meta.group || 'Overview')

const searchRoot = ref(null)
const searchInput = ref(null)
const searchTerm = ref('')
const searchOpen = ref(false)
const searchSelected = ref(0)
const mobileSearchVisible = ref(false)

const searchResults = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  const matches = term
    ? searchablePages.filter(
        (page) =>
          page.label.toLowerCase().includes(term) ||
          page.group.toLowerCase().includes(term),
      )
    : searchablePages
  return matches.slice(0, 6)
})

watch(searchTerm, () => {
  searchSelected.value = 0
})

const actionBar = ref(null)
const openMenu = ref(null)
const inbox = ref(demoNotifications.map((item) => ({ ...item })))
const unreadCount = computed(() => inbox.value.filter((item) => item.unread).length)

function toggleMenu(name) {
  openMenu.value = openMenu.value === name ? null : name
}

function closeMenus() {
  openMenu.value = null
}

function openSearch() {
  searchOpen.value = true
}

function selectResult(page) {
  router.push(page.to)
  searchTerm.value = ''
  searchOpen.value = false
  mobileSearchVisible.value = false
  searchInput.value?.blur()
}

function submitSearch() {
  if (searchResults.value.length) {
    const page = searchResults.value[searchSelected.value] || searchResults.value[0]
    selectResult(page)
    return
  }

  if (searchTerm.value.trim()) {
    toast({
      variant: 'warning',
      title: 'No matching page',
      message: `Nothing matches “${searchTerm.value.trim()}” yet.`,
    })
  }
}

function handleSearchKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    searchSelected.value = (searchSelected.value + 1) % Math.max(searchResults.value.length, 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    const total = Math.max(searchResults.value.length, 1)
    searchSelected.value = (searchSelected.value - 1 + total) % total
  } else if (event.key === 'Enter') {
    event.preventDefault()
    submitSearch()
  } else if (event.key === 'Escape') {
    searchOpen.value = false
    mobileSearchVisible.value = false
    searchInput.value?.blur()
  }
}

function toggleMobileSearch() {
  mobileSearchVisible.value = !mobileSearchVisible.value
  if (mobileSearchVisible.value) {
    nextTick(() => searchInput.value?.focus())
  }
}

function markAllRead() {
  inbox.value.forEach((item) => {
    item.unread = false
  })
  toast({
    variant: 'success',
    title: 'Notifications updated',
    message: 'All notifications were marked as read (local demo state).',
  })
}

function openNotification(item) {
  item.unread = false
  closeMenus()
  router.push('/notifications')
}

function goToSettings(query) {
  closeMenus()
  router.push({ name: 'settings', query })
}

function handleSignOut() {
  closeMenus()
  toast({
    variant: 'warning',
    title: 'Demo session only',
    message: 'Authentication and sign out require a backend, which is not part of this frontend demo.',
  })
}

function handleDocumentPointerDown(event) {
  if (actionBar.value && !actionBar.value.contains(event.target)) {
    openMenu.value = null
  }
  if (searchRoot.value && !searchRoot.value.contains(event.target)) {
    searchOpen.value = false
  }
}

function handleGlobalKeydown(event) {
  const tag = document.activeElement?.tagName
  const isTyping =
    tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable

  if ((event.key === '/' && !isTyping) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) {
    event.preventDefault()
    mobileSearchVisible.value = true
    nextTick(() => searchInput.value?.focus())
  }

  if (event.key === 'Escape') {
    openMenu.value = null
    searchOpen.value = false
    mobileSearchVisible.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <header class="app-topbar">
    <button
      type="button"
      class="topbar-toggle d-lg-none"
      aria-label="Open navigation menu"
      @click="emit('toggle-sidebar')"
    >
      <i class="bi bi-list" aria-hidden="true"></i>
    </button>

    <button
      type="button"
      class="topbar-toggle d-none d-lg-inline-flex"
      :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      @click="emit('toggle-collapse')"
    >
      <i
        class="bi"
        :class="collapsed ? 'bi-layout-sidebar-inset' : 'bi-layout-sidebar'"
        aria-hidden="true"
      ></i>
    </button>

    <div class="topbar-heading">
      <p class="topbar-title">{{ pageTitle }}</p>
      <nav aria-label="Breadcrumb">
        <ol class="topbar-breadcrumb">
          <li><RouterLink to="/dashboard">Home</RouterLink></li>
          <li v-if="pageGroup !== 'Overview'">{{ pageGroup }}</li>
          <li aria-current="page">{{ pageTitle }}</li>
        </ol>
      </nav>
    </div>

    <div ref="searchRoot" class="topbar-search" :class="{ 'is-mobile-visible': mobileSearchVisible }">
      <i class="bi bi-search" aria-hidden="true"></i>
      <input
        ref="searchInput"
        v-model="searchTerm"
        type="search"
        placeholder="Search pages and modules…"
        aria-label="Search CampusHub modules"
        autocomplete="off"
        @focus="openSearch"
        @keydown="handleSearchKeydown"
      />
      <span class="search-kbd">/</span>

      <div v-if="searchOpen" class="search-results">
        <p class="search-results-label">
          {{ searchTerm ? 'Matching pages' : 'Quick navigation' }}
        </p>
        <button
          v-for="(page, index) in searchResults"
          :key="page.to"
          type="button"
          class="search-result"
          :class="{ 'is-selected': index === searchSelected }"
          @mouseenter="searchSelected = index"
          @mousedown.prevent="selectResult(page)"
        >
          <i class="bi" :class="page.icon" aria-hidden="true"></i>
          <span>{{ page.label }}</span>
          <small>{{ page.group }}</small>
        </button>
        <p v-if="!searchResults.length" class="search-empty">
          No modules match “{{ searchTerm }}”. Try “students” or “reports”.
        </p>
      </div>
    </div>

    <div ref="actionBar" class="topbar-actions">
      <button
        type="button"
        class="topbar-icon-btn is-search-toggle"
        aria-label="Search CampusHub"
        :aria-expanded="mobileSearchVisible"
        @click="toggleMobileSearch"
      >
        <i class="bi bi-search" aria-hidden="true"></i>
      </button>

      <div class="position-relative">
        <button
          type="button"
          class="topbar-icon-btn"
          aria-label="Notifications"
          :aria-expanded="openMenu === 'notifications'"
          @click="toggleMenu('notifications')"
        >
          <i class="bi bi-bell" aria-hidden="true"></i>
          <span v-if="unreadCount" class="notification-dot" aria-hidden="true"></span>
        </button>

        <div v-if="openMenu === 'notifications'" class="ch-dropdown notification-panel">
          <div class="notification-panel-head">
            <div>
              <strong>Notifications</strong>
              <span>{{ unreadCount }} unread</span>
            </div>
            <button
              v-if="unreadCount"
              type="button"
              class="btn-ch btn-ch-ghost btn-ch-sm"
              @click="markAllRead"
            >
              Mark all read
            </button>
          </div>
          <div class="notification-panel-list">
            <button
              v-for="item in inbox"
              :key="item.id"
              type="button"
              class="notification-item w-100 border-0 text-start"
              :class="{ 'is-unread': item.unread }"
              @click="openNotification(item)"
            >
              <span class="notification-icon" :class="item.tone ? `tone-${item.tone}` : ''">
                <i class="bi" :class="item.icon" aria-hidden="true"></i>
              </span>
              <span class="notification-item-body">
                <strong>{{ item.title }}</strong>
                <span>{{ item.body }}</span>
              </span>
            </button>
          </div>
          <RouterLink to="/notifications" class="notification-panel-foot" @click="closeMenus">
            View all notifications
          </RouterLink>
        </div>
      </div>

      <div class="topbar-divider" aria-hidden="true"></div>

      <div class="position-relative">
        <button
          type="button"
          class="user-menu-toggle"
          :aria-expanded="openMenu === 'user'"
          aria-label="Open account menu"
          @click="toggleMenu('user')"
        >
          <span class="avatar">{{ currentUser.initials }}</span>
          <span class="user-menu-text">
            <span class="user-menu-name">{{ currentUser.name }}</span>
            <span class="user-menu-role">{{ currentUser.role }}</span>
          </span>
          <i class="bi bi-chevron-down" aria-hidden="true"></i>
        </button>

        <div v-if="openMenu === 'user'" class="ch-dropdown">
          <div class="dropdown-header-custom">
            <strong>{{ currentUser.name }}</strong>
            <span>{{ currentUser.email }}</span>
          </div>
          <button type="button" class="dropdown-item-custom" @click="goToSettings({ tab: 'profile' })">
            <i class="bi bi-person" aria-hidden="true"></i>
            My profile
          </button>
          <button type="button" class="dropdown-item-custom" @click="goToSettings({ tab: 'preferences' })">
            <i class="bi bi-gear" aria-hidden="true"></i>
            Settings
          </button>
          <div class="dropdown-separator"></div>
          <button type="button" class="dropdown-item-custom is-danger" @click="handleSignOut">
            <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
            Sign out
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
