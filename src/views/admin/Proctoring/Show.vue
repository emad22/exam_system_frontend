<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
// @ts-ignore
import api from '@/services/api'
import AdminLayout from '@/components/AdminLayout.vue'
// @ts-ignore
import { useModal } from '@/composables/useModal';

const router = useRouter()
const route = useRoute()

// ─── Language ───────────────────────────────────────────────────────────────
const currentLang = ref<'ar' | 'en'>((localStorage.getItem('dashboard_lang') as 'ar' | 'en') || 'ar')
const toggleLang = () => {
  currentLang.value = currentLang.value === 'ar' ? 'en' : 'ar'
  localStorage.setItem('dashboard_lang', currentLang.value)
}

const t = {
  ar: {
    loading: 'جاري تحميل بيانات الجلسة...',
    notFound: 'لم يتم العثور على الجلسة',
    sessionTitle: 'جلسة الاختبار',
    backToSessions: 'العودة إلى الجلسات',
    backToStudent: 'العودة لملف الطالب',
    pauseSession: '⏸ إيقاف الجلسة',
    resumeSession: '▶ استئناف الجلسة',
    endSession: '🛑 إنهاء الجلسة',
    viewReport: '📊 عرض التقرير',
    tabStudent: 'معلومات الطالب',
    tabStatistics: 'الإحصائيات',
    tabViolations: 'الانتهاكات',
    tabLogs: 'السجلات',
    studentName: 'اسم الطالب:',
    email: 'البريد الإلكتروني:',
    exam: 'الامتحان:',
    identityVerified: 'تم التحقق من الهوية:',
    yes: '✓ نعم',
    no: '✗ لا',
    verificationScore: 'درجة التحقق:',
    ipAddress: 'عنوان IP:',
    browser: 'المتصفح:',
    system: 'النظام:',
    unknown: 'غير معروف',
    notSetYet: 'لم يُحدد بعد',
    sessionDuration: 'مدة الجلسة',
    totalViolations: 'إجمالي الانتهاكات',
    riskScore: 'درجة الخطر',
    violationsSummary: 'ملخص الانتهاكات',
    faceDetection: 'كشف الوجوه:',
    tabSwitching: 'تبديل التبويبات:',
    copyPaste: 'نسخ/لصق:',
    externalDevices: 'أجهزة خارجية:',
    violationsDistribution: 'توزيع الانتهاكات',
    noViolations: 'لا توجد انتهاكات في هذه الجلسة',
    review: 'مراجعة',
    faceDetectionLogs: 'سجلات كشف الوجه',
    noFaceLogs: 'لا توجد سجلات كشف وجه لهذه الجلسة',
    facesDetected: 'عدد الوجوه المكتشفة:',
    noFaceDetected: 'لم يتم كشف وجه',
    moreThanOneFace: 'أكثر من وجه',
    verificationAccuracy: 'دقة الفحص:',
    reviewViolation: 'مراجعة الانتهاك',
    status: 'الحالة:',
    confirmed: 'مؤكدة',
    dismissed: 'مرفوضة',
    suspicious: 'مريبة',
    notes: 'ملاحظات:',
    addNotes: 'أضف ملاحظاتك...',
    actionTaken: 'الإجراء المتخذ:',
    noAction: 'بدون إجراء',
    warning: 'تحذير',
    pauseExam: 'إيقاف الاختبار',
    terminateExam: 'إنهاء الاختبار',
    reportToInstructor: 'إبلاغ المعلم',
    save: 'حفظ',
    cancel: 'إلغاء',
    statusPending: 'قيد الانتظار',
    statusActive: 'نشطة',
    statusPaused: 'موقوفة',
    statusEnded: 'منتهية',
    statusCancelled: 'ملغاة',
    violationPending: 'قيد الانتظار',
    violationConfirmed: 'مؤكدة',
    violationDismissed: 'مرفوضة',
    violationSuspicious: 'مريبة',
    severityInfo: 'معلومة',
    severityLow: 'منخفضة',
    severityMedium: 'متوسطة',
    severityHigh: 'عالية',
    severityCritical: 'حرجة',
    riskVeryHigh: 'خطر مرتفع جداً (غش مؤكد)',
    riskHigh: 'خطر مرتفع',
    riskMedium: 'خطر متوسط',
    riskSafe: 'آمن',
    violationMultipleFaces: 'عدة وجوه',
    violationFaceNotVisible: 'الوجه غير مرئي',
    violationFaceSwap: 'تبديل الوجه',
    violationTabSwitched: 'تبديل التبويب',
    violationBrowserOpened: 'فتح متصفح',
    violationCopyPaste: 'نسخ/لصق',
    violationExternalDevice: 'جهاز خارجي',
    violationSuspiciousAudio: 'صوت مريب',

    endSessionConfirmTitle: 'إنهاء الجلسة',
    endSessionConfirmMsg: 'ماذا تريد أن تفعل؟',
    endAndGoBack: 'إنهاء والعودة للقائمة',
    onlyPauseExam: 'إيقاف الاختبار فقط',
    sessionEnded: 'تم إنهاء الجلسة',
    sessionEndedMsg: 'تم إنهاء الجلسة بنجاح',
    error: 'خطأ',
    errorMsg: 'حدث خطأ أثناء إنهاء الجلسة',
    ok: 'حسناً',
    endSkillExam: '❌ إنهاء المهارة الحالية',
    endSkillConfirmMsg: 'سيتم إنهاء هذه المهارة وإخراج الطالب إلى صفحة اختيار المهارات. هل أنت متأكد؟',
    endSkillSuccess: 'تم إنهاء المهارة وإخراج الطالب بنجاح.',
  },
  en: {
    loading: 'Loading session data...',
    notFound: 'Session not found',
    sessionTitle: 'Exam Session',
    backToSessions: 'Back to Sessions',
    backToStudent: 'Back to Student Profile',
    pauseSession: '⏸ Pause Session',
    resumeSession: '▶ Resume Session',
    endSession: '🛑 End Session',
    viewReport: '📊 View Report',
    tabStudent: 'Student Info',
    tabStatistics: 'Statistics',
    tabViolations: 'Violations',
    tabLogs: 'Logs',
    studentName: 'Student Name:',
    email: 'Email:',
    exam: 'Exam:',
    identityVerified: 'Identity Verified:',
    yes: '✓ Yes',
    no: '✗ No',
    verificationScore: 'Verification Score:',
    ipAddress: 'IP Address:',
    browser: 'Browser:',
    system: 'System:',
    unknown: 'Unknown',
    notSetYet: 'Not set yet',
    sessionDuration: 'Session Duration',
    totalViolations: 'Total Violations',
    riskScore: 'Risk Score',
    violationsSummary: 'Violations Summary',
    faceDetection: 'Face Detection:',
    tabSwitching: 'Tab Switching:',
    copyPaste: 'Copy/Paste:',
    externalDevices: 'External Devices:',
    violationsDistribution: 'Violations Distribution',
    noViolations: 'No violations in this session',
    review: 'Review',
    faceDetectionLogs: 'Face Detection Logs',
    noFaceLogs: 'No face detection logs for this session',
    facesDetected: 'Faces Detected:',
    noFaceDetected: 'No face detected',
    moreThanOneFace: 'More than one face',
    verificationAccuracy: 'Verification Accuracy:',
    reviewViolation: 'Review Violation',
    status: 'Status:',
    confirmed: 'Confirmed',
    dismissed: 'Dismissed',
    suspicious: 'Suspicious',
    notes: 'Notes:',
    addNotes: 'Add your notes...',
    actionTaken: 'Action Taken:',
    noAction: 'No Action',
    warning: 'Warning',
    pauseExam: 'Pause Exam',
    terminateExam: 'Terminate Exam',
    reportToInstructor: 'Report to Instructor',
    save: 'Save',
    cancel: 'Cancel',
    statusPending: 'Pending',
    statusActive: 'Active',
    statusPaused: 'Paused',
    statusEnded: 'Ended',
    statusCancelled: 'Cancelled',
    violationPending: 'Pending',
    violationConfirmed: 'Confirmed',
    violationDismissed: 'Dismissed',
    violationSuspicious: 'Suspicious',
    severityInfo: 'Info',
    severityLow: 'Low',
    severityMedium: 'Medium',
    severityHigh: 'High',
    severityCritical: 'Critical',
    riskVeryHigh: 'Very High Risk (Confirmed Cheating)',
    riskHigh: 'High Risk',
    riskMedium: 'Medium Risk',
    riskSafe: 'Safe',
    violationMultipleFaces: 'Multiple Faces',
    violationFaceNotVisible: 'Face Not Visible',
    violationFaceSwap: 'Face Swap',
    violationTabSwitched: 'Tab Switched',
    violationBrowserOpened: 'Browser Opened',
    violationCopyPaste: 'Copy/Paste',
    violationExternalDevice: 'External Device',
    violationSuspiciousAudio: 'Suspicious Audio',

    endSessionConfirmTitle: 'End Session',
    endSessionConfirmMsg: 'What would you like to do?',
    endAndGoBack: 'End Session',
    onlyPauseExam: 'Pause Exam Only',
    sessionEnded: 'Session Ended',
    sessionEndedMsg: 'Session ended successfully',
    error: 'Error',
    errorMsg: 'Error ending session',
    ok: 'OK',
    endSkillExam: '❌ End Current Skill',
    endSkillConfirmMsg: 'This will end the current skill and redirect the student to skill selection. Are you sure?',
    endSkillSuccess: 'Skill ended and student has been kicked out successfully.',
  },
}


