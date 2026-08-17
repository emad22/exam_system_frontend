import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';

export interface AnswerObj {
    question_id: number | string | null;
    option_id: number | string | null;
    text_answer: string;
    recorded_file: File | Blob | null;
    recorded_files: (File | Blob)[];        // for writing type (multiple uploads)
    pdf_file: File | Blob | null;           // for pdf_annotation type
    is_media_uploaded: boolean;
    drag_drop_answers: (string | null)[];
    selected_words: string[];
    fill_blank_answers: string[];
    matching_answers: Record<string, any>;
    ordering_answers: string[];
    highlight_answers: string[];
    live_status?: string;
    started_at?: string;
}

export const VALIDATORS: Record<string, (ans: AnswerObj, q?: any) => boolean> = {
    mcq: (ans) => !!ans.option_id,
    true_false: (ans) => !!ans.option_id,
    speaking: (ans) => !!ans.recorded_file,
    speaking_live: () => true, // always valid — passive question, auto-submits on timeout or exit
    writing: (ans) => !!(ans.text_answer && ans.text_answer.trim().length > 0) || !!(ans.recorded_files && ans.recorded_files.length > 0),
    pdf_annotation: () => true, // always valid — PDF worksheet is submitted with whatever annotations the student drew
    drag_drop: (ans) => ans.drag_drop_answers.every((a) => a !== null && a !== ''),
    fill_blank: (ans) => ans.fill_blank_answers.every((a) => !!(a && a.trim().length > 0)),
    matching: (ans, q) => Object.keys(ans.matching_answers).length === (q?.options?.filter((o: any) => o.is_correct)?.length ?? 0),
    ordering: (ans, q) => ans.ordering_answers.length === (q?.options?.length ?? 0),
    highlight: (ans) => ans.highlight_answers.length > 0,
    short_answer: (ans) => !!(ans.text_answer && ans.text_answer.trim().length > 0),
    click_word: (ans) => ans.selected_words.length > 0,
    word_selection: (ans) => ans.selected_words.length > 0,
};

/**
 * Checks if the actual answer content changed between old and new state (ignoring internal flags like is_media_uploaded)
 */
export function hasAnswerContentChanged(newVal: AnswerObj | null | undefined, oldVal: AnswerObj | null | undefined): boolean {
    if (!newVal || !oldVal) return false;
    if (newVal.question_id !== oldVal.question_id) return false;

    return (
        newVal.option_id !== oldVal.option_id ||
        newVal.text_answer !== oldVal.text_answer ||
        newVal.recorded_file !== oldVal.recorded_file ||
        newVal.pdf_file !== oldVal.pdf_file ||
        (newVal.recorded_files?.length ?? 0) !== (oldVal.recorded_files?.length ?? 0) ||
        JSON.stringify(newVal.drag_drop_answers) !== JSON.stringify(oldVal.drag_drop_answers) ||
        JSON.stringify(newVal.selected_words) !== JSON.stringify(oldVal.selected_words) ||
        JSON.stringify(newVal.fill_blank_answers) !== JSON.stringify(oldVal.fill_blank_answers) ||
        JSON.stringify(newVal.matching_answers) !== JSON.stringify(oldVal.matching_answers) ||
        JSON.stringify(newVal.ordering_answers) !== JSON.stringify(oldVal.ordering_answers) ||
        JSON.stringify(newVal.highlight_answers) !== JSON.stringify(oldVal.highlight_answers)
    );
}

export function useExamAnswers(
    currentIndex: Ref<number>,
    currentQ: ComputedRef<any>
) {
    const answers = ref<AnswerObj[]>([]);
    const questionSubmitted = ref(false);

    /**
     * Initializes answer objects matching questions definition
     */
    const initAnswers = (questions: any[]) => {
        answers.value = questions.map((q) => {
            const answerObj: AnswerObj = {
                question_id: q.id,
                option_id: null,
                text_answer: '',
                recorded_file: null,
                recorded_files: [],
                pdf_file: null,
                is_media_uploaded: false,
                drag_drop_answers: [],
                selected_words: [],
                fill_blank_answers: [],
                matching_answers: {},
                ordering_answers: [],
                highlight_answers: []
            };

            const content = q.content || '';
            if (q.type === 'drag_drop') {
                const slotCount = (content.match(/\.{10,}|\[\s*target\s*\]|\[\s*\]/gi) || []).length;
                answerObj.drag_drop_answers = Array(slotCount).fill(null);
            } else if (q.type === 'word_selection' || q.type === 'click_word') {
                answerObj.selected_words = [];
            } else if (q.type === 'fill_blank') {
                const slotCount = (content.match(/\[\s*input\s*\]|\[\s*\]/gi) || []).length;
                answerObj.fill_blank_answers = Array(slotCount).fill('');
            } else if (q.type === 'matching') {
                answerObj.matching_answers = {};
            } else if (q.type === 'ordering') {
                answerObj.ordering_answers = [];
            } else if (q.type === 'highlight') {
                answerObj.highlight_answers = [];
            } else if (q.type === 'short_answer') {
                answerObj.text_answer = '';
            }

            return answerObj;
        });
    };

    /**
     * Checks if current active question's answer is valid
     */
    const isCurrentAnswerValid = computed(() => {
        const ans = answers.value[currentIndex.value];
        const q = currentQ.value;
        if (!q || !ans) return false;
        const validator = VALIDATORS[q.type];
        return validator ? validator(ans, q) : !!ans.text_answer;
    });

    /**
     * Word count for text answers
     */
    const wordCount = computed(() => {
        return (answers.value[currentIndex.value]?.text_answer || '')
            .trim()
            .split(/\s+/)
            .filter((w) => w)
            .length;
    });

    /**
     * Watch active question answer to reset questionSubmitted only when content changes
     */
    watch(
        () => answers.value[currentIndex.value],
        (newVal, oldVal) => {
            if (hasAnswerContentChanged(newVal, oldVal)) {
                questionSubmitted.value = false;
            }
        },
        { deep: true }
    );

    return {
        answers,
        questionSubmitted,
        initAnswers,
        isCurrentAnswerValid,
        wordCount,
        VALIDATORS,
        hasAnswerContentChanged
    };
}
