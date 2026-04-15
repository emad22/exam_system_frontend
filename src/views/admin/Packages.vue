<script setup>
import { ref, onMounted, computed } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';

const packages = ref([]);
const loading = ref(true);
const searchQuery = ref('');

const filteredPackages = computed(() => {
    if (!searchQuery.value) return packages.value;
    const query = searchQuery.value.toLowerCase();
    return packages.value.filter(p => p.name.toLowerCase().includes(query));
});

// Stats
const totalPackages = computed(() => packages.value.length);
const avgSkills = computed(() => {
    if (packages.value.length === 0) return 0;
    const total = packages.value.reduce((acc, p) => acc + p.skills_count, 0);
    return (total / packages.value.length).toFixed(1);
});

// CRUD Modal Logic
const showModal = ref(false);
const isEditing = ref(false);
const isSaving = ref(false);
const currentPackage = ref({
    id: null,
    name: '',
    skills_count: 3,
    description: '',
    wp_package_id: ''
});

const openCreateModal = () => {
    isEditing.value = false;
    currentPackage.value = {
        id: null,
        name: '',
        skills_count: 3,
        description: '',
        wp_package_id: ''
    };
    showModal.value = true;
};

const openEditModal = (pkg) => {
    isEditing.value = true;
    currentPackage.value = { ...pkg };
    showModal.value = true;
};

const savePackage = async () => {
    if (!currentPackage.value.name) return;
    isSaving.value = true;
    try {
        if (isEditing.value) {
            await api.patch(`/admin/packages/${currentPackage.value.id}`, currentPackage.value);
        } else {
            await api.post('/admin/packages', currentPackage.value);
        }
        showModal.value = false;
        fetchPackages();
    } catch (err) {
        alert(err.response?.data?.message || 'Failed to save package.');
    } finally {
        isSaving.value = false;
    }
};

const deletePackage = async (id) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    try {
        await api.delete(`/admin/packages/${id}`);
        fetchPackages();
    } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete package.');
    }
};

const fetchPackages = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/packages');
        packages.value = res.data;
    } catch (err) {
        console.error('Failed to load packages', err);
    } finally {
        loading.value = false;
    }
};

