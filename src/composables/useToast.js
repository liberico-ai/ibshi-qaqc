import { ref } from 'vue';

const toasts = ref([]);

export function useToast() {
  const addToast = ({ message, type = 'success', duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2);
    toasts.value.push({ id, message, type });
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index > -1) toasts.value.splice(index, 1);
  };

  const success = (message, duration) => addToast({ message, type: 'success', duration });
  const error = (message, duration) => addToast({ message, type: 'error', duration });
  const info = (message, duration) => addToast({ message, type: 'info', duration });

  return {
    toasts,
    success,
    error,
    info,
    removeToast
  };
}
