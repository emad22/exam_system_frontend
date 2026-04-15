<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import Button from 'primevue/button';
import Card from 'primevue/card';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Message from 'primevue/message';
import Slider from 'primevue/slider';
import InputNumber from 'primevue/inputnumber';

const router = useRouter();
const route = useRoute();
const skills = ref([]);
const isSubmitting = ref(false);
const errorMsg = ref('');

const form = ref({
    skill_id: '',
    type: 'mcq',
    content: '',
    difficulty_level: 5,
    points: 1,
    group_tag: '',
    options: [
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false }
    ]
});

const fetchSkills = async () => {
    try {
        const res = await api.get('/admin/skills');
        skills.value = res.data;
        
        // Handle query params for auto-fill
        if (route.query.skill_id) {
            form.value.skill_id = Number(route.query.skill_id);
        } else if (skills.value.length > 0) {
            form.value.skill_id = skills.value[0].id;
        }

        if (route.query.difficulty_level) {
            form.value.difficulty_level = Number(route.query.difficulty_level);
        }
    } catch (err) {
        console.error('Failed to load skills', err);
    }
};

const addOption = () => {
    form.value.options.push({ option_text: '', is_correct: false });
};

const removeOption = (index) => {
    if (form.value.options.length <= 2) return;
    form.value.options.splice(index, 1);
};

const setCorrect = (idx) => {
    form.value.options.forEach((opt, i) => {
        opt.is_correct = (i === idx);
    });
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
    } else {
        // mcq
        if (form.value.options.length < 2) {
            form.value.options = [
                { option_text: '', is_correct: true },
                { option_text: '', is_correct: false }
            ];
        }
    }
};

const saveQuestion = async () => {
    // Validation
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
        await api.post('/admin/questions', form.value);
        alert('Question added successfully to the bank.');
        router.push('/admin/questions');
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || 'Failed to save question.';
    } finally {
        isSubmitting.value = false;
    }
};

onMounted(fetchSkills);
</script>

