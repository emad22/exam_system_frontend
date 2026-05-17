<script setup>
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useModal } from '@/composables/useModal';
import { computed } from 'vue';

const { modalConfig, handleModalConfirm, handleModalCancel } = useModal();

// Automatically parse validation errors if the message is a list, array, or Laravel error object
const parsedErrors = computed(() => {
    if (!modalConfig.value.message) return [];
    
    // 1. If it's already an array
    if (Array.isArray(modalConfig.value.message)) {
        return modalConfig.value.message;
    }
    
    // 2. If it's a Laravel validation error object (e.g. { name: ['Required'], email: ['Invalid'] })
    if (typeof modalConfig.value.message === 'object') {
        const errors = [];
        Object.entries(modalConfig.value.message).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                errors.push(...value);
            } else if (typeof value === 'string') {
                errors.push(value);
            }
        });
        return errors;
    }
    
    // 3. If it is a string containing newlines or bullet points
    if (typeof modalConfig.value.message === 'string') {
        if (modalConfig.value.message.includes('\n')) {
            return modalConfig.value.message
                .split('\n')
                .map(item => item.replace(/^[-\s•*]+/, '').trim())
                .filter(Boolean);
        }
    }
    
    return [];
});
</script>

<template>
  <Dialog 
    v-model:visible="modalConfig.visible" 
    modal 
    :closable="false" 
    :style="{ width: '440px' }" 
    class="custom-beautiful-modal overflow-hidden border-0 shadow-2xl z-[9999]"
  >
      <template #header>
          <div class="flex flex-col items-center justify-center w-full pt-8 pb-3 text-center">
              <!-- Glow Pulsing Animated Icon -->
              <div class="icon-wrapper flex items-center justify-center" :class="modalConfig.type">
                  <div class="pulse-ring"></div>
                  <i class="text-3xl relative z-10" :class="{
                      'pi pi-check': modalConfig.type === 'success',
                      'pi pi-exclamation-triangle': modalConfig.type === 'danger' || modalConfig.type === 'warning',
                      'pi pi-info': modalConfig.type === 'info'
                  }"></i>
              </div>
              
              <!-- Modal Title -->
              <h3 class="font-extrabold text-2xl tracking-tight text-slate-800 mt-5 px-4 leading-snug">
                  {{ modalConfig.title }}
              </h3>
          </div>
      </template>

      <!-- Modal Body Content -->
      <div class="px-6 py-1 text-slate-600 text-center">
          <!-- Render Validation Errors List (if array or object parsed) -->
          <div v-if="parsedErrors.length > 0" class="text-left bg-slate-50/70 border border-slate-100/80 rounded-2xl p-4 mt-2 max-h-[190px] overflow-y-auto custom-scrollbar shadow-inner">
              <ul class="space-y-3">
                  <li v-for="(err, idx) in parsedErrors" :key="idx" class="flex items-start gap-2.5 text-[13.5px] font-semibold text-slate-600 leading-relaxed">
                      <span class="flex-shrink-0 w-5 h-5 rounded-lg bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center text-xs mt-0.5">
                          <i class="pi pi-exclamation-circle text-[10px] font-bold"></i>
                      </span>
                      <span class="flex-1">{{ err }}</span>
                  </li>
              </ul>
          </div>
          
          <!-- Standard Message Display -->
          <p v-else class="font-semibold text-[15px] leading-relaxed text-slate-500 px-3">
              {{ modalConfig.message }}
          </p>
      </div>

      <!-- Footer Buttons -->
      <template #footer>
          <div class="flex items-center justify-center gap-3 w-full px-6 pb-7 pt-4 mt-2">
              <Button 
                v-if="modalConfig.showCancel" 
                @click="handleModalCancel" 
                class="flex-1 font-bold py-3.5 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-[0.97] transition-all duration-200 text-center justify-center text-sm"
              >
                {{ modalConfig.cancelText }}
              </Button>
              <Button 
                @click="handleModalConfirm" 
                class="flex-1 font-bold py-3.5 rounded-xl border-none shadow-lg active:scale-[0.97] transition-all duration-200 text-center justify-center text-sm text-white"
                :class="{
                    'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-100': modalConfig.type === 'success',
                    'bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-rose-100': modalConfig.type === 'danger',
                    'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-100': modalConfig.type === 'warning',
                    'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-blue-100': modalConfig.type === 'info'
                }"
              >
                {{ modalConfig.confirmText }}
              </Button>
          </div>
      </template>
  </Dialog>
</template>

<style>
/* Custom PrimeVue Dialog Overrides */
.custom-beautiful-modal.p-dialog {
    border-radius: 28px !important;
    background: rgba(255, 255, 255, 0.98) !important;
    backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(255, 255, 255, 0.6) !important;
    font-family: inherit !important;
}

.custom-beautiful-modal .p-dialog-header {
    border-bottom: none !important;
    background: transparent !important;
    padding: 0 !important;
}

.custom-beautiful-modal .p-dialog-content {
    padding: 0 !important;
    background: transparent !important;
}

.custom-beautiful-modal .p-dialog-footer {
    border-top: none !important;
    background: transparent !important;
    padding: 0 !important;
}

/* Glowing Pulsing Icon Design */
.icon-wrapper {
    width: 68px;
    height: 68px;
    border-radius: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    animation: iconBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

/* Color palettes with dynamic gradients and soft ambient glow */
.icon-wrapper.success {
    background: linear-gradient(135deg, #10b981, #059669);
    color: #ffffff;
    box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
}

.icon-wrapper.danger {
    background: linear-gradient(135deg, #f43f5e, #e11d48);
    color: #ffffff;
    box-shadow: 0 10px 25px -5px rgba(244, 63, 94, 0.4);
}

.icon-wrapper.warning {
    background: linear-gradient(135deg, #fbbf24, #d97706);
    color: #ffffff;
    box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.4);
}

.icon-wrapper.info {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: #ffffff;
    box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
}

/* Pulse Ring Animation */
.pulse-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 22px;
    animation: iconPulse 2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
    z-index: 1;
}

.icon-wrapper.success .pulse-ring { border: 2px solid rgba(16, 185, 129, 0.5); }
.icon-wrapper.danger .pulse-ring { border: 2px solid rgba(244, 63, 94, 0.5); }
.icon-wrapper.warning .pulse-ring { border: 2px solid rgba(245, 158, 11, 0.5); }
.icon-wrapper.info .pulse-ring { border: 2px solid rgba(59, 130, 246, 0.5); }

@keyframes iconPulse {
    0% {
        transform: scale(0.95);
        opacity: 0.8;
    }
    50% {
        opacity: 0.3;
    }
    100% {
        transform: scale(1.3);
        opacity: 0;
    }
}

@keyframes iconBounce {
    0% {
        transform: scale(0.3);
        opacity: 0;
    }
    50% {
        transform: scale(1.05);
        opacity: 0.8;
    }
    70% {
        transform: scale(0.9);
        opacity: 0.9;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

/* Custom Scrollbar for Validation Errors list */
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}
</style>