const { showAlert } = useModal();
// Types
interface Session {
  id: number
  created_at: string
  status: string
  student: { id: number; user?: { name: string; email: string } }
  exam_attempt: { exam: { title: string } }
  identity_verified: boolean
  face_verification_score: number
  ip_address: string
  browser_info: any
  device_info: any
  duration_seconds: number
  violations_count: number
  risk_score: number
  face_detection_alerts: number
  tab_switch_alerts: number
  copy_paste_alerts: number
  external_device_alerts: number
  violations: any[]
  face_detection_logs: any[]
  device_detection_logs: any[]
}




// State
const session = ref<Session | null>(null)
const loading = ref(true)
const activeTab = ref('student')
const tabs = ref(['student', 'statistics', 'violations', 'logs'])
const statistics = ref<any>({})

const showReviewModal = ref(false)
const currentViolationId = ref<number | null>(null)
const reviewForm = ref({
  status: 'confirmed',
  proctor_notes: '',
  action_taken: '',
})

// Methods
const fetchSession = async () => {
  try {
    const response = await api.get(`/admin/proctoring/${route.params.id}`)

    session.value = {
      ...response.data.session,
      violations: response.data.violations ?? [],
      face_detection_logs: response.data.face_detection_logs ?? [],
      device_detection_logs: response.data.device_detection_logs ?? [],
    }
    statistics.value = response.data.statistics || {}
  } catch (error) {
    console.error('Failed to fetch session:', error)
  } finally {
    loading.value = false
  }
}

