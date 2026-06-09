<template>
  <div class="identity-verification compact" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'">
    <!-- Instructions - Compact -->
    <div class="instruction-card compact">
      <i class="pi pi-info-circle"></i>
      <div class="instruction-content">
        <h3>{{ currentLang === 'ar' ? 'تحقق من هويتك' : 'Verify Identity' }}</h3>
        <p>{{ currentLang === 'ar' 
          ? 'التقط صورة واضحة لوجهك مع رقم الهوية'
          : 'Take a clear photo with your ID' }}</p>
      </div>
    </div>

    <!-- Compact Grid Layout -->
    <div class="verification-grid">
      <!-- Camera Section -->
      <div class="verification-card compact">
        <h2>
          <i class="pi pi-camera"></i>
          {{ currentLang === 'ar' ? 'الوجه' : 'Face' }}
        </h2>

        <div class="video-container compact">
          <video 
            ref="videoElement" 
            autoplay 
            playsinline 
            class="video-preview"
          ></video>
        </div>

        <button 
          @click="capturePhoto"
          class="btn-capture compact"
          :disabled="isCapturing"
        >
          <i class="pi pi-camera"></i>
          {{ currentLang === 'ar' ? 'التقط' : 'Capture' }}
        </button>

        <div v-if="capturedPhoto" class="photo-preview compact">
          <img :src="capturedPhoto" :alt="currentLang === 'ar' ? 'صورتك' : 'Your photo'" />
          <button @click="retakePhoto" class="btn-small">
            <i class="pi pi-refresh"></i>
          </button>
        </div>
      </div>

      <!-- ID Section -->
      <div class="verification-card compact">
        <h2>
          <i class="pi pi-id-card"></i>
          {{ currentLang === 'ar' ? 'البطاقة' : 'ID' }}
        </h2>

        <div v-if="!uploadedID" class="upload-area compact">
          <input 
            ref="fileInput"
            type="file" 
            accept="image/*"
            @change="handleIDUpload"
            style="display: none"
          />
          <button @click="$refs.fileInput.click()" class="btn-upload compact">
            <i class="pi pi-upload"></i>
            {{ currentLang === 'ar' ? 'رفع' : 'Upload' }}
          </button>
        </div>

        <div v-if="uploadedID" class="id-preview compact">
          <img :src="uploadedID" :alt="currentLang === 'ar' ? 'البطاقة' : 'ID'" />
          <button @click="clearID" class="btn-clear">
            <i class="pi pi-trash"></i>
          </button>
        </div>
      </div>

      <!-- ID Number Section -->
      <div class="verification-card compact">
        <h2>
          <i class="pi pi-key"></i>
          {{ currentLang === 'ar' ? 'الرقم' : 'ID #' }}
        </h2>

        <input 
          v-model="idNumber"
          type="text"
          class="id-input compact"
          :placeholder="currentLang === 'ar' ? 'الرقم' : 'ID No.'"
          maxlength="20"
        />
      </div>
    </div>

    <!-- Status Message -->
    <div v-if="verificationStatus" class="status-message compact" :class="verificationStatus.type">
      <i :class="verificationStatus.icon"></i>
      {{ verificationStatus.message }}
    </div>

    <!-- Loading -->
    <div v-if="isVerifying" class="loading-overlay">
      <i class="pi pi-spin pi-spinner"></i>
      <p>{{ currentLang === 'ar' ? 'جاري التحقق...' : 'Verifying...' }}</p>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button 
        @click="goBack"
        class="btn-secondary"
      >
        <i class="pi pi-arrow-left"></i>
        {{ currentLang === 'ar' ? 'رجوع' : 'Back' }}
      </button>

      <button 
        @click="verifyIdentity"
        class="btn-primary"
        :disabled="!canVerify"
      >
        <i class="pi pi-check"></i>
        {{ currentLang === 'ar' ? 'تحقق' : 'Verify' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/services/api'

const props = defineProps({
  attemptId: {
    type: [String, Number],
    required: true
  },
  currentLang: {
    type: String,
    default: 'en'
  }
})

const emit = defineEmits(['complete', 'back'])

const videoElement = ref(null)
const fileInput = ref(null)
const capturedPhoto = ref(null)
const uploadedID = ref(null)
const idNumber = ref('')
const isCapturing = ref(false)
const isVerifying = ref(false)
const faceConfidence = ref(0)
const verificationStatus = ref(null)

let cameraStream = null
const canvas = ref(null)

const canVerify = computed(() => {
  return capturedPhoto.value && uploadedID.value && idNumber.value.trim()
})

// Methods
const startCamera = async () => {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })

    if (videoElement.value) {
      videoElement.value.srcObject = cameraStream
    }
  } catch (error) {
    console.error('Failed to start camera:', error)
    verificationStatus.value = {
      type: 'error',
      icon: 'pi pi-times-circle',
      message: props.currentLang === 'ar' 
        ? 'فشل فتح الكاميرا'
        : 'Failed to open camera'
    }
  }
}

