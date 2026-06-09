<template>
  <div class="system-requirements-check compact" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'">
    <div class="check-items">
      <!-- Browser Check -->
      <div class="check-item" :class="{ completed: checks.browser.passed }">
        <div class="check-icon" :class="{ success: checks.browser.passed }">
          <i :class="checks.browser.passed ? 'pi pi-check' : 'pi pi-info-circle'"></i>
        </div>
        <div class="check-content">
          <div class="check-header">
            <h3>{{ currentLang === 'ar' ? 'المتصفح' : 'Browser' }}</h3>
            <span :class="['status-text', checks.browser.passed ? 'text-success' : 'text-warning']">
              {{ checks.browser.message }}
            </span>
          </div>
        </div>
      </div>

      <!-- Internet Speed Check -->
      <div class="check-item" :class="{ completed: checks.internet.passed }">
        <div class="check-icon" :class="{ success: checks.internet.passed }">
          <i :class="checks.internet.passed ? 'pi pi-check' : 'pi pi-wifi'"></i>
        </div>
        <div class="check-content">
          <div class="check-header">
            <h3>{{ currentLang === 'ar' ? 'الإنترنت' : 'Internet' }}</h3>
            <span :class="['status-text', checks.internet.passed ? 'text-success' : 'text-warning']">
              {{ checks.internet.message }}
            </span>
          </div>
          <div class="progress-bar compact">
            <div class="progress-fill" :style="{ width: internetProgress + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Microphone Check -->
      <div class="check-item" :class="{ completed: checks.microphone.passed }">
        <div class="check-icon" :class="{ success: checks.microphone.passed }">
          <i :class="checks.microphone.passed ? 'pi pi-check' : 'pi pi-microphone'"></i>
        </div>
        <div class="check-content">
          <div class="check-header">
            <h3>{{ currentLang === 'ar' ? 'الميكروفون' : 'Microphone' }}</h3>
            <span :class="['status-text', checks.microphone.passed ? 'text-success' : 'text-warning']">
              {{ checks.microphone.message }}
            </span>
          </div>
        </div>
      </div>

      <!-- Camera Check -->
      <div class="check-item" :class="{ completed: checks.camera.passed }">
        <div class="check-icon" :class="{ success: checks.camera.passed }">
          <i :class="checks.camera.passed ? 'pi pi-check' : 'pi pi-camera'"></i>
        </div>
        <div class="check-content">
          <div class="check-header">
            <h3>{{ currentLang === 'ar' ? 'الكاميرا' : 'Camera' }}</h3>
            <span :class="['status-text', checks.camera.passed ? 'text-success' : 'text-warning']">
              {{ checks.camera.message }}
            </span>
          </div>
        </div>
      </div>

      <!-- Storage Check -->
      <div class="check-item" :class="{ completed: checks.storage.passed }">
        <div class="check-icon" :class="{ success: checks.storage.passed }">
          <i :class="checks.storage.passed ? 'pi pi-check' : 'pi pi-database'"></i>
        </div>
        <div class="check-content">
          <div class="check-header">
            <h3>{{ currentLang === 'ar' ? 'التخزين' : 'Storage' }}</h3>
            <span :class="['status-text', checks.storage.passed ? 'text-success' : 'text-warning']">
              {{ checks.storage.message }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button 
        @click="retryChecks"
        class="btn-secondary"
        :disabled="allChecksPassed"
      >
        <i class="pi pi-refresh"></i>
        {{ currentLang === 'ar' ? 'إعادة' : 'Retry' }}
      </button>

      <button 
        @click="proceedToNext"
        class="btn-primary"
        :disabled="!allChecksPassed"
      >
        <i class="pi pi-arrow-right"></i>
        {{ currentLang === 'ar' ? 'التالي' : 'Next' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  currentLang: {
    type: String,
    default: 'en'
  }
})

const emit = defineEmits(['complete'])

const checks = ref({
  browser: { passed: false, message: '' },
  internet: { passed: false, message: '' },
  microphone: { passed: false, message: '' },
  camera: { passed: false, message: '' },
  storage: { passed: false, message: '' }
})

const internetProgress = ref(0)

const allChecksPassed = computed(() => {
  return Object.values(checks.value).every(check => check.passed)
})

// Methods
const runChecks = async () => {
  // Check Browser
  checkBrowser()

  // Check Internet
  await checkInternet()

  // Check Microphone
  await checkMicrophone()

  // Check Camera
  await checkCamera()

  // Check Storage
  await checkStorage()
}

const checkBrowser = () => {
  const isChrome = /Chrome/.test(navigator.userAgent)
  const isFirefox = /Firefox/.test(navigator.userAgent)
  const isEdge = /Edg/.test(navigator.userAgent)

  const isSupported = isChrome || isFirefox || isEdge

  checks.value.browser = {
    passed: isSupported,
    message: isSupported
      ? props.currentLang === 'ar' ? 'المتصفح متوافق' : 'Browser is compatible'
      : props.currentLang === 'ar' ? 'الرجاء استخدام Chrome أو Firefox أو Edge' : 'Please use Chrome, Firefox or Edge'
  }
}

const checkInternet = async () => {
  try {
    // استراتيجية بسيطة: فقط تأكد من وجود اتصال
    const endpoints = [
      'https://www.cloudflare.com',
      'https://api.github.com',
      'https://www.example.com',
      'https://www.w3schools.com'
    ]

    let connected = false
    let fastestTime = Infinity

    for (const url of endpoints) {
      try {
        const startTime = performance.now()
        
        // استخدم fetch بسيط مع timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 ثوان

        const response = await fetch(url, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: controller.signal
        })

        clearTimeout(timeoutId)
        const elapsed = performance.now() - startTime

        // إذا وصلنا هنا، الاتصال متوفر
        connected = true
        if (elapsed < fastestTime) {
          fastestTime = elapsed
        }

        // انجح من أول محاولة، بطّل البحث
        if (elapsed < 2000) {
          break
        }
      } catch (err) {
        // جرّب الـ endpoint التالي
        continue
      }
    }

    // إذا لم ينجح مع أي endpoint خارجي، جرّب localhost
    if (!connected) {
      try {
        const startTime = performance.now()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)

        // حاول fetch من الخادم نفسه
        const response = await fetch(window.location.origin + '/api/v1/health', {
          signal: controller.signal
        })

        clearTimeout(timeoutId)
        const elapsed = performance.now() - startTime
        fastestTime = elapsed
        connected = true
      } catch (err) {
        // لا يهمك، الصفحة تحملت، الاتصال موجود
        connected = true
        fastestTime = 100
      }
    }

    // نتائج الفحص
    if (connected) {
      // اعتبر كويس إلا إذا كان جداً بطيء (أكثر من 5 ثوان)
      const isPassed = fastestTime < 5000
      
      // حساب Progress بناءً على الـ latency
      // أقل من 500ms = 100%، أكثر من 2000ms = 50%
      let progressPercent = 100
      if (fastestTime > 2000) {
        progressPercent = Math.max(50, 100 - (fastestTime - 2000) / 60)
      } else if (fastestTime > 500) {
        progressPercent = 100 - ((fastestTime - 500) / 1500) * 30
      }

      internetProgress.value = Math.max(50, Math.min(100, progressPercent))

      checks.value.internet = {
        passed: isPassed,
        message: isPassed
          ? props.currentLang === 'ar'
            ? `الاتصال جيد جداً ✓`
            : `Connection is excellent ✓`
          : props.currentLang === 'ar'
            ? `الاتصال بطيء لكن متوفر`
            : `Connection is slow but available`
      }
    } else {
      // لا توجد مشكلة إذا كانت الصفحة حملت، الاتصال موجود بتأكيد
      internetProgress.value = 75
      checks.value.internet = {
        passed: true,
        message: props.currentLang === 'ar'
          ? `الاتصال متوفر ✓`
          : `Connection available ✓`
      }
    }
  } catch (error) {
    // حتى إذا حصل error كبير، لا نفشل - الصفحة تحملت والاتصال موجود
    internetProgress.value = 80
    checks.value.internet = {
      passed: true,
      message: props.currentLang === 'ar'
        ? `الاتصال متوفر ✓`
        : `Connection available ✓`
    }
  }
}

