<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import { useRouter } from 'vue-router';

const router = useRouter();
const partners = ref([]);
const loading = ref(true);

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

        // تحديث الـ frontend مباشرة
        partner.is_active = !partner.is_active;

        alert(`Partner ${action}ed and all their students have been ${action === 'hold' ? 'deactivated' : 'reactivated'}.`);
    } catch (err) {
        console.error(err);
        alert(`Failed to ${action} partner`);
    }
};

onMounted(fetchPartners);
</script>

<template>
    <AdminLayout>
        <div class="space-y-6">

            <!-- Header -->
            <div class="flex justify-between items-center">
                <h1 class="text-3xl font-black text-slate-800">Manage Partners</h1>
                <router-link to="/admin/partners/create"
                    class="bg-indigo-600 text-white px-6 py-3 rounded-xl shadow hover:bg-indigo-700 transition">
                    Add Partner +
                </router-link>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="py-24 text-center">
                Loading...
            </div>

            <!-- Table -->
            <div v-else class="overflow-x-auto bg-white shadow rounded-xl">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr v-for="partner in partners" :key="partner.id">
                            <td class="px-6 py-4 text-sm text-gray-500">#{{ String(partner.id).padStart(3, '0') }}</td>
                            <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ partner.partner_name }}</td>
                            <td class="px-6 py-4 text-sm text-gray-500">{{ partner.fName_contact }} {{
                                partner.lName_contact }}</td>
                            <td class="px-6 py-4 text-sm text-gray-500">{{ partner.email || '-' }}</td>
                            <td class="px-6 py-4 text-sm text-gray-500">{{ partner.phone || '-' }}</td>
                            <td class="px-6 py-4 text-sm text-gray-500">{{ partner.country }}</td>
                            <td class="px-6 py-4 text-sm">
                                <span
                                    :class="partner.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'"
                                    class="px-2 py-1 rounded-lg text-xs font-bold">
                                    {{ partner.is_active ? 'Active' : 'Inactive' }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right text-sm space-x-2">
                                <router-link :to="`/admin/partners/${partner.id}`"
                                    class="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-gray-700 text-xs font-bold">
                                    Show
                                </router-link>
                                <router-link :to="`/admin/partners/${partner.id}/edit`"
                                    class="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-white text-xs font-bold">
                                    Edit
                                </router-link>
                                <button @click="deletePartner(partner.id)"
                                    class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white text-xs font-bold">
                                    Delete
                                </button>
                                <!-- زر Hold / Unhold -->
                                <button @click="toggleHold(partner)"
                                    :class="partner.is_active ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'"
                                    class="px-3 py-1 rounded text-white text-xs font-bold">
                                    {{ partner.is_active ? 'Hold' : 'Unhold' }}
                                </button>
                            </td>
                        </tr>
                        <tr v-if="partners.length === 0">
                            <td colspan="8" class="px-6 py-4 text-center text-gray-500">No Partners Found</td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
    </AdminLayout>
</template>

<style scoped>
/* Optional: scrollbar hide for table */
</style>