<template>
  <AdminLayout>
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4">
      
      <!-- Header Section -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0">
        <div>
          <h1 class="text-3xl font-black text-slate-800 tracking-tight">جلسات المراقبة</h1>
          <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">إدارة وفحص جلسات الاختبار المراقبة</p>
        </div>
        <div class="flex items-center space-x-3">
          <span class="relative">
            <i class="pi pi-search absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 text-xs" />
            <input 
              v-model="filters.search" 
              type="text" 
              placeholder="ابحث عن طالب..."
              @input="currentPage = 1"
              class="bg-slate-50 border border-slate-100 rounded-xl px-10 py-2.5 text-xs font-bold focus:bg-white transition-all w-72 outline-none"
            />
          </span>
          <Button icon="pi pi-refresh" outlined severity="secondary" @click="fetchSessions" />
        </div>
      </div>

      <!-- Statistics Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">إجمالي الجلسات</div>
              <div class="text-4xl font-black text-slate-800">{{ statistics.total_sessions }}</div>
            </div>
            <div class="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-xl">
              <i class="pi pi-video"></i>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">جلسات بها انتهاكات</div>
              <div class="text-4xl font-black" :style="{ color: statistics.sessions_with_violations > 0 ? '#f59e0b' : '#10b981' }">
                {{ statistics.sessions_with_violations }}
              </div>
            </div>
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl" :style="{ backgroundColor: statistics.sessions_with_violations > 0 ? '#fef3c7' : '#d1fae5', color: statistics.sessions_with_violations > 0 ? '#f59e0b' : '#10b981' }">
              <i class="pi pi-exclamation-triangle"></i>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">إجمالي الانتهاكات</div>
              <div class="text-4xl font-black text-slate-800">{{ statistics.total_violations }}</div>
            </div>
            <div class="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 text-xl">
              <i class="pi pi-times-circle"></i>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">متوسط الخطر</div>
              <div class="text-4xl font-black" :style="{ color: getRiskColor(statistics.average_risk_score) }">
                {{ statistics.average_risk_score }}
              </div>
            </div>
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl" :style="{ backgroundColor: getRiskColor(statistics.average_risk_score) + '20', color: getRiskColor(statistics.average_risk_score) }">
              <i class="pi pi-chart-line"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div class="flex items-center gap-2 mb-4">
          <i class="pi pi-filter text-slate-400"></i>
          <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">تصفية النتائج</h3>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Select 
            v-model="filters.status" 
            :options="[
              { label: 'جميع الحالات', value: '' },
              { label: 'قيد الانتظار', value: 'pending' },
              { label: 'نشطة', value: 'active' },
              { label: 'موقوفة', value: 'paused' },
              { label: 'منتهية', value: 'ended' },
              { label: 'ملغاة', value: 'cancelled' }
            ]"
            optionLabel="label"
            optionValue="value"
            placeholder="الحالة"
            @change="currentPage = 1"
            class="w-full bg-slate-50 border-slate-100 rounded-xl text-xs font-bold"
          />
          
          <Select 
            v-model="filters.has_violations" 
            :options="[
              { label: 'جميع الجلسات', value: '' },
              { label: 'جلسات بها انتهاكات', value: true },
              { label: 'جلسات بدون انتهاكات', value: false }
            ]"
            optionLabel="label"
            optionValue="value"
            placeholder="الانتهاكات"
            @change="currentPage = 1"
            class="w-full bg-slate-50 border-slate-100 rounded-xl text-xs font-bold"
          />

          <Select 
            v-model="filters.min_risk_score" 
            :options="[
              { label: 'جميع مستويات الخطر', value: '' },
              { label: 'خطر متوسط (50+)', value: '50' },
              { label: 'خطر عالي (70+)', value: '70' },
              { label: 'خطر حرج (80+)', value: '80' }
            ]"
            optionLabel="label"
            optionValue="value"
            placeholder="درجة الخطر"
            @change="currentPage = 1"
            class="w-full bg-slate-50 border-slate-100 rounded-xl text-xs font-bold"
          />

          <Button 
            label="إعادة تعيين" 
            icon="pi pi-redo" 
            severity="secondary"
            outlined
            @click="resetFilters"
            class="text-xs font-black uppercase tracking-wider"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-40">
        <ProgressSpinner />
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-8">جاري تحميل الجلسات...</p>
      </div>

      <!-- Table View -->
      <div v-else-if="sessions.length > 0" class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <table class="w-full text-left">
          <thead class="bg-slate-50/50 border-b border-slate-100 uppercase text-[10px] font-black text-slate-400 tracking-wider">
            <tr>
              <th class="p-6 cursor-pointer hover:text-slate-600 transition" @click="sortBy('created_at')">
                التاريخ
                <i v-if="sortField === 'created_at'" :class="['pi', sortOrder === 'asc' ? 'pi-arrow-up' : 'pi-arrow-down']" class="ml-1 text-xs"></i>
              </th>
              <th class="p-6">الطالب</th>
              <th class="p-6">الامتحان</th>
              <th class="p-6 cursor-pointer hover:text-slate-600 transition" @click="sortBy('status')">
                الحالة
                <i v-if="sortField === 'status'" :class="['pi', sortOrder === 'asc' ? 'pi-arrow-up' : 'pi-arrow-down']" class="ml-1 text-xs"></i>
              </th>
              <th class="p-6 text-center cursor-pointer hover:text-slate-600 transition" @click="sortBy('risk_score')">
                درجة الخطر
                <i v-if="sortField === 'risk_score'" :class="['pi', sortOrder === 'asc' ? 'pi-arrow-up' : 'pi-arrow-down']" class="ml-1 text-xs"></i>
              </th>
              <th class="p-6 text-center">الانتهاكات</th>
              <th class="p-6 pr-8 text-right">الإجراء</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50 text-sm">
            <tr v-for="session in sessions" :key="session.id" class="hover:bg-slate-50/50 transition cursor-pointer group" :class="{ 'bg-red-50/20': session.risk_score > 70 }">
              <td class="p-6 font-bold text-slate-700">
                {{ formatDate(session.created_at) }}
              </td>
              <td class="p-6 font-bold text-slate-800">
                {{ session.student.name }}
              </td>
              <td class="p-6 text-slate-600">
                {{ session.exam_attempt.exam.title }}
              </td>
              <td class="p-6">
                <Tag 
                  :value="getStatusLabel(session.status)" 
                  :severity="session.status === 'active' ? 'success' : session.status === 'ended' ? 'info' : 'warning'"
                  class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg"
                />
              </td>
              <td class="p-6 text-center">
                <div class="flex items-center justify-center gap-3">
                  <div class="w-32 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      class="h-full transition-all" 
                      :style="{ 
                        width: session.risk_score + '%', 
                        backgroundColor: getRiskColor(session.risk_score) 
                      }"
                    ></div>
                  </div>
                  <span class="font-black text-sm w-12 text-right" :style="{ color: getRiskColor(session.risk_score) }">
                    {{ session.risk_score }}%
                  </span>
                </div>
              </td>
              <td class="p-6 text-center">
                <Tag 
                  v-if="session.violations_count > 0"
                  :value="session.violations_count + ' انتهاك'"
                  :severity="getViolationsSeverity(session.violations_count) === 'critical' ? 'danger' : getViolationsSeverity(session.violations_count) === 'high' ? 'warning' : 'info'"
                  class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg"
                />
                <span v-else class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">✓ آمنة</span>
              </td>
              <td class="p-6 pr-8 text-right flex items-center gap-2 justify-end">
                <Button 
                  icon="pi pi-eye" 
                  outlined
                  severity="secondary"
                  @click="$router.push(`/admin/proctoring/${session.id}`)"
                  class="text-xs font-black"
                  v-tooltip="'عرض التفاصيل'"
                />
                <Button 
                  v-if="session.status === 'active'"
                  icon="pi pi-pause" 
                  outlined
                  severity="warning"
                  @click="updateSessionStatus(session.id, 'paused')"
                  class="text-xs font-black"
                  v-tooltip="'إيقاف الجلسة'"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white rounded-[2.5rem] border border-slate-100 p-32 text-center shadow-sm">
        <div class="text-6xl mb-6 opacity-20">🎥</div>
        <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">لا توجد جلسات مراقبة</h3>
        <p class="text-slate-400 font-bold mt-4 text-[10px] uppercase tracking-widest max-w-sm mx-auto">
          ستظهر جلسات المراقبة هنا بمجرد بدء الطلاب الاختبارات المراقبة
        </p>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.total > 0" class="flex items-center justify-center gap-4">
        <Button 
          icon="pi pi-chevron-right"
          @click="currentPage = currentPage - 1"
          :disabled="currentPage === 1"
          outlined
          severity="secondary"
          class="text-xs font-black"
        />
        
        <span class="text-sm font-black text-slate-600 uppercase tracking-wider">
          صفحة {{ currentPage }} من {{ pagination.last_page }}
        </span>

        <Button 
          icon="pi pi-chevron-left"
          @click="currentPage = currentPage + 1"
          :disabled="currentPage === pagination.last_page"
          outlined
          severity="secondary"
          class="text-xs font-black"
        />
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import AdminLayout from '@/components/AdminLayout.vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import ProgressSpinner from 'primevue/progressspinner'