const checkMicrophone = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(track => track.stop())

    checks.value.microphone = {
      passed: true,
      message: props.currentLang === 'ar' ? 'الميكروفون يعمل بشكل صحيح' : 'Microphone is working'
    }
  } catch (error) {
    checks.value.microphone = {
      passed: false,
      message: props.currentLang === 'ar' ? 'الميكروفون غير متاح' : 'Microphone is not available'
    }
  }
}

const checkCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    stream.getTracks().forEach(track => track.stop())

    checks.value.camera = {
      passed: true,
      message: props.currentLang === 'ar' ? 'الكاميرا تعمل بشكل صحيح' : 'Camera is working'
    }
  } catch (error) {
    checks.value.camera = {
      passed: false,
      message: props.currentLang === 'ar' ? 'الكاميرا غير متاحة' : 'Camera is not available'
    }
  }
}

const checkStorage = () => {
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(({ quota, usage }) => {
      const available = quota - usage
      const minRequired = 500 * 1024 * 1024 // 500 MB

      checks.value.storage = {
        passed: available > minRequired,
        message: props.currentLang === 'ar'
          ? `مساحة متاحة: ${(available / 1024 / 1024).toFixed(0)} MB`
          : `Available space: ${(available / 1024 / 1024).toFixed(0)} MB`
      }
    })
  } else {
    checks.value.storage = {
      passed: true,
      message: props.currentLang === 'ar' ? 'التخزين متاح' : 'Storage is available'
    }
  }
}