const updateStatus = async (newStatus: string) => {
  try {
    await api.patch(`/admin/proctoring/${session.value?.id}/status`, { status: newStatus })
    await fetchSession()
  } catch (error) {
    console.error('Failed to update status:', error)
  }
}

const reviewViolation = (violationId: number) => {
  currentViolationId.value = violationId
  reviewForm.value = {
    status: 'confirmed',
    proctor_notes: '',
    action_taken: '',
  }
  showReviewModal.value = true
}

const submitReview = async () => {
  try {
    await api.post(`/admin/proctoring/${currentViolationId.value}/review`, {
      ...reviewForm.value,
    })
    showReviewModal.value = false
    await fetchSession()
  } catch (error) {
    console.error('Failed to submit review:', error)
  }
}

const formatDate = (date: string) => {
  const locale = currentLang.value === 'ar' ? 'ar-SA' : 'en-GB'
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDuration = (seconds: number | null) => {
  if (!seconds) return t[currentLang.value].unknown
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: 'statusPending',
    active: 'statusActive',
    paused: 'statusPaused',
    ended: 'statusEnded',
    cancelled: 'statusCancelled',
  }
  const key = map[status]
  if (key) {
    const langObj = t[currentLang.value] as Record<string, string>
    return langObj[key] || status
  }
  return status
}

const getTabLabel = (tab: string) => {
  const map: Record<string, string> = {
    student: 'tabStudent',
    statistics: 'tabStatistics',
    violations: 'tabViolations',
    logs: 'tabLogs',
  }
  const key = map[tab]
  if (key) {
    const langObj = t[currentLang.value] as Record<string, string>
    return langObj[key] || tab
  }
  return tab
}

const getViolationTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    multiple_faces: 'violationMultipleFaces',
    face_not_visible: 'violationFaceNotVisible',
    face_swap: 'violationFaceSwap',
    tab_switched: 'violationTabSwitched',
    browser_opened: 'violationBrowserOpened',
    copy_paste: 'violationCopyPaste',
    external_device: 'violationExternalDevice',
    suspicious_audio: 'violationSuspiciousAudio',
  }
  const key = map[type]
  if (key) {
    const langObj = t[currentLang.value] as Record<string, string>
    return langObj[key] || type
  }
  return type
}

const getSeverityLabel = (severity: string) => {
  const map: Record<string, string> = {
    info: 'severityInfo',
    low: 'severityLow',
    medium: 'severityMedium',
    high: 'severityHigh',
    critical: 'severityCritical',
  }
  const key = map[severity]
  if (key) {
    const langObj = t[currentLang.value] as Record<string, string>
    return langObj[key] || severity
  }
  return severity
}

const getViolationStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: 'violationPending',
    confirmed: 'violationConfirmed',
    dismissed: 'violationDismissed',
    suspicious: 'violationSuspicious',
  }
  const key = map[status]
  if (key) {
    const langObj = t[currentLang.value] as Record<string, string>
    return langObj[key] || status
  }
  return status
}

