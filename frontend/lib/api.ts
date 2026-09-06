import axios from "axios"
import type { AxiosError, InternalAxiosRequestConfig } from "axios"

const apiUrl = process.env.NEXT_PUBLIC_API_URL

if (!apiUrl) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined")
}

export const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let refreshRequest: Promise<void> | null = null

const shouldSkipRefresh = (url?: string) =>
  ["/auth/login", "/auth/register", "/auth/refresh-token"].some((path) =>
    url?.includes(path)
  )

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest.url)
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      if (!refreshRequest) {
        refreshRequest = api
          .post("/auth/refresh-token")
          .then(() => undefined)
          .finally(() => {
            refreshRequest = null
          })
      }

      await refreshRequest
      return api(originalRequest)
    } catch (refreshError) {
      return Promise.reject(refreshError)
    }
  }
)
