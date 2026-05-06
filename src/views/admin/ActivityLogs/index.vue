<script setup>
import { ref, onMounted, watch } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Calendar from 'primevue/calendar';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";

const confirm = useConfirm();
const toast = useToast();

const logs = ref([]);
const totalRecords = ref(0);
const loading = ref(true);
const selectedLogs = ref([]);
const filters = ref({
    action: null,
    model_type: '',
    date_from: null,
    date_to: null,
    page: 1
});

const actionOptions = [
    { label: 'All Actions', value: null },
    { label: 'Created', value: 'created' },
    { label: 'Updated', value: 'updated' },
    { label: 'Deleted', value: 'deleted' },
    { label: 'Login', value: 'login' },
    { label: 'Logout', value: 'logout' }
];

const selectedLog = ref(null);
const showDetail = ref(false);

const fetchLogs = async () => {
    loading.value = true;
    try {
        const params = {
            ...filters.value,
            date_from: filters.value.date_from ? filters.value.date_from.toISOString().split('T')[0] : null,
            date_to: filters.value.date_to ? filters.value.date_to.toISOString().split('T')[0] : null,
        };
        const res = await api.get('/admin/activity-logs', { params });
        logs.value = res.data.data;
        totalRecords.value = res.data.total;
    } catch (err) {
        console.error("Error fetching logs", err);
    } finally {
        loading.value = false;
    }
};

onMounted(fetchLogs);

watch(filters, () => {
    filters.value.page = 1;
    fetchLogs();
}, { deep: true });

const onPage = (event) => {
    filters.value.page = event.page + 1;
    fetchLogs();
};

const getActionSeverity = (action) => {
    switch (action) {
        case 'created': return 'success';
        case 'updated': return 'info';
        case 'deleted': return 'danger';
        case 'login': return 'help';
        case 'logout': return 'secondary';
        default: return 'info';
    }
};

const viewDetails = (log) => {
    selectedLog.value = log;
    showDetail.value = true;
};

const formatModelType = (type) => {
    if (!type) return '-';
    return type.split('\\').pop();
};

const deleteLog = (log) => {
    confirm.require({
        message: 'Are you sure you want to delete this log entry?',
        header: 'Protocol Erasure',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await api.delete(`/admin/activity-logs/${log.id}`);
                toast.add({ severity: 'success', summary: 'Deleted', detail: 'Log entry erased', life: 3000 });
                fetchLogs();
            } catch (err) {
                toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to erase log', life: 3000 });
            }
        }
    });
};