const getRiskColor = (score: number) => {
  if (score > 80) return '#ef4444'
  if (score > 60) return '#f59e0b'
  if (score > 40) return '#eab308'
  return '#10b981'
}

const getViolationColor = (count: number) => {
  if (count > 5) return '#ef4444'
  if (count > 2) return '#f59e0b'
  return '#10b981'
}

const getViolationPercentage = (count: number) => {
  if (!session.value?.violations_count || session.value.violations_count === 0) return 0
  return Math.round((count / session.value.violations_count) * 100)
}


const confirmEndSession = () => {
  showAlert({
    title: t[currentLang.value].endSessionConfirmTitle,
    message: t[currentLang.value].endSessionConfirmMsg,
    type: 'warning',
    showCancel: true,
    confirmText: t[currentLang.value].endAndGoBack,
    cancelText: t[currentLang.value].onlyPauseExam,
  }).then((confirmed: any) => {
    if (confirmed) {
      endSession(true)
    } else {
      endSession(false)
    }
  })
}

const confirmEndSkillExam = () => {
  showAlert({
    title: t[currentLang.value].endSkillExam,
    message: t[currentLang.value].endSkillConfirmMsg,
    type: 'warning',
    showCancel: true,
    confirmText: currentLang.value === 'ar' ? 'نعم، إنهاء' : 'Yes, End it',
    cancelText: t[currentLang.value].cancel,
  }).then(async (confirmed: any) => {
    if (!confirmed) return
    try {
      await api.post(`/admin/proctoring/${session.value?.id}/end-skill`)
      await fetchSession()
      showAlert({
        title: t[currentLang.value].endSkillExam,
        message: t[currentLang.value].endSkillSuccess,
        type: 'success',
        confirmText: t[currentLang.value].ok,
      })
    } catch (error) {
      console.error('Error ending skill:', error)
      showAlert({
        title: t[currentLang.value].error,
        message: t[currentLang.value].errorMsg,
        type: 'error',
        confirmText: t[currentLang.value].ok,
      })
    }
  })
}


const endSession = async (endExam: boolean) => {
  try {
    if (endExam) {
      // End the session completely via admin endpoint
      await api.patch(`/admin/proctoring/${session.value?.id}/status`, {
        status: 'ended',
      })
    } else {
      // Pause only — student will be notified via session polling and redirected to skill selection
      await api.patch(`/admin/proctoring/${session.value?.id}/status`, {
        status: 'paused',
      })
    }
    await fetchSession()
    showAlert({
      title: t[currentLang.value].sessionEnded,
      message: t[currentLang.value].sessionEndedMsg,
      type: 'success',
      confirmButtonText: t[currentLang.value].ok,
      onConfirm: () => {
        if (endExam) {
          if (session.value?.student?.id) {
            router.push(`/admin/proctoring/student/${session.value.student.id}`)
          } else {
            router.push('/admin/proctoring')
          }
        }
      },
    })
  } catch (error) {
    console.error('Error ending session:', error)
    showAlert({
      title: t[currentLang.value].error,
      message: t[currentLang.value].errorMsg,
      type: 'error',
      confirmButtonText: t[currentLang.value].ok,
    })
  }
}



const getRiskLabel = (score: number) => {
  if (score > 80) return t[currentLang.value].riskVeryHigh
  if (score > 60) return t[currentLang.value].riskHigh
  if (score > 40) return t[currentLang.value].riskMedium
  return t[currentLang.value].riskSafe
}

let pollingInterval: any = null

const startPolling = () => {
  pollingInterval = setInterval(async () => {
    if (session.value && session.value.status === 'active') {
      await fetchSession()
    }
  }, 5000)
}

const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
  }
}

