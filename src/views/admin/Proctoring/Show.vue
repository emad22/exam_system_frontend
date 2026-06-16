<template>
  <div class="session-detail-page">
    <!-- Back Button -->
    <router-link to="/admin/proctoring" class="btn-back">← العودة إلى الجلسات</router-link>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <p>جاري تحميل بيانات الجلسة...</p>
    </div>

    <!-- Session Not Found -->
    <div v-else-if="!session" class="error-container">
      <p>لم يتم العثور على الجلسة</p>
    </div>

    <!-- Session Details -->
    <div v-else class="session-details">
      <!-- Header with Session Info -->
      <div class="header-card">
        <div class="header-info">
          <div class="session-title">
            <h1>جلسة الاختبار #{{ session.id }}</h1>
            <span :class="['status-badge', `status-${session.status}`]">
              {{ getStatusLabel(session.status) }}
            </span>
          </div>
          <div class="session-date">{{ formatDate(session.created_at) }}</div>
        </div>

        <div class="header-actions">
          <button v-if="session.status === 'active'" class="btn-action btn-pause" @click="updateStatus('paused')">
            ⏸ إيقاف الجلسة
          </button>
          <button v-else-if="session.status === 'paused'" class="btn-action btn-resume" @click="updateStatus('active')">
            ▶ استئناف الجلسة
          </button>
          <button v-if="session.status !== 'ended'" class="btn-action btn-end" @click="updateStatus('ended')">
            🛑 إنهاء الجلسة
          </button>
          <router-link :to="`/admin/proctoring/${session.id}/report`" class="btn-action btn-report">
            📊 عرض التقرير
          </router-link>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-section">
        <div class="tabs-nav">
          <button
            v-for="tab in tabs"
            :key="tab"
            :class="['tab-btn', { active: activeTab === tab }]"
            @click="activeTab = tab"
          >
            {{ getTabLabel(tab) }}
          </button>
        </div>

        <!-- Tab Content: Student Info -->
        <div v-if="activeTab === 'student'" class="tab-content">
          <div class="info-grid">
            <div class="info-item">
              <label>اسم الطالب:</label>
              <span>{{ session.student.name }}</span>
            </div>
            <div class="info-item">
              <label>البريد الإلكتروني:</label>
              <span>{{ session.student.email }}</span>
            </div>
            <div class="info-item">
              <label>الامتحان:</label>
              <span>{{ session.exam_attempt.exam.title }}</span>
            </div>
            <div class="info-item">
              <label>تم التحقق من الهوية:</label>
              <span :class="{ 'verified': session.identity_verified, 'not-verified': !session.identity_verified }">
                {{ session.identity_verified ? '✓ نعم' : '✗ لا' }}
              </span>
            </div>
            <div class="info-item" v-if="session.identity_verified">
              <label>درجة التحقق:</label>
              <span>{{ session.face_verification_score }}%</span>
            </div>
            <div class="info-item">
              <label>عنوان IP:</label>
              <span>{{ session.ip_address }}</span>
            </div>
            <div class="info-item">
              <label>المتصفح:</label>
              <span>{{ session.browser_info?.name || 'غير معروف' }}</span>
            </div>
            <div class="info-item">
              <label>النظام:</label>
              <span>{{ session.device_info?.os || 'غير معروف' }}</span>
            </div>
          </div>
        </div>

        <!-- Tab Content: Session Statistics -->
        <div v-if="activeTab === 'statistics'" class="tab-content">
          <div class="stats-container">
            <div class="stat-box">
              <div class="stat-label">مدة الجلسة</div>
              <div class="stat-value">{{ formatDuration(session.duration_seconds) }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">إجمالي الانتهاكات</div>
              <div class="stat-value" :style="{ color: getViolationColor(session.violations_count) }">
                {{ session.violations_count }}
              </div>
            </div>
            <div class="stat-box">
              <div class="stat-label">درجة الخطر</div>
              <div class="stat-value" :style="{ color: getRiskColor(session.risk_score) }">
                {{ session.risk_score }}/100
              </div>
              <div class="risk-bar-large">
                <div class="risk-fill" :style="{ width: session.risk_score + '%', backgroundColor: getRiskColor(session.risk_score) }"></div>
              </div>
            </div>
          </div>

          <div class="violations-summary">
            <h3>ملخص الانتهاكات</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="label">كشف الوجوه:</span>
                <span class="value">{{ session.face_detection_alerts }}</span>
              </div>
              <div class="summary-item">
                <span class="label">تبديل التبويبات:</span>
                <span class="value">{{ session.tab_switch_alerts }}</span>
              </div>
              <div class="summary-item">
                <span class="label">نسخ/لصق:</span>
                <span class="value">{{ session.copy_paste_alerts }}</span>
              </div>
              <div class="summary-item">
                <span class="label">أجهزة خارجية:</span>
                <span class="value">{{ session.external_device_alerts }}</span>
              </div>
            </div>
          </div>

          <!-- Violations by Type -->
          <div class="chart-section" v-if="statistics.violations_by_type.length > 0">
            <h3>توزيع الانتهاكات</h3>
            <div class="violation-types">
              <div v-for="viol in statistics.violations_by_type" :key="viol.violation_type" class="violation-type-item">
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
              <p>لا توجد انتهاكات في هذه الجلسة</p>
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
                    مراجعة
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab Content: Logs -->
        <div v-if="activeTab === 'logs'" class="tab-content">
          <div class="logs-container">
            <h3>سجلات كشف الوجه</h3>
            <div class="logs-list">
              <div v-for="log in session.face_detection_logs" :key="log.id" class="log-item">
                <span class="log-time">{{ formatDate(log.created_at) }}</span>
                <span class="log-message">{{ log.message || 'كشف الوجه: ' + log.face_count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Review Violation Modal -->
    <div v-if="showReviewModal" class="modal-overlay" @click.self="showReviewModal = false">
      <div class="modal-content">
        <h2>مراجعة الانتهاك</h2>
        <form @submit.prevent="submitReview">
          <div class="form-group">
            <label>الحالة:</label>
            <select v-model="reviewForm.status" required>
              <option value="confirmed">مؤكدة</option>
              <option value="dismissed">مرفوضة</option>
              <option value="suspicious">مريبة</option>
            </select>
          </div>

          <div class="form-group">
            <label>ملاحظات:</label>
            <textarea v-model="reviewForm.proctor_notes" rows="4" placeholder="أضف ملاحظاتك..."></textarea>
          </div>

          <div class="form-group">
            <label>الإجراء المتخذ:</label>
            <select v-model="reviewForm.action_taken">
              <option value="">بدون إجراء</option>
              <option value="warning">تحذير</option>
              <option value="pause_exam">إيقاف الاختبار</option>
              <option value="terminate_exam">إنهاء الاختبار</option>
              <option value="report_to_instructor">إبلاغ المعلم</option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="submit" class="btn-submit">حفظ</button>
            <button type="button" class="btn-cancel" @click="showReviewModal = false">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

// Types
interface Session {
  id: number
  created_at: string
  status: string
  student: { name: string; email: string; id: number }
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
    const response = await axios.get(`/api/admin/proctoring/${route.params.id}`)
    session.value = response.data.session
    statistics.value = response.data.statistics
  } catch (error) {
    console.error('Failed to fetch session:', error)
  } finally {
    loading.value = false
  }
}

const updateStatus = async (newStatus: string) => {
  try {
    await axios.patch(`/api/admin/proctoring/${session.value?.id}/status`, { status: newStatus })
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
    await axios.post(`/api/admin/proctoring/${currentViolationId.value}/review`, {
      ...reviewForm.value,
      reviewed_by: (window as any).auth?.user?.id,
    })
    showReviewModal.value = false
    await fetchSession()
  } catch (error) {
    console.error('Failed to submit review:', error)
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDuration = (seconds: number | null) => {
  if (!seconds) return 'غير معروف'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const getStatusLabel = (status: string) => {
  const labels: { [key: string]: string } = {
    pending: 'قيد الانتظار',
    active: 'نشطة',
    paused: 'موقوفة',
    ended: 'منتهية',
    cancelled: 'ملغاة',
  }
  return labels[status] || status
}

const getTabLabel = (tab: string) => {
  const labels: { [key: string]: string } = {
    student: 'معلومات الطالب',
    statistics: 'الإحصائيات',
    violations: 'الانتهاكات',
    logs: 'السجلات',
  }
  return labels[tab]
}

const getViolationTypeLabel = (type: string) => {
  const labels: { [key: string]: string } = {
    multiple_faces: 'عدة وجوه',
    face_not_visible: 'الوجه غير مرئي',
    face_swap: 'تبديل الوجه',
    tab_switched: 'تبديل التبويب',
    browser_opened: 'فتح متصفح',
    copy_paste: 'نسخ/لصق',
    external_device: 'جهاز خارجي',
    suspicious_audio: 'صوت مريب',
  }
  return labels[type] || type
}

const getSeverityLabel = (severity: string) => {
  const labels: { [key: string]: string } = {
    info: 'معلومة',
    low: 'منخفضة',
    medium: 'متوسطة',
    high: 'عالية',
    critical: 'حرجة',
  }
  return labels[severity] || severity
}

const getViolationStatusLabel = (status: string) => {
  const labels: { [key: string]: string } = {
    pending: 'قيد الانتظار',
    confirmed: 'مؤكدة',
    dismissed: 'مرفوضة',
    suspicious: 'مريبة',
  }
  return labels[status] || status
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

// Lifecycle
onMounted(() => {
  fetchSession()
})
</script>

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
