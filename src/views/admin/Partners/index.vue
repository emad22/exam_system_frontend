<script setup>
import { useModal } from '@/composables/useModal';
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';

const { showAlert, showConfirm } = useModal();

const router = useRouter();
const partners = ref([]);
const loading = ref(true);
const searchQuery = ref('');

const filteredPartners = computed(() => {
    if (!searchQuery.value) return partners.value;
    const query = searchQuery.value.toLowerCase();
    return partners.value.filter(p => {
        const name = (p.partner_name || '').toLowerCase();
        const contact = `${p.user?.first_name || ''} ${p.user?.last_name || ''}`.toLowerCase();
        const email = (p.user?.email || '').toLowerCase();
        const website = (p.website || '').toLowerCase();
        return name.includes(query) || contact.includes(query) || email.includes(query) || website.includes(query);
    });
});

const fetchPartners = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/partners');
        partners.value = res.data;
    } catch (err) {
        console.error('Failed to load partners', err);
    } finally {
        loading.value = false;
    }
};

const deletePartner = async (id) => {
    if (!(await showConfirm('Are you sure you want to delete this partner?'))) return;
    try {
        await api.delete(`/admin/partners/${id}`);
        partners.value = partners.value.filter(p => p.id !== id);
    } catch (err) {
        showAlert('Failed to delete partner');
    }
};

const toggleHold = async (partner) => {
    const action = partner.user?.is_active ? 'hold' : 'unhold';
    if (!(await showConfirm(`Are you sure you want to ${action} this partner?`))) return;

    try {
        await api.post(`/admin/partners/${partner.id}/${action}`);
        if (partner.user) partner.user.is_active = !partner.user.is_active;
    } catch (err) {
        console.error(err);
        showAlert(`Failed to ${action} partner`);
    }
};

onMounted(fetchPartners);
</script>

<template>
    <AdminLayout>
        <div class="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24 mt-8 px-4 md:px-12">
            
            <!-- Standardized Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Institutional Partners</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Registry of external assessment nodes</p>
                </div>
                <Button label="Authorize Partner" icon="pi pi-plus" 
                    class="px-8 py-3 rounded-2xl bg-brand-primary border-none shadow-lg shadow-rose-100 text-[10px] font-black tracking-widest uppercase transition-all hover:-translate-y-1" 
                    @click="router.push('/admin/staff/create?role=partner')" />
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Partner Registry...</p>
            </div>

            <!-- Registry Table Card -->
            <Card v-else class="border border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden mt-6">
                <template #content>
                    <DataTable :value="filteredPartners" dataKey="id" paginator :rows="10" 
                               class="p-datatable-sm text-sm" responsiveLayout="scroll">
                        
                        <template #header>
                            <div class="flex justify-end p-2 pb-4">
                                <span class="relative">
                                    <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                                    <InputText v-model="searchQuery" placeholder="Filter by partner or contact..." class="pl-12 w-full md:w-80 shadow-sm rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white text-[10px] font-black uppercase tracking-widest placeholder:text-slate-300" />
                                </span>
                            </div>
                        </template>

                        <Column header="Institutional Entity" style="min-width: 250px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-4 py-2">
                                     <div class="w-11 h-11 rounded-2xl bg-slate-50 text-brand-primary flex items-center justify-center border border-slate-100 shadow-sm">
                                         <i class="pi pi-briefcase text-lg"></i>
                                     </div>
                                     <div>
                                         <div @click="router.push(`/admin/staff/${data.user_id}/edit`)" 
                                              class="font-black text-slate-800 hover:text-brand-primary cursor-pointer uppercase tracking-tight transition-colors">
                                              {{ data.partner_name }}
                                         </div>
                                         <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: #{{ String(data.id).padStart(3, '0') }}</div>
                                     </div>
                                </div>
                            </template>
                        </Column>

                        <Column header="Primary Liaison" style="min-width: 200px">
                            <template #body="{ data }">
                                <div class="flex flex-col space-y-1">
                                    <span class="font-black text-slate-700 text-[10px] uppercase tracking-tight">{{ data.user?.first_name }} {{ data.user?.last_name }}</span>
                                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{{ data.user?.phone || 'NO_CONTACT_DATA' }}</span>
                                </div>
                            </template>
                        </Column>

                        <Column header="Digital Identifier" style="min-width: 150px">
                            <template #body="{ data }">
                                <span class="text-[10px] font-bold text-slate-500 lowercase underline decoration-slate-200 underline-offset-4">{{ data.user?.email || '---' }}</span>
                            </template>
                        </Column>

                        <Column header="Jurisdiction" style="min-width: 120px" class="text-center">
                            <template #body="{ data }">
                                <Tag :value="data.user?.country || 'Global'" severity="secondary" class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg" />
                            </template>
                        </Column>

                        <Column header="Status" style="min-width: 120px" class="text-center">
                            <template #body="{ data }">
                                <Tag :value="data.user?.is_active ? 'ACTIVE' : 'ON_HOLD'" 
                                     :severity="data.user?.is_active ? 'success' : 'warning'" 
                                     class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg" />
                            </template>
                        </Column>

                        <Column :exportable="false" style="min-width: 220px" class="text-right">
                            <template #body="{ data }">
                                <div class="flex items-center justify-end space-x-2">
                                     <Button :icon="data.user?.is_active ? 'pi pi-pause' : 'pi pi-play'" text severity="warning" size="small" @click="toggleHold(data)" v-tooltip.top="data.user?.is_active ? 'Place on Hold' : 'Reactivate'" />
                                     <Button icon="pi pi-eye" text severity="info" size="small" @click="router.push(`/admin/staff/${data.user_id}/edit`)" />
                                     <Button icon="pi pi-pencil" text severity="secondary" size="small" @click="router.push(`/admin/staff/${data.user_id}/edit`)" />
                                     <Button icon="pi pi-trash" text severity="danger" size="small" @click="deletePartner(data.id)" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div class="p-16 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">No partner network discovered in system.</div>
                        </template>
                    </DataTable>
                </template>
            </Card>
        </div>
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
</style>
