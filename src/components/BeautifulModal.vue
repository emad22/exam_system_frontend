<script setup>
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useModal } from '@/composables/useModal';

const { modalConfig, handleModalConfirm, handleModalCancel } = useModal();
</script>

<template>
  <Dialog v-model:visible="modalConfig.visible" modal :closable="false" :style="{ width: '450px' }" class="rounded-[2rem] overflow-hidden border-0 shadow-2xl z-[9999]">
      <template #header>
          <div class="flex items-center gap-4 px-2 pt-2" :class="{
              'text-emerald-500': modalConfig.type === 'success',
              'text-rose-500': modalConfig.type === 'danger',
              'text-amber-500': modalConfig.type === 'warning',
              'text-indigo-500': modalConfig.type === 'info'
          }">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm" :class="{
                  'bg-emerald-50 border-emerald-100 text-emerald-600': modalConfig.type === 'success',
                  'bg-rose-50 border-rose-100 text-rose-600': modalConfig.type === 'danger',
                  'bg-amber-50 border-amber-100 text-amber-600': modalConfig.type === 'warning',
                  'bg-indigo-50 border-indigo-100 text-indigo-600': modalConfig.type === 'info'
              }">
                  <i class="text-2xl" :class="{
                      'pi pi-check-circle': modalConfig.type === 'success',
                      'pi pi-times-circle': modalConfig.type === 'danger',
                      'pi pi-exclamation-triangle': modalConfig.type === 'warning',
                      'pi pi-info-circle': modalConfig.type === 'info'
                  }"></i>
              </div>
              <h3 class="font-black text-2xl tracking-tight text-slate-800">{{ modalConfig.title }}</h3>
          </div>
      </template>
      <div class="px-2 py-4 text-slate-600 font-medium leading-relaxed text-base whitespace-pre-wrap">
          {{ modalConfig.message }}
      </div>
      <template #footer>
          <div class="flex justify-end gap-3 w-full px-2 pb-2 mt-4">
              <Button v-if="modalConfig.showCancel" :label="modalConfig.cancelText" text severity="secondary" @click="handleModalCancel" class="font-bold px-6 py-3 rounded-xl hover:bg-slate-100" />
              <Button :label="modalConfig.confirmText" @click="handleModalConfirm" 
                  class="font-black px-6 py-3 rounded-xl border-none shadow-md hover:shadow-lg transition-all"
                  :class="{
                      'bg-emerald-500 hover:bg-emerald-600 text-white': modalConfig.type === 'success',
                      'bg-rose-500 hover:bg-rose-600 text-white': modalConfig.type === 'danger',
                      'bg-amber-500 hover:bg-amber-600 text-white': modalConfig.type === 'warning',
                      'bg-indigo-500 hover:bg-indigo-600 text-white': modalConfig.type === 'info'
                  }"
              />
          </div>
      </template>
  </Dialog>
</template>
