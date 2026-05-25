import { ref } from 'vue';
import type { Ref } from 'vue';

// Global shared state - all components share the same keyboard instance
const keyboardLayout = ref('arabic');
const showVirtualKeyboard = ref(false);
const onKeyPressCallback: Ref<((button: any) => void) | null> = ref(null);

export function useVirtualKeyboard() {
    const toggleKeyboardLayout = () => {
        keyboardLayout.value = keyboardLayout.value === 'arabic' ? 'english' : 'arabic';
    };

    const registerKeyPressListener = (callback: (button: any) => void) => {
        onKeyPressCallback.value = callback;
    };

    const unregisterKeyPressListener = () => {
        onKeyPressCallback.value = null;
    };

    const triggerKeyPress = (button: any) => {
        if (onKeyPressCallback.value) {
            onKeyPressCallback.value(button);
        }
    };

    return {
        keyboardLayout,
        showVirtualKeyboard,
        toggleKeyboardLayout,
        onKeyPressCallback,
        registerKeyPressListener,
        unregisterKeyPressListener,
        triggerKeyPress
    };
}