interface Session {
  id: number
  created_at: string
  student: { name: string; id: number }
  exam_attempt: { exam: { title: string } }
  status: string
  risk_score: number
  violations_count: number
}

interface Statistics {
  total_sessions: number
  sessions_with_violations: number
  total_violations: number
  average_risk_score: number
}

const router = useRouter()

// State
const sessions = ref<Session[]>([])
const statistics = ref<Statistics>({
  total_sessions: 0,
  sessions_with_violations: 0,
  total_violations: 0,
  average_risk_score: 0,
})
const loading = ref(false)
const currentPage = ref(1)
const pagination = ref({ total: 0, last_page: 1, per_page: 15 })
const sortField = ref('created_at')
const sortOrder = ref('desc')

const filters = ref({
  search: '',
  status: '',
  has_violations: '',
  min_risk_score: '',
})

// Methods
const fetchSessions = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      per_page: pagination.value.per_page,
      sort_by: sortField.value,
      sort_order: sortOrder.value,
      ...(filters.value.search && { search: filters.value.search }),
      ...(filters.value.status && { status: filters.value.status }),
      ...(filters.value.has_violations !== '' && { has_violations: filters.value.has_violations }),
      ...(filters.value.min_risk_score && { min_risk_score: filters.value.min_risk_score }),
    }

    const response = await axios.get('/api/admin/proctoring', { params })
    sessions.value = response.data.data || []
    pagination.value = response.data.pagination || { total: 0, last_page: 1, per_page: 15 }
  } catch (error) {
    console.error('Failed to fetch sessions:', error)
    sessions.value = []
    pagination.value = { total: 0, last_page: 1, per_page: 15 }
  } finally {
    loading.value = false
  }
}