// Lifecycle
onMounted(() => {
  fetchSession()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>



<template>
  <AdminLayout>
    <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4">
      <!-- Back Button & Language Toggle -->
      <div class="flex flex-wrap items-center gap-3">
        <router-link
          :to="session?.student?.id ? `/admin/proctoring/student/${session.student.id}` : '/admin/proctoring'"
          class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
          <i class="pi pi-arrow-right"></i> {{ session?.student?.id ? t[currentLang].backToStudent :
            t[currentLang].backToSessions }}
        </router-link>
        <!-- Language Toggle -->
        <button @click="toggleLang"
          class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 font-extrabold text-xs">
          <i class="pi pi-globe text-brand-primary"></i>
          <span>{{ currentLang === 'ar' ? 'English' : 'العربية' }}</span>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <p>{{ t[currentLang].loading }}</p>
      </div>

      <!-- Session Not Found -->
      <div v-else-if="!session" class="error-container">
        <p>{{ t[currentLang].notFound }}</p>
      </div>

      <!-- Session Details -->
      <div v-else class="session-details">
        <!-- Header with Session Info -->
        <div class="header-card">
          <div class="header-info">
            <div class="session-title flex items-center gap-3">
              <h1>{{ t[currentLang].sessionTitle }} #{{ session.id }}</h1>
              <span :class="['status-badge', `status-${session.status}`]">
                {{ getStatusLabel(session.status) }}
              </span>
              <span
                :style="{ backgroundColor: getRiskColor(session.risk_score) + '15', color: getRiskColor(session.risk_score), border: '1px solid ' + getRiskColor(session.risk_score) + '30' }"
                class="px-2 py-1 rounded text-xs font-bold font-sans">
                {{ getRiskLabel(session.risk_score) }}
              </span>
            </div>
            <div class="session-date">{{ formatDate(session.created_at) }}</div>
          </div>

          <!-- <div class="header-actions">
            <button v-if="session.status === 'active'" class="btn-action btn-pause" @click="updateStatus('paused')">
              {{ t[currentLang].pauseSession }}
            </button>
            <button v-else-if="session.status === 'paused'" class="btn-action btn-resume"
              @click="updateStatus('active')">
              {{ t[currentLang].resumeSession }}
            </button>
            <button v-if="session.status === 'active'" class="btn-action" style="background:#b45309;color:#fff;"
              @click="confirmEndSkillExam">
              {{ t[currentLang].endSkillExam }}
            </button>
            <button v-if="session.status !== 'ended'" class="btn-action btn-end" @click="confirmEndSession">
              {{ t[currentLang].endSession }}
            </button>
            <router-link :to="`/admin/proctoring/${session.id}/report`" class="btn-action btn-report">
              {{ t[currentLang].viewReport }}
            </router-link>
          </div> -->
        </div>

        <!-- Tabs -->
        <div class="tabs-section">
          <div class="tabs-nav">
            <button v-for="tab in tabs" :key="tab" :class="['tab-btn', { active: activeTab === tab }]"
              @click="activeTab = tab">
              {{ getTabLabel(tab) }}
            </button>
          </div>

          <!-- Tab Content: Student Info -->
          <div v-if="activeTab === 'student'" class="tab-content">
            <div class="info-grid">
              <div class="info-item">
                <label>{{ t[currentLang].studentName }}</label>
                <span>{{ session.student?.user?.name }}</span>
              </div>
              <div class="info-item">
                <label>{{ t[currentLang].email }}</label>
                <span>{{ session.student?.user?.email }}</span>
              </div>
              <div class="info-item">
                <label>{{ t[currentLang].exam }}</label>
                <span>{{ session.exam_attempt?.exam?.title || t[currentLang].notSetYet }}</span>
              </div>
              <div class="info-item">
                <label>{{ t[currentLang].identityVerified }}</label>
                <span :class="{ 'verified': session.identity_verified, 'not-verified': !session.identity_verified }">
                  {{ session.identity_verified ? t[currentLang].yes : t[currentLang].no }}
                </span>
              </div>
              <div class="info-item" v-if="session.identity_verified">
                <label>{{ t[currentLang].verificationScore }}</label>
                <span>{{ session.face_verification_score }}%</span>
              </div>
              <div class="info-item">
                <label>{{ t[currentLang].ipAddress }}</label>
                <span>{{ session.ip_address }}</span>
              </div>
              <div class="info-item">
                <label>{{ t[currentLang].browser }}</label>
                <span>{{ session.browser_info?.name || t[currentLang].unknown }}</span>
              </div>
              <div class="info-item">
                <label>{{ t[currentLang].system }}</label>
                <span>{{ session.device_info?.os || t[currentLang].unknown }}</span>
              </div>
            </div>
          </div>

          <!-- Tab Content: Session Statistics -->
          <div v-if="activeTab === 'statistics'" class="tab-content">
            <div class="stats-container">
              <div class="stat-box">
                <div class="stat-label">{{ t[currentLang].sessionDuration }}</div>
                <div class="stat-value">{{ formatDuration(session.duration_seconds) }}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">{{ t[currentLang].totalViolations }}</div>
                <div class="stat-value" :style="{ color: getViolationColor(session.violations_count) }">
                  {{ session.violations_count }}
                </div>
              </div>
              <div class="stat-box">
                <div class="stat-label">{{ t[currentLang].riskScore }}</div>
                <div class="stat-value" :style="{ color: getRiskColor(session.risk_score) }">
                  {{ session.risk_score }}/100
                </div>
                <div class="risk-bar-large">
                  <div class="risk-fill"
                    :style="{ width: session.risk_score + '%', backgroundColor: getRiskColor(session.risk_score) }">
                  </div>
                </div>
              </div>
            </div>

            <div class="violations-summary">
              <h3>{{ t[currentLang].violationsSummary }}</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="label">{{ t[currentLang].faceDetection }}</span>
                  <span class="value">{{ session.face_detection_alerts }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">{{ t[currentLang].tabSwitching }}</span>
                  <span class="value">{{ session.tab_switch_alerts }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">{{ t[currentLang].copyPaste }}</span>
                  <span class="value">{{ session.copy_paste_alerts }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">{{ t[currentLang].externalDevices }}</span>
                  <span class="value">{{ session.external_device_alerts }}</span>
                </div>
              </div>
            </div>

            <!-- Violations by Type -->
            <div class="chart-section" v-if="statistics.violations_by_type.length > 0">
              <h3>{{ t[currentLang].violationsDistribution }}</h3>
              <div class="violation-types">
                <div v-for="viol in statistics.violations_by_type" :key="viol.violation_type"
                  class="violation-type-item">
                  <span class="type-label">{{ getViolationTypeLabel(viol.violation_type) }}</span>
                  <div class="type-bar">
                    <div class="type-fill" :style="{ width: getViolationPercentage(viol.count) + '%' }"></div>
                  </div>
                  <span class="type-count">{{ viol.count }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab Content: Violations -->
          <div v-if="activeTab === 'violations'" class="tab-content">
            <div class="violations-list">
              <div v-if="session.violations.length === 0" class="empty-state">
                <p>{{ t[currentLang].noViolations }}</p>
              </div>
              <div v-else>
                <div v-for="violation in session.violations" :key="violation.id" class="violation-card">
                  <div class="violation-header">
                    <div class="violation-type">
                      <span class="type-name">{{ getViolationTypeLabel(violation.violation_type) }}</span>
                      <span :class="['severity-badge', `severity-${violation.severity}`]">
                        {{ getSeverityLabel(violation.severity) }}
                      </span>
                    </div>
                    <div class="violation-time">{{ formatDate(violation.timestamp) }}</div>
                  </div>

                  <div v-if="violation.description" class="violation-description">
                    {{ violation.description }}
                  </div>

                  <div v-if="violation.screenshot_url" class="violation-screenshot">
                    <img :src="violation.screenshot_url" :alt="`Screenshot - ${violation.violation_type}`" />
                  </div>

                  <div class="violation-footer">
                    <span :class="['status-label', `status-${violation.status}`]">
                      {{ getViolationStatusLabel(violation.status) }}
                    </span>
                    <button v-if="!violation.reviewed_at" class="btn-review" @click="reviewViolation(violation.id)">
                      {{ t[currentLang].review }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab Content: Logs -->
          <!-- Tab Content: Logs -->
          <div v-if="activeTab === 'logs'" class="tab-content">
            <div class="logs-container">
              <h3>{{ t[currentLang].faceDetectionLogs }}</h3>
              <div v-if="!session.face_detection_logs || session.face_detection_logs.length === 0" class="empty-state">
                <p>{{ t[currentLang].noFaceLogs }}</p>
              </div>
              <div v-else class="logs-list">
                <div v-for="log in session.face_detection_logs" :key="log.id" :class="[
                  'log-item flex gap-3 p-3 rounded-xl mb-2 border text-sm',
                  log.face_lost
                    ? 'bg-rose-50 border-rose-200'
                    : log.secondary_face_detected
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                ]">

                  <!-- Icon -->
                  <div class="text-lg mt-0.5">
                    <span v-if="log.face_lost">🚫</span>
                    <span v-else-if="log.secondary_face_detected">⚠️</span>
                    <span v-else>✅</span>
                  </div>

                  <!-- Content -->
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <!-- Status text -->
                      <span :class="[
                        'font-semibold font-sans',
                        log.face_lost ? 'text-rose-600' : log.secondary_face_detected ? 'text-amber-600' : 'text-slate-700'
                      ]">
                        <span v-if="log.face_lost">{{ t[currentLang].noFaceDetected }}</span>
                        <span v-else-if="log.secondary_face_detected">{{ t[currentLang].moreThanOneFace }}</span>
                        <span v-else>{{ currentLang === 'ar' ? 'وجه واحد مكتشف' : 'Face Detected' }}</span>
                      </span>

                      <!-- Time -->
                      <span class="text-xs text-slate-400 font-sans">{{ formatDate(log.timestamp) }}</span>
                    </div>

                    <!-- Confidence -->
                    <div v-if="log.primary_face_confidence && log.face_count > 0" class="mt-1 flex items-center gap-2">
                      <span class="text-xs text-slate-500 font-sans">
                        {{ t[currentLang].verificationAccuracy }}
                      </span>
                      <div class="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden max-w-[100px]">
                        <div class="h-full bg-emerald-400 rounded-full"
                          :style="{ width: Math.round(log.primary_face_confidence * 100) + '%' }">
                        </div>
                      </div>
                      <span class="text-xs font-bold text-slate-600 font-sans">
                        {{ Math.round(log.primary_face_confidence * 100) }}%
                      </span>
                    </div>

                    <!-- Screenshot -->
                    <div v-if="log.screenshot_url" class="mt-2">
                      <img :src="log.screenshot_url" class="max-w-[200px] rounded-lg border border-slate-200 shadow-sm"
                        :alt="currentLang === 'ar' ? 'لقطة شاشة' : 'Screenshot'" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Review Violation Modal -->
      <div v-if="showReviewModal" class="modal-overlay" @click.self="showReviewModal = false">
        <div class="modal-content">
          <h2>{{ t[currentLang].reviewViolation }}</h2>
          <form @submit.prevent="submitReview">
            <div class="form-group">
              <label>{{ t[currentLang].status }}</label>
              <select v-model="reviewForm.status" required>
                <option value="confirmed">{{ t[currentLang].confirmed }}</option>
                <option value="dismissed">{{ t[currentLang].dismissed }}</option>
                <option value="suspicious">{{ t[currentLang].suspicious }}</option>
              </select>
            </div>

            <div class="form-group">
              <label>{{ t[currentLang].notes }}</label>
              <textarea v-model="reviewForm.proctor_notes" rows="4" :placeholder="t[currentLang].addNotes"></textarea>
            </div>

            <div class="form-group">
              <label>{{ t[currentLang].actionTaken }}</label>
              <select v-model="reviewForm.action_taken">
                <option value="">{{ t[currentLang].noAction }}</option>
                <option value="warning">{{ t[currentLang].warning }}</option>
                <option value="pause_exam">{{ t[currentLang].pauseExam }}</option>
                <option value="terminate_exam">{{ t[currentLang].terminateExam }}</option>
                <option value="report_to_instructor">{{ t[currentLang].reportToInstructor }}</option>
              </select>
            </div>

            <div class="modal-actions">
              <button type="submit" class="btn-submit">{{ t[currentLang].save }}</button>
              <button type="button" class="btn-cancel" @click="showReviewModal = false">{{ t[currentLang].cancel
              }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>


  </AdminLayout>
</template>



<style scoped>
.session-detail-page {
  padding: 20px;
  background: #f9fafb;
  min-height: 100vh;
}

.btn-back {
  display: inline-block;
  margin-bottom: 20px;
  padding: 8px 16px;
  background: #e5e7eb;
  color: #374151;
  text-decoration: none;
  border-radius: 6px;
  font-size: 14px;
  transition: background 0.2s;

  &:hover {
    background: #d1d5db;
  }
}

.loading-container,
.error-container {
  background: white;
  padding: 40px;
  border-radius: 8px;
  text-align: center;
  color: #6b7280;
}

.header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 20px;

  .header-info {
    flex: 1;
    min-width: 200px;

    .session-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;

      h1 {
        margin: 0;
        font-size: 24px;
        color: #1f2937;
      }

      .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;

        &.status-pending {
          background: #e0e7ff;
          color: #4338ca;
        }

        &.status-active {
          background: #dcfce7;
          color: #166534;
        }

        &.status-paused {
          background: #fef3c7;
          color: #92400e;
        }

        &.status-ended {
          background: #e5e7eb;
          color: #374151;
        }
      }
    }

    .session-date {
      color: #6b7280;
      font-size: 14px;
    }
  }

  .header-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;

    .btn-action {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-block;

      &.btn-pause {
        background: #f59e0b;
        color: white;

        &:hover {
          background: #d97706;
        }
      }

      &.btn-resume {
        background: #10b981;
        color: white;

        &:hover {
          background: #059669;
        }
      }

      &.btn-end {
        background: #ef4444;
        color: white;

        &:hover {
          background: #dc2626;
        }
      }

      &.btn-report {
        background: #3b82f6;
        color: white;

        &:hover {
          background: #2563eb;
        }
      }
    }
  }
}

.tabs-section {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;

  .tabs-nav {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
    background: #f3f4f6;

    .tab-btn {
      flex: 1;
      padding: 12px;
      border: none;
      background: transparent;
      color: #6b7280;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;

      &:hover {
        background: #e5e7eb;
      }

      &.active {
        color: #3b82f6;
        border-bottom-color: #3b82f6;
      }
    }
  }

  .tab-content {
    padding: 20px;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;

  .info-item {
    display: flex;
    flex-direction: column;

    label {
      font-weight: 600;
      color: #374151;
      margin-bottom: 5px;
      font-size: 14px;
    }

    span {
      color: #6b7280;
      font-size: 14px;

      &.verified {
        color: #10b981;
        font-weight: 500;
      }

      &.not-verified {
        color: #ef4444;
        font-weight: 500;
      }
    }
  }
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;

  .stat-box {
    background: #f3f4f6;
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;

    .stat-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 5px;
      text-transform: uppercase;
    }

    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 10px;
    }

    .risk-bar-large {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;

      .risk-fill {
        height: 100%;
        transition: width 0.3s;
      }
    }
  }
}

.violations-summary {
  background: #f3f4f6;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;

  h3 {
    margin: 0 0 15px;
    color: #1f2937;
    font-size: 16px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;

    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      background: white;
      border-radius: 6px;

      .label {
        font-size: 12px;
        color: #6b7280;
        font-weight: 500;
      }

      .value {
        font-size: 14px;
        color: #1f2937;
        font-weight: bold;
      }
    }
  }
}

