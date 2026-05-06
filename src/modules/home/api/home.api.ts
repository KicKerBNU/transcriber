import type { HomeApiResponse } from '../domain/home.types'

export async function fetchHomeData(): Promise<HomeApiResponse> {
  const response = await fetch('/api/home')
  const data = await response.json()

  return {
    data,
    status: response.status,
  }
}
