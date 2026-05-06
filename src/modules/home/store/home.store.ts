import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { HomeData } from '../domain/home.types'

export const useHomeStore = defineStore('home', () => {
  const data = ref<HomeData | null>(null)
  const isLoading = ref(false)

  function setData(payload: HomeData) {
    data.value = payload
  }

  function setLoading(value: boolean) {
    isLoading.value = value
  }

  return { data, isLoading, setData, setLoading }
})