.chart-section {
  margin-top: 20px;

  h3 {
    color: #1f2937;
    font-size: 16px;
    margin-bottom: 15px;
  }

  .violation-types {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .violation-type-item {
      display: flex;
      align-items: center;
      gap: 10px;

      .type-label {
        flex: 0 0 150px;
        font-size: 12px;
        color: #6b7280;
      }

      .type-bar {
        flex: 1;
        height: 6px;
        background: #e5e7eb;
        border-radius: 3px;
        overflow: hidden;

        .type-fill {
          height: 100%;
          background: #3b82f6;
        }
      }

      .type-count {
        flex: 0 0 30px;
        text-align: right;
        font-weight: 500;
        color: #1f2937;
      }
    }
  }
}

.violations-list {
  .empty-state {
    text-align: center;
    padding: 40px;
    color: #6b7280;
  }

  .violation-card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;

    .violation-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;

      .violation-type {
        display: flex;
        align-items: center;
        gap: 10px;

        .type-name {
          font-weight: 600;
          color: #1f2937;
        }

        .severity-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;

          &.severity-critical {
            background: #fee2e2;
            color: #991b1b;
          }

          &.severity-high {
            background: #fef3c7;
            color: #92400e;
          }

          &.severity-medium {
            background: #fce7f3;
            color: #831843;
          }

          &.severity-low {
            background: #dbeafe;
            color: #0c4a6e;
          }

          &.severity-info {
            background: #f0fdf4;
            color: #166534;
          }
        }
      }

      .violation-time {
        color: #6b7280;
        font-size: 12px;
      }
    }

    .violation-description {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 10px;
      padding: 10px;
      background: white;
      border-radius: 6px;
    }

    .violation-screenshot {
      margin: 10px 0;

      img {
        max-width: 100%;
        max-height: 300px;
        border-radius: 6px;
      }
    }

    .violation-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .status-label {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;

        &.status-pending {
          background: #e0e7ff;
          color: #4338ca;
        }

        &.status-confirmed {
          background: #fee2e2;
          color: #991b1b;
        }

        &.status-dismissed {
          background: #dcfce7;
          color: #166534;
        }

        &.status-suspicious {
          background: #fef3c7;
          color: #92400e;
        }
      }

      .btn-review {
        padding: 4px 12px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;

        &:hover {
          background: #2563eb;
        }
      }
    }
  }
}

