<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const isSaving = ref(false);
const packages = ref([]);
const skills = ref([]);
const partnerId = route.params.id;

const editForm = ref({
    partner_name: '',
    fName_contact: '',
    lName_contact: '',
    email: '',
    phone: '',
    website:'',
    country: '',
    note:'',
    is_active: true,
});

const loadData = async () => {
    loading.value = true;
    try {
        const [partnerRes] = await Promise.all([
            api.get(`/admin/partners/${partnerId}`)
        ]);
              
        const partner = partnerRes.data;
        editForm.value = {
            partner_name: partner.partner_name || 'ArabAcademy',
            fName_contact: partner.fName_contact || '',
            lName_contact: partner.lName_contact || '',
            email: partner?.email || '',
            phone: partner?.phone || '',
            website: partner.website || '',
            country: partner.country || '',
            note: partner.note || '',
            is_active: !!partner.is_active
        };
    } catch (err) {
        console.error(err);
        alert('Failed to load partner data');
        router.push('/admin/partners');
    } finally {
        loading.value = false;
    }
};



const savePartner = async () => {
    isSaving.value = true;
    try {
        const payload = { ...editForm.value, is_active: editForm.value.is_active ? 1 : 0 };
        await api.patch(`/admin/partners/${partnerId}`, payload);
        alert('Identity profile updated successfully.');
        router.push('/admin/partners');
    } catch (err) {
        alert(err.response?.data?.message || 'Failed to update identity.');
    } finally {
        isSaving.value = false;
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
        <div v-else class="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">Sync Entity</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Manual identity reconciliation</p>
                </div>
                <button @click="router.push('/admin/partners')"
                    class="w-10 h-10 rounded-full bg-white border border-slate-100 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors shadow-sm">✕</button>
            </div>

            <div class="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full overflow-hidden flex flex-col border border-slate-100">
                <div class="p-10 space-y-12">
                    <!-- Section 1: Core -->
                    <div class="space-y-6">
                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Partner Name</label>
                                <input v-model="editForm.partner_name" type="text" class="premium-input text-xs uppercase" placeholder="FIRST_NAME">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">First Name Contact</label>
                                <input v-model="editForm.fName_contact" type="text" class="premium-input text-xs uppercase" placeholder="LAST_NAME">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Last Name Contact</label>
                                <input v-model="editForm.lName_contact" type="text" class="premium-input text-xs uppercase" placeholder="LAST_NAME">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Country</label>
                                <input v-model="editForm.country" type="text" class="premium-input text-xs uppercase" placeholder="LAST_NAME">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Identifier (Email)</label>
                                <input v-model="editForm.email" type="email" class="premium-input text-xs" placeholder="EMAIL@DOMAIN.COM">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Contact Phone</label>
                                <input v-model="editForm.phone" type="text" class="premium-input text-xs" placeholder="+XX XXX XXXX">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Website</label>
                                <input v-model="editForm.website" type="text" class="premium-input text-xs" placeholder="+XX XXX XXXX">
                            </div>
                             <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Notes</label>
                                <input v-model="editForm.note" type="text" class="premium-input text-xs" placeholder="+XX XXX XXXX">
                            </div>
                        </div>
                    </div>

                   

                    <!-- Section 3: Academic -->
                    <div class="space-y-6 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                        

                        <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-8">
                            <label class="flex items-center cursor-pointer group">
                                <div class="relative">
                                    <input type="checkbox" v-model="editForm.is_active" class="sr-only">
                                    <div :class="editForm.is_active ? 'bg-emerald-500' : 'bg-slate-200'" class="block w-12 h-7 rounded-full transition-colors"></div>
                                    <div :class="editForm.is_active ? 'translate-x-6' : 'translate-x-1'" class="absolute left-0 top-1 bg-white w-5 h-5 rounded-full transition-transform shadow-sm"></div>
                                </div>
                                <span class="ml-3 text-[10px] font-black text-slate-600 uppercase tracking-widest">Active Status</span>
                            </label>
                        </div>

                    </div>

                </div>

                <!-- Footer -->
                <div class="p-10 bg-slate-50 border-t border-slate-100 flex justify-end space-x-4 shrink-0">
                    <button @click="router.push('/admin/partners')" class="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition">Discard</button>
                    <button @click="savePartner" :disabled="isSaving" class="bg-slate-900 text-white font-black px-12 py-5 rounded-[1.5rem] shadow-xl shadow-slate-200 hover:bg-black active:scale-95 transition-all uppercase tracking-[0.2em] text-[10px]">
                        {{ isSaving ? 'SYNCHRONIZING...' : 'COMMIT CHANGES' }}
                    </button>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>
