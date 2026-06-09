<template>
  <div class="camera-microphone-test" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'">
    <div class="test-section">
      <!-- Camera Test -->
      <div class="test-card">
        <h2 class="card-title">
          <i class="pi pi-camera"></i>
          {{ currentLang === 'ar' ? 'اختبار الكاميرا' : 'Camera Test' }}
        </h2>

        <div class="video-container">
          <video 
            ref="videoElement" 
            autoplay 
            playsinline 
            class="video-preview"
          ></video>
          <div v-if="!cameraActive" class="video-placeholder">
            <i class="pi pi-video-off text-4xl"></i>
            <p>{{ currentLang === 'ar' ? 'الكاميرا غير مفعلة' : 'Camera is off' }}</p>
          </div>
        </div>

        <div class="camera-controls">
          <button 
            @click="toggleCamera"
            class="btn-control"
            :class="{ active: cameraActive }"
          >
            <i :class="cameraActive ? 'pi pi-video' : 'pi pi-video-off'"></i>
            {{ cameraActive ? 
              (currentLang === 'ar' ? 'إيقاف الكاميرا' : 'Stop Camera') :
              (currentLang === 'ar' ? 'تشغيل الكاميرا' : 'Start Camera')
            }}
          </button>
        </div>

        <div v-if="cameraStatus" class="status-message" :class="cameraStatus.type">
          <i :class="cameraStatus.icon"></i>
          {{ cameraStatus.message }}
        </div>
      </div>

      <!-- Microphone Test -->
      <div class="test-card">
        <h2 class="card-title">
          <i class="pi pi-microphone"></i>
          {{ currentLang === 'ar' ? 'اختبار الميكروفون' : 'Microphone Test' }}
        </h2>

        <div class="audio-meter">
          <div class="meter-label">{{ currentLang === 'ar' ? 'مستوى الصوت' : 'Sound Level' }}</div>
          <div class="meter-bar">
            <div class="meter-fill" :style="{ width: audioLevel + '%' }"></div>
          </div>
          <div class="meter-value">{{ audioLevel }}%</div>
        </div>

        <div class="microphone-controls">
          <button 
            @click="toggleMicrophone"
            class="btn-control"
            :class="{ active: microphoneActive }"
          >
            <i :class="microphoneActive ? 'pi pi-microphone' : 'pi pi-microphone-off'"></i>
            {{ microphoneActive ?
              (currentLang === 'ar' ? 'إيقاف الميكروفون' : 'Stop Microphone') :
              (currentLang === 'ar' ? 'تشغيل الميكروفون' : 'Start Microphone')
            }}
          </button>

          <button 
            @click="playRecording"
            class="btn-control secondary"
            :disabled="!recordingAvailable"
          >
            <i class="pi pi-play"></i>
            {{ currentLang === 'ar' ? 'تشغيل التسجيل' : 'Play Recording' }}
          </button>
        </div>

        <div v-if="microphoneStatus" class="status-message" :class="microphoneStatus.type">
          <i :class="microphoneStatus.icon"></i>
          {{ microphoneStatus.message }}
        </div>
      </div>

      <!-- Device List -->
      <div class="test-card">
        <h2 class="card-title">
          <i class="pi pi-list"></i>
          {{ currentLang === 'ar' ? 'الأجهزة المتصلة' : 'Connected Devices' }}
        </h2>

        <div v-if="devices.length > 0" class="devices-list">
          <div v-for="(device, index) in devices" :key="index" class="device-item">
            <i class="pi" :class="getDeviceIcon(device.kind)"></i>
            <div class="device-info">
              <span class="device-label">{{ device.label || `${device.kind} Device` }}</span>
              <span class="device-id">{{ device.deviceId.slice(0, 20) }}...</span>
            </div>
          </div>
        </div>
        <div v-else class="no-devices">
          {{ currentLang === 'ar' ? 'لم يتم العثور على أجهزة' : 'No devices found' }}
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons mt-6">
      <button 
        @click="goBack"
        class="btn-secondary"
      >
        <i class="pi pi-arrow-left"></i>
        {{ currentLang === 'ar' ? 'رجوع' : 'Back' }}
      </button>

      <button 
        @click="proceedToNext"
        class="btn-primary"
        :disabled="!testComplete"
      >
        <i class="pi pi-arrow-right"></i>
        {{ currentLang === 'ar' ? 'التالي' : 'Next' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  currentLang: {
    type: String,
    default: 'en'
  }
})

const emit = defineEmits(['complete', 'back'])

const videoElement = ref(null)
const cameraActive = ref(false)
const microphoneActive = ref(false)
const audioLevel = ref(0)
const devices = ref([])
const recordingAvailable = ref(false)

let cameraStream = null
let audioContext = null
let analyser = null
let mediaRecorder = null
let recordedChunks = ref([])

const cameraStatus = computed(() => {
  if (!cameraActive.value) return null
  return {
    type: 'success',
    icon: 'pi pi-check-circle',
    message: props.currentLang === 'ar' ? 'الكاميرا تعمل بشكل صحيح' : 'Camera is working'
  }
})