.logs-container {
  h3 {
    color: #1f2937;
    font-size: 16px;
    margin-bottom: 15px;
  }

  .logs-list {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .log-item {
      display: flex;
      gap: 15px;
      padding: 10px;
      background: #f3f4f6;
      border-radius: 6px;
      font-size: 14px;

      .log-time {
        flex: 0 0 150px;
        color: #6b7280;
        font-size: 12px;
      }

      .log-message {
        flex: 1;
        color: #374151;
      }
    }
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .modal-content {
    background: white;
    border-radius: 8px;
    padding: 20px;
    max-width: 500px;
    width: 90%;

    h2 {
      margin: 0 0 20px;
      color: #1f2937;
      font-size: 18px;
    }

    .form-group {
      margin-bottom: 15px;

      label {
        display: block;
        margin-bottom: 5px;
        color: #374151;
        font-weight: 500;
        font-size: 14px;
      }

      select,
      textarea {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;

        &:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      }
    }

    .modal-actions {
      display: flex;
      gap: 10px;

      .btn-submit,
      .btn-cancel {
        flex: 1;
        padding: 8px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-submit {
        background: #3b82f6;
        color: white;

        &:hover {
          background: #2563eb;
        }
      }

      .btn-cancel {
        background: #e5e7eb;
        color: #374151;

        &:hover {
          background: #d1d5db;
        }
      }
    }
  }
}
</style>
