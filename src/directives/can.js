import { useAuth } from '../composables/useAuth.js';

/**
 * Custom Vue directive for permission-based visibility.
 * 
 * Usage:
 *   <div v-can="'users.read'">Only visible if user has users.read action</div>
 *   <button v-can="'roles.write'">Edit</button>
 * 
 * Elements are hidden via display:none (remain in DOM for reactivity).
 * Real security enforcement stays on the backend via requireAction().
 */
export const vCan = {
  mounted(el, binding) {
    updateVisibility(el, binding.value);
  },
  updated(el, binding) {
    updateVisibility(el, binding.value);
  },
};

function updateVisibility(el, actionName) {
  const { hasAccess } = useAuth();
  if (hasAccess(actionName)) {
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}