const fetchStatistics = async () => {
  try {
    const response = await axios.get('/api/admin/proctoring/statistics')
    statistics.value = response.data
  } catch (error) {
    console.error('Failed to fetch statistics:', error)
  }
}

const updateSessionStatus = async (sessionId: number, status: string) => {
  try {
    await axios.patch(`/api/admin/proctoring/${sessionId}/status`, { status })
    await fetchSessions()
  } catch (error) {
    console.error('Failed to update session status:', error)
  }
}

const sortBy = (field: string) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
  currentPage.value = 1
}

const resetFilters = () => {
  filters.value = {
    search: '',
    status: '',
    has_violations: '',
    min_risk_score: '',
  }
  currentPage.value = 1
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

const getRiskColor = (score: number) => {
  if (score > 80) return '#ef4444'
  if (score > 60) return '#f59e0b'
  if (score > 40) return '#eab308'
  return '#10b981'
}

const getViolationsSeverity = (count: number) => {
  if (count > 5) return 'critical'
  if (count > 2) return 'high'
  return 'medium'
}

// Hooks
onMounted(() => {
  fetchSessions()
  fetchStatistics()
})

watch([currentPage, sortField, sortOrder], () => {
  fetchSessions()
})

watch(filters, () => {
  fetchSessions()
}, { deep: true })
</script>

<style scoped>
.proctoring-page {
  padding: 20px;
  background: #f9fafb;
  min-height: 100vh;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 20px;

  h1 {
    font-size: 28px;
    font-weight: bold;
    margin: 0;
    color: #1f2937;
  }

  .subtitle {
    color: #6b7280;
    margin: 5px 0 0;
  }
}

.header-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  width: 100%;
}