const capturePhoto = async () => {
  if (!videoElement.value) return

  try {
    isCapturing.value = true

    // Create canvas
    const cvs = document.createElement('canvas')
    cvs.width = videoElement.value.videoWidth
    cvs.height = videoElement.value.videoHeight

    const ctx = cvs.getContext('2d')
    ctx.drawImage(videoElement.value, 0, 0)

    capturedPhoto.value = cvs.toDataURL('image/jpeg', 0.95)
    faceConfidence.value = Math.random() * 30 + 70 // Simulate confidence

    verificationStatus.value = {
      type: 'success',
      icon: 'pi pi-check-circle',
      message: props.currentLang === 'ar'
        ? 'تم التقاط الصورة بنجاح'
        : 'Photo captured successfully'
    }

  } catch (error) {
    console.error('Failed to capture photo:', error)
    verificationStatus.value = {
      type: 'error',
      icon: 'pi pi-times-circle',
      message: props.currentLang === 'ar'
        ? 'فشل التقاط الصورة'
        : 'Failed to capture photo'
    }
  } finally {
    isCapturing.value = false
  }
}

const retakePhoto = () => {
  capturedPhoto.value = null
  faceConfidence.value = 0
}

const handleIDUpload = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  // Validate file size
  if (file.size > 5 * 1024 * 1024) {
    verificationStatus.value = {
      type: 'error',
      icon: 'pi pi-times-circle',
      message: props.currentLang === 'ar'
        ? 'حجم الملف كبير جداً'
        : 'File is too large'
    }
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    uploadedID.value = e.target?.result
  }
  reader.readAsDataURL(file)
}

const clearID = () => {
  uploadedID.value = null
}

const verifyIdentity = async () => {
  if (!canVerify.value) return

  try {
    isVerifying.value = true
    verificationStatus.value = null

    // Convert images to blobs
    const faceBlob = dataURLtoBlob(capturedPhoto.value)
    const idBlob = dataURLtoBlob(uploadedID.value)

    // Create form data
    const formData = new FormData()
    formData.append('exam_attempt_id', props.attemptId)
    formData.append('face_image', faceBlob, 'face.jpg')
    formData.append('id_image', idBlob, 'id.jpg')
    formData.append('id_number', idNumber.value)

    // Send to backend
    const response = await api.post('/v1/proctoring/verify-identity', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.data.verified) {
      verificationStatus.value = {
        type: 'success',
        icon: 'pi pi-check-circle',
        message: props.currentLang === 'ar'
          ? 'تم التحقق من هويتك بنجاح'
          : 'Identity verified successfully'
      }

      setTimeout(() => {
        emit('complete')
      }, 1500)
    } else {
      verificationStatus.value = {
        type: 'error',
        icon: 'pi pi-times-circle',
        message: props.currentLang === 'ar'
          ? 'فشل التحقق من الهوية'
          : 'Identity verification failed'
      }
    }

  } catch (error) {
    console.error('Verification error:', error)
    verificationStatus.value = {
      type: 'error',
      icon: 'pi pi-times-circle',
      message: props.currentLang === 'ar'
        ? 'حدث خطأ في التحقق'
        : 'Verification error occurred'
    }
  } finally {
    isVerifying.value = false
  }
}

const dataURLtoBlob = (dataURL) => {
  const parts = dataURL.split(',')
  const bstr = atob(parts[1])
  const n = bstr.length
  const u8arr = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i)
  }
  return new Blob([u8arr], { type: 'image/jpeg' })
}

const goBack = () => {
  emit('back')
}

onMounted(() => {
  startCamera()
})

onUnmounted(() => {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop())
  }
})
</script>

<style scoped>
.identity-verification {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.instruction-card {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  color: #92400e;
}

.instruction-card i {
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.instruction-card h3 {
  margin: 0 0 0.2rem 0;
  font-weight: 600;
  font-size: 0.9rem;
}

.instruction-card p {
  margin: 0;
  font-size: 0.8rem;
}

/* Grid layout for the 3 verification cards */
.verification-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.verification-card {
  background: white;
  border-radius: 10px;
  padding: 1rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.verification-card h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
}

.video-container {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #1e293b;
  border-radius: 6px;
  overflow: hidden;
}

.video-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-capture {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  transition: all 0.2s ease;
}

.btn-capture:hover:not(:disabled) {
  background: #2563eb;
}

.btn-capture:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.photo-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 6px;
  overflow: hidden;
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-small {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  padding: 0.3rem 0.5rem;
  background: rgba(0,0,0,0.6);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s;
}

.btn-small:hover {
  background: rgba(0,0,0,0.85);
}

.upload-area {
  text-align: center;
  padding: 1.5rem 1rem;
  border: 2px dashed #cbd5e1;
  border-radius: 6px;
  background: #f8fafc;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.btn-upload {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s ease;
}

.btn-upload:hover {
  background: #2563eb;
}

.id-preview {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 6px;
  overflow: hidden;
}

.id-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-clear {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 0.5rem 1rem;
  background: rgba(239,68,68,0.9);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s ease;
}

.btn-clear:hover {
  background: rgba(239,68,68,1);
}

.id-input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: monospace;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.id-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

.status-message {
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
}

.status-message.success {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #86efac;
}

.status-message.error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  z-index: 1000;
  color: white;
}

.loading-overlay i {
  font-size: 2rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e2e8f0;
  color: #64748b;
}

.btn-secondary:hover {
  background: #cbd5e1;
}
</style>