onMounted(fetchPackages);
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight text-indigo-900">Standard Packages</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Configure skill bundles & WP integrations</p>
                </div>
                <button @click="openCreateModal"
                    class="bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all font-black text-xs uppercase tracking-widest">
                    Create New Package +
                </button>
            </div>

            <!-- Stats Bar -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Tiers</p>
                    <h4 class="text-2xl font-black text-slate-800">{{ totalPackages }} Units</h4>
                </div>
                <div class="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100">
                    <p class="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Average Depth</p>
                    <h4 class="text-2xl font-black text-indigo-900">{{ avgSkills }} Skills/Pkg</h4>
                </div>
                <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">WP Sync Status</p>
                        <h4 class="text-xs font-black text-emerald-600 uppercase">Operational</h4>
                    </div>
                    <div class="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Repositories...</p>
            </div>

            <div v-else>
                <!-- Search & Results Container -->
                <div v-if="packages.length > 0 || searchQuery" class="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_32px_120px_rgba(0,0,0,0.02)] overflow-hidden">
                    
                    <!-- Search Bar -->
                    <div class="p-8 border-b border-slate-50">
                        <div class="relative w-full max-w-md">
                            <i class="pi pi-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                            <input v-model="searchQuery" type="text" placeholder="Filter packages by name..."
                                class="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all placeholder:text-slate-300 font-black text-slate-700">
                        </div>
                    </div>

                    <div v-if="filteredPackages.length > 0" class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-slate-50">
                            <thead class="bg-slate-50/30">
                                <tr>
                                    <th class="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                                    <th class="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Package Identity</th>
                                    <th class="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Skill Count</th>
                                    <th class="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">WP Linked ID</th>
                                    <th class="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Management</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-slate-50">
                                <tr v-for="pkg in filteredPackages" :key="pkg.id" class="hover:bg-slate-50/50 transition-colors group">
                                    <td class="px-8 py-6 text-[10px] font-bold text-slate-300 italic">#{{ String(pkg.id).padStart(3, '0') }}</td>
                                    <td class="px-8 py-6">
                                        <div class="flex flex-col">
                                            <span class="text-xs font-black text-slate-700 uppercase tracking-tight">{{ pkg.name }}</span>
                                            <span class="text-[9px] text-slate-400 italic mt-0.5">{{ pkg.description || 'No description provided' }}</span>
                                        </div>
                                    </td>
                                    <td class="px-8 py-6">
                                        <span class="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100/50">
                                            {{ pkg.skills_count }} SKILLS
                                        </span>
                                    </td>
                                    <td class="px-8 py-6">
                                        <code class="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                                            {{ pkg.wp_package_id || 'NOT_LINKED' }}
                                        </code>
                                    </td>
                                    <td class="px-8 py-6 text-right space-x-2">
                                        <button @click="openEditModal(pkg)"
                                            class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                            <i class="pi pi-pencil text-sm"></i>
                                        </button>
                                        <button @click="deletePackage(pkg.id)"
                                            class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                                            <i class="pi pi-trash text-sm"></i>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-else class="bg-white rounded-[4rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center group">
                    <div class="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-all duration-500">📦</div>
                    <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase">Package Registry Empty</h3>
                    <p class="text-slate-400 font-medium max-w-sm mx-auto mb-12 text-sm leading-relaxed italic">
                        Define your standardized assessment packages to automate student exam generation.
                    </p>
                    <button @click="openCreateModal" class="inline-block bg-indigo-600 text-white font-black py-5 px-12 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:bg-indigo-700 transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-xs">
                        Define First Package ➜
                    </button>
                </div>
            </div>
        </div>

        <!-- Create/Edit Modal -->
        <Dialog v-model:visible="showModal" 
                :header="isEditing ? 'UPDATE MODULE CONFIG' : 'INITIALIZE NEW PACKAGE'" 
                class="max-w-xl w-full" 
                modal 
                pt:header:class="border-b border-slate-50 p-8"
                pt:content:class="p-8">
            <div class="space-y-8">
                <div class="grid grid-cols-1 gap-6">
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Package Designation</label>
                        <InputText v-model="currentPackage.name" 
                                  placeholder="e.g. Adult Elite / Trial Plan" 
                                  class="w-full h-14 bg-slate-50 border-slate-100 rounded-2xl font-black text-slate-700 uppercase px-6" />
                    </div>
                    
                    <div class="grid grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Skill Capacity</label>
                            <InputNumber v-model="currentPackage.skills_count" 
                                        :min="1" :max="5" showButtons 
                                        buttonLayout="horizontal"
                                        class="w-full"
                                        pt:pcInput:class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black text-slate-700 px-6" />
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WP Integration Key</label>
                            <InputText v-model="currentPackage.wp_package_id" 
                                      placeholder="WooProductID" 
                                      class="w-full h-14 bg-slate-50 border-slate-100 rounded-2xl font-black text-slate-500 px-6" />
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Extended Narrative (Description)</label>
                        <textarea v-model="currentPackage.description" 
                                  rows="4"
                                  class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 text-xs text-slate-600 font-medium focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                  placeholder="Describe the purpose of this skill bundle..."></textarea>
                    </div>
                </div>

                <div class="pt-6 border-t border-slate-50 flex justify-end space-x-3">
                    <Button label="Discard" outlined severity="secondary" @click="showModal = false" class="px-8 font-black text-[10px] uppercase tracking-widest" />
                    <Button :label="isSaving ? 'PERSISTING...' : (isEditing ? 'COMMIT UPDATES' : 'INITIALIZE PACKAGE')" 
                            :loading="isSaving"
                            @click="savePackage" 
                            class="px-10 bg-indigo-600 border-none font-black text-[10px] uppercase tracking-widest" />
                </div>
            </div>
        </Dialog>
    </AdminLayout>
</template>

<style scoped>
:deep(.p-dialog-header-slot) {
    font-size: 0.75rem;
}
</style>
