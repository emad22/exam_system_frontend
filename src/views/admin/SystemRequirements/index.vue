<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

const router = useRouter();
const toast = useToast();

const requirements = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');

const fetchRequirements = async () => {
    isLoading.value = true;
    try {
        const res = await api.get('/admin/system-requirements');
        requirements.value = res.data;
    } catch (err) {
        console.error(err);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load requirements.' });
    } finally {
        isLoading.value = false;
    }
};

const filteredRequirements = computed(() => {
    if (!searchQuery.value) return requirements.value;
    const query = searchQuery.value.toLowerCase();
    return requirements.value.filter(r => {
        return r.title.toLowerCase().includes(query) || 
               r.category.toLowerCase().includes(query) ||
               r.description?.toLowerCase().includes(query);
    });
});

const deleteRequirement = async (id) => {
    if (!confirm('Are you sure you want to delete this requirement?')) return;
    try {
        await api.delete(`/admin/system-requirements/${id}`);
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Requirement removed.' });
        fetchRequirements();
    } catch (err) {
        console.error(err);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete.' });
    }
};

onMounted(fetchRequirements);
</script>

<template>
    <AdminLayout>
        <Toast />
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4 md:px-12">
            
            <!-- Header Section -->
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between space-y-6 md:space-y-0">
                <div>
                     <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Technical prerequisites</h1>
                     <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Manage system requirements for assessment enrollment</p>
                </div>
                <div class="flex items-center space-x-3">
                    <Button label="Define Requirement" icon="pi pi-plus" 
                        class="px-8 py-3 rounded-2xl bg-indigo-600 border-none shadow-lg shadow-indigo-100 text-[10px] font-black tracking-widest uppercase transition-all hover:-translate-y-1" 
                        @click="router.push('/admin/system-requirements/create')" />
                </div>
            </div>

            <div v-if="isLoading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Registry...</p>
            </div>

            <!-- Registry Table Card -->
            <Card v-else class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden mt-6">
                <template #content>
                    <DataTable :value="filteredRequirements" dataKey="id" paginator :rows="10" 
                               class="p-datatable-sm text-sm" responsiveLayout="scroll">
                        
                        <template #header>
                            <div class="flex flex-col md:flex-row justify-end items-center gap-4 p-2 pb-4">
                                <div class="w-full md:w-80">
                                    <span class="relative">
                                        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                        <InputText v-model="searchQuery" placeholder="Search prerequisites..." class="pl-10 w-full shadow-sm rounded-xl border-slate-100" />
                                    </span>
                                </div>
                            </div>
                        </template>

                        <Column field="order" header="#" style="width: 80px">
                            <template #body="{ data }">
                                <span class="font-black text-slate-400">#{{ data.order }}</span>
                            </template>
                        </Column>

                        <Column header="Requirement Module" style="min-width: 250px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-4 py-2">
                                     <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shadow-sm">
                                         <i :class="data.category === 'Browser' ? 'pi pi-compass' : 
                                                    data.category === 'Internet' ? 'pi pi-wifi' : 
                                                    data.category === 'Hardware' ? 'pi pi-desktop' : 'pi pi-cog'" 
                                            class="text-lg"></i>
                                     </div>
                                     <div>
                                         <div class="font-black text-slate-700 uppercase tracking-tight">{{ data.title }}</div>
                                         <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ data.category }} Category</div>
                                     </div>
                                </div>
                            </template>
                        </Column>

                        <Column header="Importance" style="width: 150px" class="text-center">
                            <template #body="{ data }">
                                <Tag :value="data.is_mandatory ? 'Mandatory' : 'Optional'"
                                     :severity="data.is_mandatory ? 'danger' : 'info'"
                                     class="text-[9px] uppercase tracking-wider px-3" />
                            </template>
                        </Column>

                        <Column header="Status" style="width: 120px" class="text-center">
                            <template #body="{ data }">
                                <Tag :value="data.is_active ? 'Active' : 'Archived'"
                                     :severity="data.is_active ? 'success' : 'secondary'"
                                     class="text-[9px] uppercase tracking-wider px-3" />
                            </template>
                        </Column>

                        <Column :exportable="false" style="min-width: 150px" class="text-right pr-6">
                            <template #body="{ data }">
                                <div class="flex items-center justify-end space-x-2">
                                     <Button icon="pi pi-pencil" outlined rounded severity="warning" size="small" @click="router.push(`/admin/system-requirements/${data.id}/edit`)" />
                                     <Button icon="pi pi-trash" outlined rounded severity="danger" size="small" @click="deleteRequirement(data.id)" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div class="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No technical prerequisites discovered.</div>
                        </template>
                    </DataTable>
                </template>
            </Card>
        </div>
    </AdminLayout>
</template>

<style scoped>
@keyframes slide-in-bottom {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-in {
    animation: slide-in-bottom 0.8s ease-out;
}
</style>