const bulkDelete = () => {
    if (!selectedLogs.value.length) return;

    confirm.require({
        message: `Are you sure you want to delete ${selectedLogs.value.length} log entries?`,
        header: 'Mass Protocol Erasure',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await api.post('/admin/activity-logs/bulk-delete', {
                    ids: selectedLogs.value.map(l => l.id)
                });
                toast.add({ severity: 'success', summary: 'Deleted', detail: 'Batch logs erased', life: 3000 });
                selectedLogs.value = [];
                fetchLogs();
            } catch (err) {
                toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to erase logs', life: 3000 });
            }
        }
    });
};
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 mt-8 px-4 md:px-12 pb-24">
            
            <!-- Header Section -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 md:space-y-0 relative overflow-hidden group">
                <div class="absolute right-0 top-0 w-64 h-64 bg-indigo-50/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-indigo-100/40 transition-all duration-1000"></div>
                <div class="relative z-10">
                    <h1 class="text-4xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">System Logs</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1 italic">Audit Trails & Institutional Telemetry</p>
                </div>
                <div class="relative z-10 flex items-center space-x-4">
                    <Button v-if="selectedLogs.length" label="Mass Erase" icon="pi pi-trash" severity="danger" outlined class="text-[10px] font-black uppercase tracking-widest px-8 rounded-2xl animate-pulse" @click="bulkDelete" />
                    <Button icon="pi pi-refresh" outlined rounded severity="secondary" @click="fetchLogs" class="bg-white/50" />
                </div>
            </div>

            <!-- Filter Section -->
            <div class="bg-white/60 backdrop-blur-md p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-wrap gap-6 items-end">
                <div class="flex flex-col space-y-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Action Type</label>
                    <Dropdown v-model="filters.action" :options="actionOptions" optionLabel="label" optionValue="value" class="w-48 rounded-xl border-slate-100" />
                </div>
                
                <div class="flex flex-col space-y-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Entity Type</label>
                    <InputText v-model="filters.model_type" placeholder="e.g. Exam" class="w-48 rounded-xl border-slate-100" />
                </div>

                <div class="flex flex-col space-y-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">From Date</label>
                    <Calendar v-model="filters.date_from" dateFormat="yy-mm-dd" class="w-48 rounded-xl" :showIcon="true" />
                </div>

                <div class="flex flex-col space-y-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">To Date</label>
                    <Calendar v-model="filters.date_to" dateFormat="yy-mm-dd" class="w-48 rounded-xl" :showIcon="true" />
                </div>
            </div>

            <!-- Table Section -->
            <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <DataTable v-model:selection="selectedLogs" :value="logs" :loading="loading" :lazy="true" :paginator="true" :rows="50" :totalRecords="totalRecords" 
                           @page="onPage" class="p-datatable-sm text-sm" responsiveLayout="scroll" dataKey="id">
                    
                    <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

                    <Column header="Institutional Actor" style="min-width: 200px">
                        <template #body="{ data }">
                            <div class="flex items-center space-x-3 py-2">
                                <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                                    <i class="pi pi-user text-slate-400 text-xs"></i>
                                </div>
                                <div class="flex flex-col">
                                    <span class="font-black text-slate-800 uppercase tracking-tight">{{ data.user?.name || 'System' }}</span>
                                    <span class="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">{{ data.user?.role || 'AUTOMATED' }}</span>
                                </div>
                            </div>
                        </template>
                    </Column>

                    <Column header="Protocol Action" style="width: 150px">
                        <template #body="{ data }">
                            <Tag :value="data.action" :severity="getActionSeverity(data.action)" class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border-none shadow-sm" />
                        </template>
                    </Column>

                    <Column header="Entity Domain" style="min-width: 150px">
                        <template #body="{ data }">
                            <span class="text-[10px] font-black text-slate-600 uppercase tracking-widest">{{ formatModelType(data.model_type) }}</span>
                            <span v-if="data.model_id" class="text-[9px] font-bold text-slate-300 ml-1">#{{ data.model_id }}</span>
                        </template>
                    </Column>

                    <Column header="Telemetry Signal" style="min-width: 250px">
                        <template #body="{ data }">
                            <p class="text-[11px] font-bold text-slate-500 leading-tight">{{ data.description }}</p>
                        </template>
                    </Column>

                    <Column header="Chronology" style="width: 180px">
                        <template #body="{ data }">
                            <div class="flex flex-col text-right pr-4">
                                <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">{{ new Date(data.created_at).toLocaleDateString() }}</span>
                                <span class="text-[9px] font-bold text-slate-300 uppercase italic">{{ new Date(data.created_at).toLocaleTimeString() }}</span>
                            </div>
                        </template>
                    </Column>

                    <Column style="width: 150px">
                        <template #body="{ data }">
                            <div class="flex items-center space-x-2">
                                <Button v-if="data.changes" icon="pi pi-search-plus" text rounded severity="info" @click="viewDetails(data)" class="hover:bg-indigo-50" />
                                <Button icon="pi pi-trash" text rounded severity="danger" @click="deleteLog(data)" class="hover:bg-rose-50" />
                            </div>
                        </template>
                    </Column>

                    <template #empty>
                        <div class="p-20 text-center">
                            <ProgressSpinner v-if="loading" style="width: 50px; height: 50px" />
                            <template v-else>
                                <div class="text-4xl mb-6 opacity-10 italic">📡</div>
                                <p class="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">No telemetry signals captured...</p>
                            </template>
                        </div>
                    </template>
                </DataTable>
            </div>
        </div>

        <!-- Detail Dialog -->
        <Dialog v-model:visible="showDetail" header="Telemetric Change Matrix" :modal="true" :draggable="false" class="w-full max-w-2xl rounded-[2rem]">
            <div v-if="selectedLog" class="space-y-6 p-4">
                <div class="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div class="flex flex-col">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Operation Protocol</span>
                        <span class="text-xs font-black text-slate-800 uppercase tracking-tight">{{ selectedLog.action }} {{ formatModelType(selectedLog.model_type) }} #{{ selectedLog.model_id }}</span>
                    </div>
                    <Tag :value="selectedLog.action" :severity="getActionSeverity(selectedLog.action)" class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg" />
                </div>

                <div v-if="selectedLog.changes" class="grid grid-cols-2 gap-6">
                    <div class="space-y-3">
                        <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Pre-State (Old)</h4>
                        <pre class="bg-slate-50 p-4 rounded-xl text-[10px] font-bold text-slate-600 overflow-auto max-h-64">{{ JSON.stringify(selectedLog.changes.old, null, 2) }}</pre>
                    </div>
                    <div class="space-y-3">
                        <h4 class="text-[10px] font-black text-emerald-400 uppercase tracking-widest border-b border-emerald-50 pb-2">Post-State (New)</h4>
                        <pre class="bg-emerald-50/30 p-4 rounded-xl text-[10px] font-bold text-emerald-700 overflow-auto max-h-64">{{ JSON.stringify(selectedLog.changes.new, null, 2) }}</pre>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-6">
                    <div class="flex flex-col space-y-1">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Network Origin</span>
                        <span class="text-[10px] font-black text-slate-700">{{ selectedLog.ip_address }}</span>
                    </div>
                    <div class="flex flex-col space-y-1">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Interface Signature</span>
                        <span class="text-[9px] font-medium text-slate-500 italic truncate" :title="selectedLog.user_agent">{{ selectedLog.user_agent }}</span>
                    </div>
                </div>
            </div>
        </Dialog>
    </AdminLayout>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
:deep(.p-datatable-thead > tr > th) {
    background: #fbfcfe;
    border-bottom: 2px solid #f1f5f9;
    padding: 1.5rem 1rem;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
}
:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
:deep(.p-dialog .p-dialog-header) {
    background: #fbfcfe;
    padding: 2rem;
    border-bottom: 1px solid #f1f5f9;
}
:deep(.p-dialog .p-dialog-header-title) {
    font-size: 14px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #475569;
}
</style>
