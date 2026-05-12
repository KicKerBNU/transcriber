<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-hidden="true"
        @click="close"
      />
      <div
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="descId"
        class="relative w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl"
        @click.stop
      >
        <h2 :id="titleId" class="mb-3 text-lg font-semibold text-white">
          {{ title }}
        </h2>
        <p :id="descId" class="text-sm leading-relaxed text-gray-400">
          {{ message }}
        </p>
        <div class="mt-8 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            class="cursor-pointer rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="loading"
            @click="close"
          >
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
            :class="
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-indigo-600 hover:bg-indigo-500'
            "
            :disabled="loading"
            @click="emit('confirm')"
          >
            <FontAwesomeIcon
              v-if="loading"
              icon="spinner"
              class="size-4 animate-spin"
            />
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onUnmounted, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    message: string
    confirmLabel: string
    cancelLabel: string
    loading?: boolean
    variant?: 'default' | 'danger'
  }>(),
  { loading: false, variant: 'danger' },
)

const emit = defineEmits<{ 'update:modelValue': [boolean]; confirm: [] }>()

const titleId = useId()
const descId = useId()

function close() {
  if (props.loading) return
  emit('update:modelValue', false)
}

function onEscape(e: KeyboardEvent) {
  if (!props.modelValue || props.loading) return
  if (e.key === 'Escape') close()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) document.addEventListener('keydown', onEscape)
    else document.removeEventListener('keydown', onEscape)
  },
)

onUnmounted(() => document.removeEventListener('keydown', onEscape))
</script>
