<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const selectedPartner = ref(null);
const skills = ref([]);
const packages = ref([]);
const partnerId = route.params.id;

const loadData = async () => {
    loading.value = true;
    try {
        const [partnerRes] = await Promise.all([
            api.get(`/admin/partners/${partnerId}`)
        ]);
        
        selectedPartner.value = partnerRes.data;
       // alert(selectedPartner.value);
       
    } catch (err) {
        console.error(err);
        alert('Failed to load partner data');
        router.push('/admin/Partners');
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    loadData();
});
</script>

<template>
    <AdminLayout>
        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <div class="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Database...</p>
        </div>
        <div v-else class="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">Identity Details</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Read-only partner view</p>
                </div>
                <button @click="router.push('/admin/partners')"
                    class="w-10 h-10 rounded-full bg-white border border-slate-100 text-slate-400 hover:text-slate-900 flex items-center justify-center transition-colors shadow-sm">✕</button>
            </div>

            <div class="bg-white rounded-[3.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full overflow-hidden flex flex-col border border-slate-100">
                <div class="px-12 py-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center shrink-0">
                    <div class="flex items-center space-x-6">
                        <div class="w-20 h-20 rounded-[2rem] bg-slate-900 text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-slate-200">
                            {{ selectedPartner.partner_name[0] }}
                        </div>
                        <div>
                            <h3 class="text-3xl font-black text-slate-800 tracking-tight">{{ selectedPartner.partner_name }}</h3>
                            <div class="flex items-center space-x-3 mt-1.5">
                                <span class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100">Contact Name: {{ selectedPartner.fName_contact || 'N/A' }} {{ selectedPartner.lName_contact }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="p-12 space-y-12">
                    <!-- Data Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div class="space-y-8">
                            <h4 class="text-[11px] font-black text-indigo-500 uppercase tracking-[0.3em] flex items-center">
                                <span class="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span> Identity Profile
                            </h4>
                            <div class="grid grid-cols-2 gap-6">
                                <div v-for="(val, key) in { Email: selectedPartner.email, Phone: selectedPartner.phone || 'N/A', Website: selectedPartner.website, Country: selectedPartner.country || 'N/A', Is_Active: selectedPartner.is_active || 'N/A' }" :key="key" class="space-y-1">
                                    <label class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{{ key }}</label>
                                    <p class="text-sm font-bold text-slate-700 truncate">{{ val }}</p>
                                </div>
                            </div>
                           
                        </div>
                    </div>

                    
                </div>
            </div>
        </div>
    </AdminLayout>
</template>
