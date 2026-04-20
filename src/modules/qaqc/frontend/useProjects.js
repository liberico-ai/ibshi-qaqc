import { ref, onMounted } from 'vue';
import { apiFetch } from '@/utils/api.js';

export function useProjects() {
  const projects = ref([]);

  onMounted(async () => {
    try {
      const res = await apiFetch('/api/qaqc/projects?limit=200');
      projects.value = (await res.json()).data ?? [];
    } catch {
      projects.value = [];
    }
  });

  return { projects };
}