<template>
  <AdminLayout>
    <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4 md:px-12">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-6">
                <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/questions')" />
                <div>
                     <h1 class="text-3xl font-black text-slate-800 tracking-tight">Add New Question</h1>
                     <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manual entry for the question bank</p>
                </div>
            </div>
        </div>

        <form @submit.prevent="saveQuestion" class="space-y-8">
            <Message v-if="errorMsg" severity="error" :closable="false">{{ errorMsg }}</Message>

            <!-- Core Settings -->
            <Card class="border border-slate-100 shadow-sm rounded-[2rem]">
                <template #content>
                    <div class="p-4 space-y-6">
                        <h3 class="text-lg font-bold text-slate-800 mb-6 flex items-center">
                            <span class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mr-3 text-sm font-black">1</span>
                            Basic Configuration
                        </h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="flex flex-col">
                                <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Target Skill</label>
                                <Select v-model="form.skill_id" :options="skills" optionLabel="name" optionValue="id" placeholder="Select a skill" class="w-full rounded-xl shadow-sm" />
                            </div>
                            <div class="flex flex-col">
                                <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Question Type</label>
                                <Select v-model="form.type" @change="handleTypeChange" :options="[{label:'Multiple Choice (MCQ)', value:'mcq'}, {label:'True / False', value:'true_false'}, {label:'Short Answer (Fill in Blank)', value:'short_answer'}, {label:'Writing Prompt', value:'writing'}, {label:'Speaking Prompt', value:'speaking'}]" optionLabel="label" optionValue="value" class="w-full rounded-xl shadow-sm" />
                            </div>
                            <div class="flex flex-col">
                                <label class="block text-xs font-bold text-slate-500 mb-3 pl-2">Difficulty Level ({{ form.difficulty_level }})</label>
                                <Slider v-model="form.difficulty_level" :min="1" :max="9" :step="1" class="w-full mb-3" />
                                <div class="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    <span>Beginner</span>
                                    <span>Expert</span>
                                </div>
                            </div>
                            <div class="flex flex-col">
                                <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Points for Correct Answer</label>
                                <InputNumber v-model="form.points" :min="1" showButtons class="w-full rounded-xl shadow-sm" />
                            </div>
                            <div class="flex flex-col md:col-span-2">
                                <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Group Identifier (Optional)</label>
                                <InputText v-model="form.group_tag" placeholder="e.g. listening_set_a" class="w-full rounded-xl shadow-sm" />
                                <p class="text-[10px] text-slate-400 mt-2 pl-2 font-bold uppercase tracking-widest">Use this to group questions together for selective sampling.</p>
                            </div>
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Content -->
            <Card class="border border-slate-100 shadow-sm rounded-[2rem]">
                <template #content>
                    <div class="p-4">
                        <h3 class="text-lg font-bold text-slate-800 mb-6 flex items-center">
                            <span class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mr-3 text-sm font-black">2</span>
                            Question Content
                        </h3>
                        
                        <div class="flex flex-col">
                            <label class="block text-xs font-bold text-slate-500 mb-2 pl-2">Question Text</label>
                            <Textarea v-model="form.content" required rows="4" placeholder="Enter the question text here..." class="w-full rounded-2xl shadow-sm" autoResize />
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Options -->
            <Card v-if="!['writing', 'speaking'].includes(form.type)" class="border border-slate-100 shadow-sm rounded-[2rem]">
                <template #content>
                    <div class="p-4">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-lg font-bold text-slate-800 flex items-center">
                                <span class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mr-3 text-sm font-black">3</span>
                                {{ form.type === 'short_answer' ? 'Correct Variations' : 'Answer Options' }}
                            </h3>
                            <Button v-if="['mcq', 'short_answer'].includes(form.type)" type="button" @click="addOption" icon="pi pi-plus" :label="'Add ' + (form.type === 'short_answer' ? 'Variation' : 'Option')" text size="small" rounded />
                        </div>
                        
                        <div class="space-y-4">
                            <div v-for="(option, idx) in form.options" :key="idx" class="flex items-center space-x-4 p-4 rounded-xl border bg-slate-50/50 group transition-all"
                                :class="option.is_correct ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'">
                                <div v-if="form.type !== 'short_answer'" class="flex-shrink-0">
                                    <button 
                                        type="button" 
                                        @click="setCorrect(idx)"
                                        :class="option.is_correct ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm' : 'bg-white border-slate-200 text-transparent'"
                                        class="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                                    >
                                        <i class="pi pi-check text-xs"></i>
                                    </button>
                                </div>
                                <div class="flex-grow">
                                    <InputText v-model="option.option_text" :disabled="form.type === 'true_false'" :placeholder="form.type === 'short_answer' ? 'Enter expected answer...' : 'Option ' + (idx + 1)" class="w-full bg-white shadow-sm rounded-xl font-bold text-slate-700" />
                                </div>
                                <div v-if="['mcq', 'short_answer'].includes(form.type)" class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                                    <Button v-if="form.options.length > 1" type="button" @click="removeOption(idx)" icon="pi pi-times" severity="danger" text rounded />
                                </div>
                            </div>
                        </div>
                        
                        <div v-if="form.type === 'mcq' || form.type === 'true_false'" class="mt-6 flex items-center text-xs p-4 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 font-bold tracking-wide">
                            <i class="pi pi-info-circle mr-3 text-lg"></i>
                            Click the circle next to an option to mark it as the **correct** answer.
                        </div>
                        <div v-if="form.type === 'short_answer'" class="mt-6 flex items-center text-xs p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-bold tracking-wide">
                            <i class="pi pi-info-circle mr-3 text-lg"></i>
                            Add multiple variations if there are different ways to write the same correct answer.
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Submit -->
            <div class="flex justify-end pt-4 pb-10">
                <Button type="submit" :loading="isSubmitting" :label="isSubmitting ? 'Saving Question...' : 'Add to Question Bank'" icon="pi pi-check" size="large" class="shadow-xl rounded-2xl px-10 font-bold tracking-widest uppercase" />
            </div>
        </form>
    </div>
  </AdminLayout>
</template>
