<script setup>
import McqQuestion from './McqQuestion.vue';
import WritingQuestion from './WritingQuestion.vue';
import SpeakingQuestion from './SpeakingQuestion.vue';
import DragDropQuestion from './DragDropQuestion.vue';
import WordSelectionQuestion from './WordSelectionQuestion.vue';
import FillBlankQuestion from './FillBlankQuestion.vue';
import MatchingQuestion from './MatchingQuestion.vue';
import OrderingQuestion from './OrderingQuestion.vue';
import ShortAnswerQuestion from './ShortAnswerQuestion.vue';
import TrueFalseQuestion from './TrueFalseQuestion.vue';
import HighlightQuestion from './HighlightQuestion.vue';
import SpeakingLiveQuestion from './SpeakingLiveQuestion.vue';

const props = defineProps({
    question: {
        type: Object,
        required: true
    },
    answer: {
        type: Object,
        required: true
    },
    disabled: {
        type: Boolean,
        default: false
    },
    hasStimulusContent: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:answer']);

const updateAnswer = (newAnswer) => {
    emit('update:answer', newAnswer);
};
</script>

<template>
    <div 
        class="flex-grow pr-1 pt-2 space-y-2 flex flex-col min-h-0"
    >
        <McqQuestion 
            v-if="question.type === 'mcq' || question.type === 'listening'" 
            :key="question.id"
            :question="question" :answer="answer" @update:answer="updateAnswer" :disabled="disabled" />

        <TrueFalseQuestion 
            v-else-if="question.type === 'true_false'" 
            :key="question.id"
            :question="question" :answer="answer" @update:answer="updateAnswer" :disabled="disabled" />
        
        <WritingQuestion 
            v-else-if="question.type === 'writing'" 
            :key="question.id"
            :question="question" 
            :answer="answer" 
            :hasStimulusContent="hasStimulusContent" 
            @update:answer="updateAnswer" 
            :disabled="disabled" />
        
        <SpeakingQuestion 
            v-else-if="question.type === 'speaking'" 
            :key="question.id"
            :question="question" :answer="answer" @update:answer="updateAnswer" :disabled="disabled" />
        
        <SpeakingLiveQuestion 
            v-else-if="question.type === 'speaking_live'" 
            :key="question.id"
            :question="question" :answer="answer" @update:answer="updateAnswer" :disabled="disabled" />
        
        <DragDropQuestion 
            v-else-if="question.type === 'drag_drop'" 
            :key="question.id"
            :question="question" :answer="answer" @update:answer="updateAnswer" :disabled="disabled" />
        
        <WordSelectionQuestion 
            v-else-if="question.type === 'word_selection' || question.type === 'click_word'" 
            :key="question.id"
            :question="question" :answer="answer" @update:answer="updateAnswer" :disabled="disabled" />
        
        <FillBlankQuestion 
            v-else-if="question.type === 'fill_blank'" 
            :key="question.id"
            :question="question" :answer="answer" @update:answer="updateAnswer" :disabled="disabled" />
        
        <MatchingQuestion 
            v-else-if="question.type === 'matching'" 
            :key="question.id"
            :question="question" :answer="answer" @update:answer="updateAnswer" :disabled="disabled" />
        
        <OrderingQuestion 
            v-else-if="question.type === 'ordering'" 
            :key="question.id"
            :question="question" :answer="answer" @update:answer="updateAnswer" :disabled="disabled" />
        
        <ShortAnswerQuestion 
            v-else-if="question.type === 'short_answer'" 
            :key="question.id"
            :question="question" 
            :answer="answer" 
            :hasStimulusContent="hasStimulusContent" 
            @update:answer="updateAnswer" 
            :disabled="disabled" />
        
        <HighlightQuestion 
            v-else-if="question.type === 'highlight'" 
            :key="question.id"
            :question="question" :answer="answer" @update:answer="updateAnswer" :disabled="disabled" />
        
        <div v-else class="text-center p-8 text-slate-500 bg-slate-50 rounded-lg">
            نوع السؤال غير مدعوم: {{ question.type }}
        </div>
    </div>
</template>