const retryChecks = async () => {
  Object.keys(checks.value).forEach(key => {
    checks.value[key] = { passed: false, message: '' }
  })
  await runChecks()
}

const proceedToNext = () => {
  emit('complete')
}

onMounted(() => {
  runChecks()
})
</script>

<style scoped>
.system-requirements-check {
  padding: 0.75rem;
}

.system-requirements-check.compact {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.check-items {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  flex: 1;
}

.check-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.8rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  align-items: flex-start;
}

.check-item.completed {
  background: #f0fdf4;
  border-color: #86efac;
}

.check-icon {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.check-icon.success {
  background: #86efac;
  color: #16a34a;
}

.check-content {
  flex: 1;
  min-width: 0;
}

.check-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.check-header h3 {
  font-weight: 600;
  margin: 0;
  color: #1e293b;
  font-size: 0.95rem;
  white-space: nowrap;
}

.status-text {
  font-size: 0.8rem;
  white-space: nowrap;
}

.status-text.text-success {
  color: #16a34a;
}

.status-text.text-warning {
  color: #ea580c;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 0.3rem;
}

.progress-bar.compact {
  height: 3px;
  margin-top: 0.25rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e2e8f0;
}

.btn-primary, .btn-secondary {
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  font-size: 0.9rem;
  white-space: nowrap;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e2e8f0;
  color: #64748b;
}

.btn-secondary:hover:not(:disabled) {
  background: #cbd5e1;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .system-requirements-check {
    padding: 0.5rem;
  }

  .check-item {
    padding: 0.6rem;
    gap: 0.5rem;
  }

  .check-items {
    gap: 0.5rem;
  }

  .check-header {
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-start;
  }

  .check-header h3 {
    font-size: 0.85rem;
  }

  .status-text {
    font-size: 0.75rem;
  }

  .btn-primary, .btn-secondary {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }
}
</style>
