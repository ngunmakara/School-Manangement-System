import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

const client = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
  },
})

export function extractApiError(error) {
  if (error?.response) {
    const { status, data } = error.response
    const errors =
      data && typeof data.errors === 'object' && data.errors !== null ? data.errors : {}
    return {
      status,
      message: (data && data.message) || `The server returned an unexpected error (HTTP ${status}).`,
      errors,
    }
  }

  if (error?.request) {
    return { status: 0, message: 'Could not reach the CampusHub server.', errors: {} }
  }

  return { status: 0, message: error?.message || 'Unexpected client error.', errors: {} }
}

export default client
