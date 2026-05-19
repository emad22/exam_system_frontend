<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'
import api from '@/services/api'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'

const router = useRouter()
const loading = ref(false)
const attempts = ref([])
const totalRecords = ref(0)
const filters = ref({ global: { value: null, matchMode: 'contains' } })

const fetchPending = async (page = 1) => {
    loading.value = true
    try {
        const response = await api.get('/admin/grading', { params: { page } })
        attempts.value = response.data.data
        totalRecords.value = response.data.total
    } catch (err) {
        console.error('Failed to fetch pending attempts', err)
    } finally {
        loading.value = false
    }
}

const onPage = (event) => fetchPending(event.page + 1)

const goToGrading = (attemptId) => {
    router.push({ name: 'admin.grading.show', params: { id: attemptId } })
}

const pendingWriting = computed(() => attempts.value.reduce((s, a) => s + (a.pending_writing || 0), 0))
const pendingSpEaking = computed(() => attempts.value.reduce((s, a) => s + (a.pending_speaking || 0), 0))

onMounted(() => fetchPending())
</script>

<template>
    <AdminLayout>
        <div class="space-y-8 animate-in fade-in duration-700">
            <!-- Header -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">Writing & Speaking Hub</h1>
                    <p class="text-slate-500 font-medium mt-1">Review and grade productive skill submissions from students</p>
                </div>
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                        <InputText v-model="filters['global'].value" placeholder="Search candidates..."
                            class="rounded-2xl border-none bg-white shadow-sm pl-11 pr-4 h-12 w-64" />
                    </div>
                    <Button icon="pi pi-refresh" rounded text @click="fetchPending" :loading="loading" />
                </div>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
                    <div class="relative z-10">
                        <p class="text-indigo-100 text-xs font-black uppercase tracking-widest">✍️ Pending Writing</p>
                        <h3 class="text-4xl font-black mt-2">{{ pendingWriting }}</h3>
                    </div>
                    <i class="pi pi-pencil absolute -right-4 -bottom-4 text-8xl text-white/10 group-hover:scale-110 transition-transform duration-500"></i>
                </div>
                <div class="bg-amber-500 rounded-[2rem] p-8 text-white shadow-xl shadow-amber-200 relative overflow-hidden group">
                    <div class="relative z-10">
                        <p class="text-amber-100 text-xs font-black uppercase tracking-widest">🎙️ Pending Speaking</p>
                        <h3 class="text-4xl font-black mt-2">{{ pendingSpEaking }}</h3>
                    </div>
                    <i class="pi pi-microphone absolute -right-4 -bottom-4 text-8xl text-white/10 group-hover:scale-110 transition-transform duration-500"></i>
                </div>
                <div class="bg-slate-800 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
                    <div class="relative z-10">
                        <p class="text-slate-400 text-xs font-black uppercase tracking-widest">📋 Students Awaiting</p>
                        <h3 class="text-4xl font-black mt-2">{{ totalRecords }}</h3>
                    </div>
                    <i class="pi pi-users absolute -right-4 -bottom-4 text-8xl text-white/10 group-hover:scale-110 transition-transform duration-500"></i>
                </div>
            </div>

            <!-- Table -->
            <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <DataTable :value="attempts" :loading="loading"
                    :paginator="true" :rows="20" :totalRecords="totalRecords" lazy @page="onPage"
                    :globalFilterFields="['student.user.first_name','student.user.last_name','exam.title']"
                    :filters="filters"
                    class="p-datatable-modern" responsiveLayout="scroll">
                    <template #empty>
                        <div class="py-20 text-center">
                            <div class="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i class="pi pi-verified text-4xl text-slate-200"></i>
                            </div>
                            <h3 class="text-xl font-black text-slate-800">All caught up!</h3>
                            <p class="text-slate-400 mt-1 font-medium">No pending writing or speaking submissions.</p>
                        </div>
                    </template>

                    <!-- Candidate -->
                    <Column header="Candidate" class="py-6">
                        <template #body="{ data }">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-400 text-sm">
                                    {{ (data.student?.user?.first_name?.[0] || '?') }}
                                </div>
                                <div>
                                    <p class="font-black text-slate-800 text-sm">
                                        {{ data.student?.user?.first_name }} {{ data.student?.user?.last_name }}
                                    </p>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                        Attempt #{{ data.id }}
                                    </p>
                                </div>
                            </div>
                        </template>
                    </Column>

                    <!-- Exam -->
                    <Column header="Exam">
                        <template #body="{ data }">
                            <p class="font-bold text-slate-700 text-sm">{{ data.exam?.title || '—' }}</p>
                        </template>
                    </Column>

                    <!-- Pending breakdown -->
                    <Column header="Pending Tasks">
                        <template #body="{ data }">
                            <div class="flex items-center gap-2 flex-wrap">
                                <Tag v-if="data.pending_writing > 0"
                                    :value="`✍️ ${data.pending_writing} Writing`"
                                    severity="info" class="text-[10px] font-black px-3 rounded-lg" />
                                <Tag v-if="data.pending_speaking > 0"
                                    :value="`🎙️ ${data.pending_speaking} Speaking`"
                                    severity="warning" class="text-[10px] font-black px-3 rounded-lg" />
                            </div>
                        </template>
                    </Column>

                    <!-- Submitted at -->
                    <Column header="Submitted At">
                        <template #body="{ data }">
                            <span class="text-xs font-bold text-slate-500">
                                {{ data.finished_at ? new Date(data.finished_at).toLocaleString() : '—' }}
                            </span>
                        </template>
                    </Column>

                    <!-- Action -->
                    <Column header="Action" class="text-right pr-8">
                        <template #body="{ data }">
                            <Button label="Grade Now" icon="pi pi-pencil"
                                @click="goToGrading(data.id)"
                                class="rounded-xl px-4 py-2 text-xs font-black bg-brand-primary border-none shadow-lg shadow-brand-primary/20 hover:scale-105 transition-transform" />
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
:deep(.p-datatable-thead > tr > th) {
    background: #f8fafc;
    color: #64748b;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 1.5rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
}
:deep(.p-datatable-tbody > tr) { background: transparent; transition: all 0.2s; }
:deep(.p-datatable-tbody > tr:hover) { background: #f8fafc; }
:deep(.p-datatable-tbody > tr > td) { border-bottom: 1px solid #f1f5f9; padding: 1rem 1.5rem; }
</style>
