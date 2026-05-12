import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth'
import { auth, googleProvider } from '@/plugins/firebase'
import type { AuthUser } from '../domain/auth.types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const ready = ref(false)
  const error = ref<string | null>(null)

  // Cached so calling init() twice never registers a second listener
  let initPromise: Promise<void> | null = null

  function init(): Promise<void> {
    if (initPromise) return initPromise

    initPromise = new Promise((resolve) => {
      onAuthStateChanged(auth, (firebaseUser) => {
        user.value = firebaseUser
          ? {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            }
          : null

        if (!ready.value) {
          ready.value = true
          resolve()
        }
      })
    })

    return initPromise
  }

  async function loginWithGoogle() {
    error.value = null
    await setPersistence(auth, browserLocalPersistence)
    await signInWithPopup(auth, googleProvider)
  }

  async function loginWithEmail(email: string, password: string) {
    error.value = null
    await setPersistence(auth, browserLocalPersistence)
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function logout() {
    await signOut(auth)
  }

  return { user, ready, error, init, loginWithGoogle, loginWithEmail, logout }
})