const microphoneStatus = computed(() => {
  if (!microphoneActive.value) return null
  return {
    type: 'success',
    icon: 'pi pi-check-circle',
    message: props.currentLang === 'ar' ? 'الميكروفون يعمل بشكل صحيح' : 'Microphone is working'
  }
})

const testComplete = computed(() => {
  return cameraActive.value && microphoneActive.value && devices.value.length > 0
})

// Methods
const enumerateDevices = async () => {
  try {
    const deviceList = await navigator.mediaDevices.enumerateDevices()
    devices.value = deviceList
  } catch (error) {
    console.error('Failed to enumerate devices:', error)
  }
}

const toggleCamera = async () => {
  if (cameraActive.value) {
    stopCamera()
  } else {
    await startCamera()
  }
}

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

    cameraActive.value = true
  } catch (error) {
    console.error('Failed to start camera:', error)
  }
}

const stopCamera = () => {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop())
  }
  cameraActive.value = false
}

const toggleMicrophone = async () => {
  if (microphoneActive.value) {
    stopMicrophone()
  } else {
    await startMicrophone()
  }
}

const startMicrophone = async () => {
  try {
    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const source = audioContext.createMediaStreamSource(audioStream)
    analyser = audioContext.createAnalyser()
    source.connect(analyser)

    mediaRecorder = new MediaRecorder(audioStream)
    recordedChunks.value = []

    mediaRecorder.ondataavailable = (event) => {
      recordedChunks.value.push(event.data)
    }

    mediaRecorder.start()
    microphoneActive.value = true

    // Update audio level
    updateAudioLevel()
  } catch (error) {
    console.error('Failed to start microphone:', error)
  }
}

const stopMicrophone = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  if (analyser) {
    analyser.disconnect()
  }
  if (audioContext) {
    audioContext.close()
  }
  microphoneActive.value = false
  recordingAvailable.value = recordedChunks.value.length > 0
}

const updateAudioLevel = () => {
  if (!analyser || !microphoneActive.value) return

  const dataArray = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(dataArray)

  const average = dataArray.reduce((a, b) => a + b) / dataArray.length
  audioLevel.value = Math.min(100, Math.round((average / 255) * 100))

  if (microphoneActive.value) {
    requestAnimationFrame(updateAudioLevel)
  }
}

const playRecording = () => {
  if (recordedChunks.value.length === 0) return

  const blob = new Blob(recordedChunks.value, { type: 'audio/webm' })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.play()
}

const getDeviceIcon = (kind) => {
  return kind === 'videoinput' ? 'pi-camera' : 'pi-microphone'
}

const proceedToNext = () => {
  emit('complete')
}

const goBack = () => {
  emit('back')
}

onMounted(() => {
  enumerateDevices()

  // Listen for device changes
  navigator.mediaDevices.addEventListener('devicechange', enumerateDevices)
})

onUnmounted(() => {
  stopCamera()
  stopMicrophone()
  navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices)
})
</script>

<style scoped>
.camera-microphone-test {
  padding: 0.5rem;
}

.test-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.5rem;
}

.test-card {
  background: white;
  border-radius: 6px;
  padding: 0.6rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e293b;
}

.video-container {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.4rem;
}

.video-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1e293b;
  color: #94a3b8;
  gap: 0.4rem;
  font-size: 0.8rem;
}

.camera-controls,
.microphone-controls {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
  flex-wrap: wrap;
}

.btn-control {
  flex: 1;
  min-width: 90px;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-control:hover {
  background: #cbd5e1;
}

.btn-control.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.btn-control.secondary {
  background: #f3f4f6;
}

.btn-control:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.audio-meter {
  margin-bottom: 0.4rem;
}

.meter-label {
  font-size: 0.75rem;
  font-weight: 500;
  margin-bottom: 0.2rem;
  color: #64748b;
}

.meter-bar {
  width: 100%;
  height: 3px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.2rem;
}

.meter-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.1s ease;
}

.meter-value {
  text-align: right;
  font-weight: 500;
  color: #3b82f6;
  font-size: 0.75rem;
}

.devices-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  max-height: 100px;
  overflow-y: auto;
}

.device-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem;
  background: #f8fafc;
  border-radius: 3px;
  border: 1px solid #e2e8f0;
  font-size: 0.7rem;
}

.device-item i {
  font-size: 0.8rem;
  color: #3b82f6;
  flex-shrink: 0;
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}

.device-label {
  font-weight: 500;
  color: #1e293b;
  font-size: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.device-id {
  font-size: 0.6rem;
  color: #94a3b8;
  font-family: monospace;
}

.no-devices {
  text-align: center;
  padding: 0.5rem;
  color: #94a3b8;
  font-size: 0.75rem;
}

.status-message {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.status-message.success {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #86efac;
}

.action-buttons {
  display: flex;
  gap: 0.4rem;
  justify-content: flex-end;
  margin-top: 0.4rem;
  padding-top: 0.4rem;
  border-top: 1px solid #e2e8f0;
}

.btn-primary,
.btn-secondary {
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  font-weight: 500;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  border: none;
  white-space: nowrap;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-2px);
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

@media (max-width: 768px) {
  .test-section {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column-reverse;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
  }
}
</style>
