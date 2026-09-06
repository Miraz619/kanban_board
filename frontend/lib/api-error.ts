import axios from "axios"

import type { ApiErrorResponse } from "@/types/api"

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return fallbackMessage
  }

  return error.response?.data.message || fallbackMessage
}
