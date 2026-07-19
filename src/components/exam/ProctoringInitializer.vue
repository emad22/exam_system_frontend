<template>
  <div class="proctoring-initializer" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'">
    <!-- Header -->
    <div class="proctoring-header">
      <div class="flex items-center gap-3">
        <i class="pi pi-shield text-xl text-brand-primary"></i>
        <h1 class="text-2xl font-black">
          {{ currentLang === 'ar' ? 'بدء جلسة المراقبة' : 'Start Proctoring Session' }}
        </h1>
      </div>
      <p class="text-sm text-slate-600 mt-2">
        {{ currentLang === 'ar'
          ? 'يجب أن تمر بعملية المراقبة قبل بدء الامتحان'
          : 'You must complete the proctoring setup before starting the exam' }}
      </p>
    </div>

    <!-- Steps Tracker -->
    <div class="steps-tracker">
      <div v-for="(step, index) in steps" :key="index" class="step"
        :class="{ active: currentStep === index, done: completedSteps > index }">
        <div class="step-number">
          <span v-if="completedSteps > index" class="text-success">
            <i class="pi pi-check"></i>
          </span>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <span class="step-label">{{ step.label }}</span>
      </div>
    </div>

    <!-- Step Content (scrollable) -->
    <div class="step-content">
      <!-- Step 1: System Requirements -->
      <SystemRequirementsCheck v-if="currentStep === 0" @complete="completeStep(0)" :current-lang="currentLang" />

      <!-- Step 2: Camera & Microphone Test -->
      <CameraAndMicrophoneTest v-else-if="currentStep === 1" @complete="completeStep(1)" :current-lang="currentLang" />

      <!-- Step 3: Identity Verification -->
      <IdentityVerification v-else-if="currentStep === 2" @complete="completeStep(2)" :attempt-id="attemptId"
        :current-lang="currentLang" :bypass-enabled="bypassIdentityVerification" />

      <!-- Step 4: Review & Confirm -->
      <ReviewAndConfirm v-else-if="currentStep === 3" @complete="startExam" :current-lang="currentLang" />
    </div>

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="flex flex-col items-center gap-3">
        <i class="pi pi-spin pi-spinner text-4xl text-brand-primary"></i>
        <span class="text-sm font-bold text-slate-600">{{ loadingMessage }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/services/api'
import SystemRequirementsCheck from './ProctoringSteps/SystemRequirementsCheck.vue'
import CameraAndMicrophoneTest from './ProctoringSteps/CameraAndMicrophoneTest.vue'
import IdentityVerification from './ProctoringSteps/IdentityVerification.vue'
import ReviewAndConfirm from './ProctoringSteps/ReviewAndConfirm.vue'

const router = useRouter()
const route = useRoute()

const currentLang = ref(localStorage.getItem('dashboard_lang') || 'en')
const attemptId = ref(route.params.attemptId)

const currentStep = ref(0)
const completedSteps = ref(0)
const isLoading = ref(false)
const loadingMessage = ref('')
const bypassIdentityVerification = ref(false)

// Fetch student profile to check bypass flag
onMounted(async () => {
  try {
    const res = await api.get('/user')
    bypassIdentityVerification.value = !!res.data?.student?.bypass_identity_verification
  } catch (e) {
    bypassIdentityVerification.value = false
  }
})

const steps = ref([
  {
    label: currentLang.value === 'ar' ? 'متطلبات النظام' : 'System Requirements',
    icon: 'pi-laptop'
  },
  {
    label: currentLang.value === 'ar' ? 'الكاميرا والميكروفون' : 'Camera & Microphone',
    icon: 'pi-camera'
  },
  {
    label: currentLang.value === 'ar' ? 'التحقق من الهوية' : 'Identity Verification',
    icon: 'pi-id-card'
  },
  {
    label: currentLang.value === 'ar' ? 'المراجعة والتأكيد' : 'Review & Confirm',
    icon: 'pi-check-circle'
  }
])

// Methods
const completeStep = (stepIndex) => {
  completedSteps.value = stepIndex + 1
  if (currentStep.value < steps.value.length - 1) {
    currentStep.value++
  }
}

const startExam = async () => {
  try {
    isLoading.value = true
    loadingMessage.value = currentLang.value === 'ar'
      ? 'جاري بدء جلسة المراقبة...'
      : 'Starting proctoring session...'

    // Initiate proctoring session
    const response = await api.post('/proctoring/session/initiate', {
      exam_attempt_id: attemptId.value,
      student_id: route.params.studentId,
    })

    if (response.data.success) {
      // Start recording
      await api.post(`/proctoring/session/${response.data.session_id}/start`)

      // Redirect to exam
      router.push({
        name: 'exam.take',
        params: {
          attemptId: attemptId.value,
          proctoringSessionId: response.data.session_id,
        }
      })
    }

  } catch (error) {
    loadingMessage.value = currentLang.value === 'ar'
      ? 'حدث خطأ، يرجى المحاولة مرة أخرى'
      : 'An error occurred, please try again'

    console.error('Failed to start proctoring:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.proctoring-initializer {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f8fafc;
}

.proctoring-header {
  background: white;
  padding: 1rem 2rem;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.steps-tracker {
  display: flex;
  gap: 0;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.75rem 2rem;
  flex-shrink: 0;
  overflow-x: auto;
}

.step {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.6rem;
  padding: 0 1.5rem;
  position: relative;
  flex-shrink: 0;
}

.step:not(:last-child)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 1.5rem;
  height: 2px;
  background: #e2e8f0;
}

.step.done:not(:last-child)::after {
  background: #86efac;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.85rem;
  color: #64748b;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.step.active .step-number {
  background: #3b82f6;
  color: white;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
}

.step.done .step-number {
  background: #86efac;
  color: #16a34a;
}

.step-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
  white-space: nowrap;
}

.step.active .step-label {
  color: #1e293b;
}

.step.done .step-label {
  color: #16a34a;
}

/* Step content is the scrollable area */
.step-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
  min-height: 0;
}

.step-content::-webkit-scrollbar {
  width: 4px;
}

.step-content::-webkit-scrollbar-track {
  background: transparent;
}

.step-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
</style>
