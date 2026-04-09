<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const router = useRouter();

const form = ref({
    name: '',
    description: '',
    icon: ''
});

const isSubmitting = ref(false);
const errorMsg = ref('');

const addSkill = async () => {
    isSubmitting.value = true;
    errorMsg.value = '';
    
    try {
        await api.post('/admin/skills', form.value);
        alert('Skill added successfully into the ecosystem!');
        router.push('/admin/skills');
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || 'Failed to add skill.';
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
  <AdminLayout>
    <div class="max-w-2xl mx-auto">
        
        <div class="flex items-center space-x-4 mb-8">
            <router-link to="/admin/skills" class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-500 hover:text-indigo-600 hover:shadow transition font-bold text-xl">
                ←
            </router-link>
            <div>
                <h1 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                    Add New Skill
                </h1>
                <p class="text-gray-500 text-sm mt-1">Introduce a new testing category.</p>
            </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <form @submit.prevent="addSkill" class="space-y-6">
                
                <div v-if="errorMsg" class="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-bold border border-red-100">
                    {{ errorMsg }}
                </div>

                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">Skill Name</label>
                    <input v-model="form.name" type="text" required class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition" placeholder="e.g. Vocabulary">
                </div>

                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">Description</label>
                    <textarea v-model="form.description" rows="3" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition" placeholder="Brief description of the skill..."></textarea>
                </div>

                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">Icon (Emoji or URL)</label>
                    <input v-model="form.icon" type="text" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition" placeholder="e.g. 📓">
                </div>

                <div class="pt-6 border-t border-gray-50 flex justify-end">
                    <button type="submit" :disabled="isSubmitting" class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5 transition duration-200 disabled:opacity-50 flex items-center">
                        <span v-if="isSubmitting" class="mr-2 animate-spin text-xl">⏳</span>
                        {{ isSubmitting ? 'Saving...' : 'Create Skill' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
  </AdminLayout>
</template>
