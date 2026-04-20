import { ref } from 'vue';

// ── Shared reactive auth state (module-level singletons) ─────────
const currentUser = ref(null);
const userActions = ref([]);
const isAuthenticated = ref(false);

/**
 * Composable providing shared authentication state across all components.
 * State is module-level so it persists across component lifecycles.
 */
export function useAuth() {

  /**
   * Check if the current user has access to a specific action.
   * Super-admins (is_admin) bypass all checks.
   */
  const hasAccess = (actionName) => {
    if (currentUser.value?.is_admin) return true;
    return userActions.value.includes(actionName);
  };

  const setUser = (user) => {
    currentUser.value = user;
  };

  const setActions = (actions) => {
    userActions.value = actions;
  };

  const login = (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    isAuthenticated.value = true;
    currentUser.value = user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    isAuthenticated.value = false;
    currentUser.value = null;
    userActions.value = [];
  };

  const restoreSession = () => {
    isAuthenticated.value = !!localStorage.getItem('token');
    currentUser.value = JSON.parse(localStorage.getItem('user') || 'null');
  };

  return {
    currentUser,
    userActions,
    isAuthenticated,
    hasAccess,
    setUser,
    setActions,
    login,
    logout,
    restoreSession,
  };
}
