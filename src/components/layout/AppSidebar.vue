<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { navigationGroups } from '../../data/navigation'
import { useSemestersStore } from '../../stores/semesters'

defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'toggle-collapse'])
const semestersStore = useSemestersStore()
const activeSemester = computed(() => semestersStore.activeSemester)
</script>

<template>
  <aside class="app-sidebar" aria-label="CampusHub navigation">
    <RouterLink
      to="/dashboard"
      class="sidebar-brand text-decoration-none"
      aria-label="CampusHub dashboard"
      @click="emit('close')"
    >
      <span class="brand-mark" aria-hidden="true">
        <i class="bi bi-mortarboard-fill"></i>
      </span>
      <span class="brand-text">
        <span class="brand-name">CampusHub</span>
        <span class="brand-sub">University Admin</span>
      </span>
    </RouterLink>

    <div class="sidebar-scroll">
      <nav v-for="group in navigationGroups" :key="group.label" class="sidebar-group">
        <p class="sidebar-group-label">{{ group.label }}</p>
        <ul class="sidebar-nav">
          <li v-for="item in group.items" :key="item.to">
            <RouterLink
              :to="item.to"
              class="sidebar-link"
              active-class="is-active"
              :title="collapsed ? item.label : undefined"
              @click="emit('close')"
            >
              <i class="bi" :class="item.icon" aria-hidden="true"></i>
              <span class="sidebar-link-label">{{ item.label }}</span>
              <span v-if="item.badge" class="sidebar-link-count">{{ item.badge }}</span>
            </RouterLink>
          </li>
        </ul>
      </nav>
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-year">
        <i class="bi bi-calendar2-range" aria-hidden="true"></i>
        <div class="year-text">
          <strong>{{ activeSemester ? 'Active Semester' : 'Academic Calendar' }}</strong>
          <span v-if="activeSemester">
            {{ activeSemester.name }} · {{ activeSemester.academicYear }}
          </span>
          <span v-else>No active semester</span>
        </div>
      </div>
      <button
        type="button"
        class="sidebar-collapse"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="emit('toggle-collapse')"
      >
        <i
          class="bi"
          :class="collapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'"
          aria-hidden="true"
        ></i>
        <span class="collapse-text">Collapse menu</span>
      </button>
    </div>
  </aside>
</template>
