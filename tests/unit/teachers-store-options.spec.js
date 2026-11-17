import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTeachersStore } from '../../src/stores/teachers'

const { fetchTeachers } = vi.hoisted(() => ({ fetchTeachers: vi.fn() }))

vi.mock('../../src/api/teacherService', () => ({
  fetchTeachers,
  createTeacher: vi.fn(),
  deleteTeacher: vi.fn(),
  updateTeacher: vi.fn(),
  toTeacherPayload: (input) => input,
  mapApiTeacher: (record) => record,
}))

beforeEach(() => {
  fetchTeachers.mockReset()
  setActivePinia(createPinia())
})

describe('teachers store options', () => {
  it('loads all teacher options using pagination and sorts them by name', async () => {
    fetchTeachers
      .mockResolvedValueOnce({
        content: [{ uid: 'teacher_1', fullName: 'Zed Teacher' }],
        totalElements: 2,
        size: 100,
      })
      .mockResolvedValueOnce({
        content: [{ uid: 'teacher_2', fullName: 'Ada Teacher' }],
        totalElements: 2,
        size: 100,
      })

    const store = useTeachersStore()

    await expect(store.loadTeacherOptions()).resolves.toBe(true)

    expect(fetchTeachers).toHaveBeenNthCalledWith(1, { page: 0, size: 100 })
    expect(fetchTeachers).toHaveBeenNthCalledWith(2, { page: 1, size: 100 })
    expect(store.optionsState).toBe('ready')
    expect(store.teacherOptions.map((teacher) => teacher.fullName)).toEqual([
      'Ada Teacher',
      'Zed Teacher',
    ])
  })

  it('reports option loading failures without fabricating teachers', async () => {
    fetchTeachers.mockRejectedValue(new Error('Network down'))

    const store = useTeachersStore()

    await expect(store.loadTeacherOptions()).resolves.toBe(false)

    expect(store.optionsState).toBe('error')
    expect(store.optionsError).toBe('Network down')
    expect(store.teacherOptions).toEqual([])
  })
})
