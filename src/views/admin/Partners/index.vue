<script setup>
import { ref, onMounted, computed } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import { useRouter } from 'vue-router';

const router = useRouter();
const partners = ref([]);
const loading = ref(true);
const searchQuery = ref('');

const filteredPartners = computed(() => {
    if (!searchQuery.value) return partners.value;
    const query = searchQuery.value.toLowerCase();
    return partners.value.filter(p => {
        const name = (p.partner_name || '').toLowerCase();
        const contact = `${p.fName_contact || ''} ${p.lName_contact || ''}`.toLowerCase();
        const email = (p.email || '').toLowerCase();
        return name.includes(query) || contact.includes(query) || email.includes(query);
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
    if (!confirm('Are you sure you want to delete this partner?')) return;
    try {
        await api.delete(`/admin/partners/${id}`);
        partners.value = partners.value.filter(p => p.id !== id);
    } catch (err) {
        alert('Failed to delete partner');
    }
};

const toggleHold = async (partner) => {
    const action = partner.is_active ? 'hold' : 'unhold';
    if (!confirm(`Are you sure you want to ${action} this partner?`)) return;

    try {
        await api.post(`/admin/partners/${partner.id}/${action}`);
        // Update local state
        partner.is_active = !partner.is_active;
        alert(`Partner ${action}ed successfully.`);
    } catch (err) {
        console.error(err);
        alert(`Failed to ${action} partner`);
    }
};

onMounted(fetchPartners);
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">

            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">Manage Partners</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">External institutional nodes</p>
                </div>
                <router-link to="/admin/partners/create"
                    class="bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                    Add Partner +
                </router-link>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading partners...</p>
            </div>

            <!-- Table -->
            <div v-else>
                <!-- Search & Results Container -->
                <div v-if="partners.length > 0 || searchQuery" class="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
                    
                    <!-- Search Bar -->
                    <div class="p-6 border-b border-slate-50 bg-slate-50/30">
                        <div class="relative w-full max-w-md">
                            <svg class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <input v-model="searchQuery" type="text" placeholder="Search partners by name or contact..."
                                class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all placeholder:text-slate-300 font-bold text-slate-700 shadow-sm">
                        </div>
                    </div>

                    <div v-if="filteredPartners.length > 0" class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead class="bg-slate-50/50 text-slate-300 text-[10px] uppercase font-black tracking-[0.2em]">
                                <tr>
                                    <th class="px-6 py-8">NAME</th>
                                    <th class="px-6 py-8">CONTACT</th>
                                    <th class="px-6 py-8">EMAIL</th>
                                    <th class="px-6 py-8">COUNTRY</th>
                                    <th class="px-6 py-8">STATUS</th>
                                    <th class="px-6 py-8 text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50 text-sm">
                                <tr v-for="partner in filteredPartners" :key="partner.id" class="hover:bg-slate-50/50 transition-colors group">
                                    <td class="px-6 py-4">
                                        <div class="font-black text-slate-700 uppercase">{{ partner.partner_name }}</div>
                                        <div class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">ID: #{{ String(partner.id).padStart(3, '0') }}</div>
                                    </td>
                                    <td class="px-6 py-4">
                                        <div class="font-bold text-slate-600">{{ partner.fName_contact }} {{ partner.lName_contact }}</div>
                                        <div class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{{ partner.phone || '-' }}</div>
                                    </td>
                                    <td class="px-6 py-4 text-xs font-bold text-slate-500">{{ partner.email || '-' }}</td>
                                    <td class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{{ partner.country }}</td>
                                    <td class="px-6 py-4">
                                        <span :class="partner.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'"
                                            class="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border">
                                            {{ partner.is_active ? 'Active' : 'Inactive' }}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-right space-x-2">
                                        <router-link :to="`/admin/partners/${partner.id}/edit`"
                                            class="bg-white border border-slate-200 text-slate-500 font-black text-[9px] tracking-widest uppercase px-4 py-2 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm inline-block">
                                            Edit
                                        </router-link>
                                        <button @click="toggleHold(partner)"
                                            :class="partner.is_active ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-500 hover:text-white' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-500 hover:text-white'"
                                            class="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition">
                                            {{ partner.is_active ? 'Hold' : 'Unhold' }}
                                        </button>
                                        <button @click="deletePartner(partner.id)"
                                            class="bg-rose-50 border border-rose-100 text-rose-400 font-black text-[9px] tracking-widest uppercase px-4 py-2 rounded-xl hover:bg-rose-500 hover:text-white transition">
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <!-- Empty Search Result -->
                    <div v-else class="p-20 text-center">
                        <div class="text-4xl mb-4 text-slate-200">🔍</div>
                        <h4 class="text-lg font-black text-slate-400 uppercase tracking-widest">No matching partners found</h4>
                        <p class="text-xs text-slate-300 font-bold mt-2">Try adjusting your search query</p>
                    </div>
                </div>

                <!-- Empty Global State -->
                <div v-else class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center group">
                    <div class="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-transform duration-500">🤝</div>
                    <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase">No Partners Registered</h3>
                    <p class="text-slate-400 font-medium max-w-sm mx-auto mb-12 text-sm leading-relaxed italic">
                        Start building your institutional ecosystem by adding your first partner.
                    </p>
                    <router-link to="/admin/partners/create" class="inline-block bg-indigo-600 text-white font-black py-5 px-12 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:bg-indigo-700 transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-xs">
                        Add First Partner ➜
                    </router-link>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>