import { ref, computed, watch } from 'vue';

export const VALIDATORS: Record<string, (ans: any, q?: any) => boolean> = {
    mcq: (ans) => !!ans.option_id,
    true_false: (ans) => !!ans.option_id,
    speaking: (ans) => !!ans.recorded_file,
    writing: (ans) => !!(ans.text_answer && ans.text_answer.trim().length > 0) || !!ans.recorded_file,
    drag_drop: (ans) => ans.drag_drop_answers.every((a: any) => a !== null && a !== ''),
    fill_blank: (ans) => ans.fill_blank_answers.every((a: any) => a && a.trim().length > 0),
    matching: (ans, q) => Object.keys(ans.matching_answers).length === q.options.filter((o: any) => o.is_correct).length,
    ordering: (ans, q) => ans.ordering_answers.length === q.options.length,
    highlight: (ans) => ans.highlight_answers.length > 0,
    short_answer: (ans) => ans.text_answer && ans.text_answer.trim().length > 0,
    click_word: (ans) => ans.selected_words.length > 0,
    word_selection: (ans) => ans.selected_words.length > 0,
};

export function useExamAnswers(currentIndex: import('vue').Ref<number>, currentQ: import('vue').ComputedRef<any>) {
    const answers = ref<any[]>([]);
    const questionSubmitted = ref(false);

    function initAnswers(questions: any[]) {
        answers.value = questions.map(q => ({
            question_id: q.id,
            option_id: null,
            text_answer: '',
            recorded_file: null,
            drag_drop_answers: [],
            selected_words: [],
            fill_blank_answers: [],
            matching_answers: {},
            ordering_answers: [],
            highlight_answers: []
        }));

        questions.forEach((q, idx) => {
            const content = q.content || '';
            if (q.type === 'drag_drop') {
                const slotCount = (content.match(/\.{10,}|\[\s*target\s*\]|\[\s*\]/gi) || []).length;
                answers.value[idx].drag_drop_answers = Array(slotCount).fill(null);
            } else if (q.type === 'word_selection' || q.type === 'click_word') {
                answers.value[idx].selected_words = [];
            } else if (q.type === 'fill_blank') {
                const slotCount = (content.match(/\[\s*input\s*\]|\[\s*\]/gi) || []).length;
                answers.value[idx].fill_blank_answers = Array(slotCount).fill('');
            } else if (q.type === 'matching') {
                answers.value[idx].matching_answers = {};
            } else if (q.type === 'ordering') {
                answers.value[idx].ordering_answers = [];
            } else if (q.type === 'highlight') {
                answers.value[idx].highlight_answers = [];
            } else if (q.type === 'short_answer') {
                answers.value[idx].text_answer = '';
            }
        });
    }

    // Task 1.3: isCurrentAnswerValid computed
    const isCurrentAnswerValid = computed(() => {
        if (!currentQ.value || !answers.value[currentIndex.value]) return false;
        const ans = answers.value[currentIndex.value];
        const q = currentQ.value;
        const validator = VALIDATORS[q.type];
        return validator ? validator(ans, q) : !!ans.text_answer;
    });

    // Task 1.4: watch to reset questionSubmitted when answer changes for same question
    watch(() => answers.value[currentIndex.value], (newVal, oldVal) => {
        if (newVal && oldVal && newVal.question_id === oldVal.question_id) {
            questionSubmitted.value = false;
        }
    }, { deep: true });

    return {
        answers,
        questionSubmitted,
        initAnswers,
        isCurrentAnswerValid,
        VALIDATORS,
    };
}