.stat-card {
  background: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  .stat-value {
    font-size: 24px;
    font-weight: bold;
    color: #1f2937;
  }

  .stat-label {
    font-size: 12px;
    color: #6b7280;
    margin-top: 5px;
  }
}

.filters-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  background: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;

  .filter-group {
    flex: 1;
    min-width: 150px;
  }

  .filter-input,
  .filter-select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
  }

  .filter-input:focus,
  .filter-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

.btn-primary {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;

  &:hover {
    background: #2563eb;
  }
}

.table-section {
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow-x: auto;
  margin-bottom: 20px;
}

.sessions-table {
  width: 100%;
  border-collapse: collapse;

  thead {
    background: #f3f4f6;
    border-bottom: 2px solid #e5e7eb;

    th {
      padding: 12px;
      text-align: right;
      font-weight: 600;
      color: #374151;
      font-size: 14px;
      cursor: pointer;
      user-select: none;

      &:hover {
        background: #e5e7eb;
      }

      .sort-asc,
      .sort-desc {
        margin-right: 5px;
        font-size: 12px;
      }
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid #e5e7eb;
      transition: background 0.1s;

      &:hover {
        background: #f9fafb;
      }

      &.loading-row,
      &.empty-row {
        td {
          padding: 20px;
          text-align: center;
          color: #6b7280;
        }
      }

      &.row-high-risk {
        background: #fef2f2;
      }

      &.row-has-violations {
        background: #fffbeb;
      }

      td {
        padding: 12px;
        font-size: 14px;
        color: #374151;
      }

      .status-cell {
        .status-badge {
          display: inline-block;
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

          &.status-cancelled {
            background: #fee2e2;
            color: #991b1b;
          }
        }
      }

      .risk-cell {
        display: flex;
        align-items: center;
        gap: 8px;

        .risk-bar {
          width: 60px;
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;

          .risk-fill {
            height: 100%;
            transition: width 0.3s;
          }
        }
      }

      .violations-cell {
        .violations-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;

          &.critical {
            background: #fee2e2;
            color: #991b1b;
          }

          &.high {
            background: #fef3c7;
            color: #92400e;
          }

          &.medium {
            background: #fce7f3;
            color: #831843;
          }
        }

        .violations-none {
          color: #10b981;
          font-weight: 500;
        }
      }

      .action-cell {
        display: flex;
        gap: 5px;

        .btn-small {
          padding: 4px 8px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;

          &.btn-view {
            background: #3b82f6;
            color: white;

            &:hover {
              background: #2563eb;
            }
          }

          &.btn-pause {
            background: #f59e0b;
            color: white;

            &:hover {
              background: #d97706;
            }
          }
        }
      }
    }
  }
}

.pagination-section {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;

  .btn-pagination {
    padding: 8px 12px;
    background: #e5e7eb;
    color: #374151;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: #d1d5db;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .pagination-info {
    color: #6b7280;
    font-size: 14px;
  }
}

.text-center {
  text-align: center;
}
</style>
