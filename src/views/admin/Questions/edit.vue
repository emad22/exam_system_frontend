<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const router = useRouter();
const route = useRoute();
const questionId = route.params.id;

const skills = ref([]);
const isSubmitting = ref(false);
const isLoading = ref(true);
const errorMsg = ref('');
const successMsg = ref('');

const form = ref({
    skill_id: '',
    type: 'mcq',
    content: '',
    difficulty_level: 5,
    points: 1,
    group_tag: '',
    options: []
});

const fetchSkills = async () => {
    try {
        const res = await api.get('/admin/skills');
        skills.value = res.data;
    } catch (err) {
        console.error('Failed to load skills', err);
    }
};

const fetchQuestion = async () => {
    try {
        const res = await api.get(`/admin/questions/${questionId}`);
        const q = res.data;
        form.value = {
            skill_id: q.skill_id,
            type: q.type,
            content: q.content,
            difficulty_level: q.difficulty_level,
            points: q.points,
            group_tag: q.group_tag || '',
            options: q.options.map(opt => ({
                id: opt.id,
                option_text: opt.option_text,
                is_correct: opt.is_correct
            }))
        };
    } catch (err) {
        errorMsg.value = 'Failed to load question.';
        console.error(err);
    } finally {
        isLoading.value = false;
    }
};

const setCorrect = (idx) => {
    form.value.options.forEach((opt, i) => {
        opt.is_correct = (i === idx);
    });
};

const addOption = () => {
    form.value.options.push({ option_text: '', is_correct: false });
};

const removeOption = (index) => {
    if (form.value.options.length <= 2) return;
    form.value.options.splice(index, 1);
};

const handleTypeChange = () => {
    if (form.value.type === 'true_false') {
        form.value.options = [
            { option_text: 'True', is_correct: true },
            { option_text: 'False', is_correct: false }
        ];
    } else if (['writing', 'speaking'].includes(form.value.type)) {
        form.value.options = [];
    } else if (form.value.type === 'short_answer') {
        form.value.options = [{ option_text: '', is_correct: true }];
    }
};

const saveQuestion = async () => {
    if (!form.value.content.trim()) {
        errorMsg.value = 'Question content is required.';
        return;
    }
    if (form.value.options.some(opt => !opt.option_text.trim())) {
        errorMsg.value = 'All options must have text.';
        return;
    }

    isSubmitting.value = true;
    errorMsg.value = '';

    try {
        await api.patch(`/admin/questions/${questionId}`, form.value);
        successMsg.value = 'Question updated successfully!';
        setTimeout(() => router.push('/admin/questions'), 1500);
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || 'Failed to update question.';
    } finally {
        isSubmitting.value = false;
    }
};

onMounted(async () => {
    await fetchSkills();
    await fetchQuestion();
});
</script>

<template>
  <AdminLayout>
    <div class="max-w-4xl mx-auto pb-20">
        <div class="flex items-center space-x-4 mb-8">
            <router-link to="/admin/questions" class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-500 hover:text-indigo-600 hover:shadow transition font-bold text-xl">
                ←
            </router-link>
            <div>
                <h1 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                    Edit Question #{{ questionId }}
                </h1>
                <p class="text-gray-500 text-sm mt-1">Modify this question in the bank.</p>
            </div>
        </div>

        <div v-if="isLoading" class="flex justify-center py-32">
            <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>

        <form v-else @submit.prevent="saveQuestion" class="space-y-8">
            <div v-if="errorMsg" class="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 font-bold mb-6">
                ⚠️ {{ errorMsg }}
            </div>
            <div v-if="successMsg" class="bg-green-50 text-green-600 p-4 rounded-xl border border-green-100 font-bold mb-6">
                ✅ {{ successMsg }}
            </div>

            <!-- Core Settings -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h3 class="text-lg font-bold text-gray-800 mb-6 flex items-center">
                    <span class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mr-3 text-sm">1</span>
                    Basic Configuration
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-2">Target Skill</label>
                        <select v-model="form.skill_id" required class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium">
                            <option v-for="skill in skills" :key="skill.id" :value="skill.id">{{ skill.name }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-2">Question Type</label>
                        <select v-model="form.type" @change="handleTypeChange" required class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium">
                            <option value="mcq">Multiple Choice (MCQ)</option>
                            <option value="true_false">True / False</option>
                            <option value="short_answer">Short Answer</option>
                            <option value="writing">Writing Prompt</option>
                            <option value="speaking">Speaking Prompt</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-2">Difficulty Level ({{ form.difficulty_level }})</label>
                        <input v-model.number="form.difficulty_level" type="range" min="1" max="9" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600">
                        <div class="flex justify-between text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">
                            <span>Beginner</span><span>Expert</span>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-2">Points</label>
                        <input v-model.number="form.points" type="number" min="1" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-bold text-gray-700 mb-2">Group Tag (Exam Identifier)</label>
                        <input v-model="form.group_tag" type="text" placeholder="e.g. exam1" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium">
                    </div>
                </div>
            </div>

            <!-- Content -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h3 class="text-lg font-bold text-gray-800 mb-6 flex items-center">
                    <span class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mr-3 text-sm">2</span>
                    Question Content
                </h3>
                <label class="block text-sm font-bold text-gray-700 mb-2">Question Text</label>
                <textarea v-model="form.content" required rows="4" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" placeholder="Enter the question text here..."></textarea>
            </div>

            <!-- Options -->
            <div v-if="!['writing', 'speaking'].includes(form.type)" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-lg font-bold text-gray-800 flex items-center">
                        <span class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mr-3 text-sm">3</span>
                        Answer Options
                    </h3>
                    <button v-if="['mcq', 'short_answer'].includes(form.type)" type="button" @click="addOption" class="text-indigo-600 font-bold text-sm hover:text-indigo-800 transition flex items-center">
                        <span class="mr-1 text-xl">+</span> Add Option
                    </button>
                </div>
                <div class="space-y-4">
                    <div v-for="(option, idx) in form.options" :key="idx" class="flex items-center space-x-4 p-4 rounded-xl border bg-gray-50/50 group"
                        :class="option.is_correct ? 'border-green-200 bg-green-50/30' : 'border-gray-100'">
                        <div v-if="form.type !== 'short_answer'" class="flex-shrink-0">
                            <button
                                type="button"
                                @click="setCorrect(idx)"
                                :class="option.is_correct ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-gray-200 text-transparent'"
                                class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-sm"
                            >
                                <span class="text-[10px]">✓</span>
                            </button>
                        </div>
                        <div class="flex-grow">
                            <input v-model="option.option_text" type="text" :disabled="form.type === 'true_false'" :placeholder="'Option ' + (idx + 1)" class="w-full bg-transparent border-none focus:ring-0 font-medium text-gray-700 p-0 disabled:text-gray-400">
                        </div>
                        <div v-if="['mcq', 'short_answer'].includes(form.type)" class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                            <button v-if="form.options.length > 2" type="button" @click="removeOption(idx)" class="text-gray-400 hover:text-red-500 transition">✕</button>
                        </div>
                    </div>
                </div>
                <div class="mt-6 p-3 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 text-xs">
                    💡 Click the circle next to an option to mark it as correct.
                </div>
            </div>

            <!-- Submit -->
            <div class="flex justify-end pt-4">
                <button type="submit" :disabled="isSubmitting" class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-12 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 transform hover:-translate-y-0.5 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span v-if="isSubmitting" class="mr-2">⏳</span>
                    {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
                </button>
            </div>
        </form>
    </div>
  </AdminLayout>
</template>
