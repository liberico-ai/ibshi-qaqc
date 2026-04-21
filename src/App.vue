<template>
  <LoginView v-if="!isAuthenticated" @success="handleLoginSuccess" />
  <div v-else class="flex h-screen overflow-hidden bg-slate-50 text-slate-800 dark:bg-[#0f1117] dark:text-slate-300 transition-colors">
    <aside class="w-[260px] flex-shrink-0 bg-white border-r border-gray-200 dark:bg-[#1a1a2e] dark:border-[#252540] flex flex-col transition-colors">
      <!-- Logo -->
      <div class="h-16 flex items-center px-6 border-b border-gray-200 dark:border-[#252540] transition-colors">
        <div class="flex items-center gap-3">
          <div v-if="systemLogo" class="w-8 h-8 rounded-lg shadow-lg flex items-center justify-center overflow-hidden bg-white">
            <img :src="systemLogo" alt="Logo" class="max-w-full max-h-full object-contain">
          </div>
          <div v-else class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <div>
            <h1 class="text-[15px] font-bold text-slate-900 dark:text-white tracking-wide">{{ systemName || 'Libe Move' }}</h1>
            <p class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Operations Platform</p>
          </div>
        </div>
      </div>
      
      <!-- Sidebar Body -->
      <div class="flex-1 overflow-y-auto py-5">
        <template v-for="(section, sIdx) in menus" :key="section.id || sIdx">
          <template v-if="!section.permission || hasAccess(section.permission)">
            <div class="section-header" :class="{ 'mt-4': sIdx > 0 }">{{ section.section }}</div>
            <nav class="space-y-0.5 mb-2">
              <template v-for="(item, iIdx) in section.items" :key="iIdx">
                <!-- Using RouterLink internally for vue-router active states -->
                <router-link
                  v-if="(!item.permission || hasAccess(item.permission)) && item.to"
                  :to="item.to"
                  class="sidebar-link"
                >
                  <span v-html="item.icon" class="flex-shrink-0 flex items-center justify-center"></span>
                  {{ item.label }}
                </router-link>
                <a
                  v-else-if="(!item.permission || hasAccess(item.permission)) && item.href"
                  :href="item.href"
                  class="sidebar-link"
                >
                  <span v-html="item.icon" class="flex-shrink-0 flex items-center justify-center"></span>
                  {{ item.label }}
                </a>
              </template>
            </nav>
          </template>
        </template>
      </div>

      <!-- Sidebar Footer / System Info -->
      <router-link to="/system/about" class="border-t border-gray-200 dark:border-[#252540] p-4 transition-colors flex items-center justify-center text-[11px] font-mono text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer group group-hover:underline">
        <span v-if="systemInfo.version" class="group-hover:underline">v{{ systemInfo.version }} ({{ systemInfo.git_hash }})</span>
      </router-link>
    </aside>

    <!-- Content Area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top Navbar -->
      <header class="h-16 flex-shrink-0 bg-white/80 dark:bg-[#1a1a2e]/80 backdrop-blur-xl border-b border-gray-200 dark:border-[#252540] flex justify-between items-center px-8 transition-colors z-10">
        <div class="flex items-center gap-6">
          <!-- Quick Search -->
          <div class="relative group">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="w-4 h-4 text-slate-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input type="text" placeholder="Search... (Ctrl+K)" class="bg-slate-100 border-gray-200 text-slate-800 placeholder-slate-400 focus:bg-white dark:bg-white/[0.04] dark:border-[#252540] text-[13px] rounded-lg pl-10 pr-4 py-2 w-64 dark:text-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500/50 dark:focus:bg-white/[0.06] transition-all">
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <!-- Theme Toggle -->
          <button @click="toggleDarkMode" class="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-gray-500 dark:hover:text-white dark:hover:bg-white/[0.06] transition">
            <svg v-if="isDark" class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            <svg v-else class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
          </button>

          <!-- Notifications -->
          <div class="relative">
            <button @click="showNotifications = !showNotifications" class="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-gray-500 dark:hover:text-white dark:hover:bg-white/[0.06] transition relative">
              <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              <span v-if="unreadNotifications > 0" class="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[14px] h-[14px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full ring-2 ring-white dark:ring-[#1a1a2e]">{{ unreadNotifications }}</span>
            </button>

            <!-- Notifications Dropdown -->
            <div v-if="showNotifications" class="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1a1a2e] rounded-xl shadow-2xl border border-gray-200 dark:border-[#252540] overflow-hidden z-20">
              <div class="p-3 border-b border-gray-200 dark:border-[#252540] flex justify-between items-center bg-gray-50 dark:bg-black/20">
                <h3 class="font-bold text-sm text-slate-800 dark:text-white">Notifications</h3>
                <button @click="markAllAsRead" class="text-xs text-blue-500 hover:underline">Mark all read</button>
              </div>
              <div class="max-h-80 overflow-y-auto w-full">
                <div v-if="notifications.length === 0" class="p-4 text-center text-gray-500 text-sm">No notifications</div>
                <div v-for="notif in notifications" :key="notif.id" 
                  @click="handleNotificationClick(notif)"
                  class="p-3 border-b border-gray-100 dark:border-[#252540]/50 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition select-none"
                  :class="{'opacity-60': notif.is_read}">
                  <div class="flex items-start gap-3">
                    <div class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" :class="{
                      'bg-blue-500': !notif.is_read && notif.type !== 'ERROR' && notif.type !== 'WARNING',
                      'bg-red-500': !notif.is_read && notif.type === 'ERROR',
                      'bg-amber-500': !notif.is_read && notif.type === 'WARNING',
                      'bg-transparent': notif.is_read
                    }"></div>
                    <div class="flex-1 min-w-0">
                      <p class="text-[13px] font-semibold text-slate-800 dark:text-white truncate">{{ notif.title }}</p>
                      <p class="text-[12px] text-slate-500 line-clamp-2 mt-0.5">{{ notif.message }}</p>
                      <p class="text-[10px] text-slate-400 mt-1">{{ new Date(notif.created_at).toLocaleString() }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Grid Menu -->
          <button class="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-gray-500 dark:hover:text-white dark:hover:bg-white/[0.06] transition">
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
          </button>

          <!-- Divider -->
          <div class="w-px h-6 bg-gray-200 dark:bg-[#252540] mx-1"></div>

          <!-- User Info & Logout -->
          <div class="flex items-center gap-2 pl-2">
            <router-link to="/system/profile" class="flex items-center gap-2 cursor-pointer transition group" title="Hồ Sơ">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/20 group-hover:ring-emerald-400 p-0 transition-all">
                {{ currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U' }}
              </div>
              <div class="hidden sm:block text-right pr-1">
                <div class="text-[13px] font-semibold text-slate-800 dark:text-white leading-none">{{ currentUser?.full_name || currentUser?.username }}</div>
                <div class="text-[10px] text-slate-500 mt-0.5">@{{ currentUser?.username }}</div>
              </div>
            </router-link>
            <button @click="handleLogout" class="text-slate-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md flex-shrink-0" title="Đăng xuất">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Offline Status Banner -->
      <OfflineBanner />

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0f1117] p-8 transition-colors">
        <router-view></router-view>
      </main>
    </div>

    <!-- Toast Notifications Container -->
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <TransitionGroup name="toast">
        <div v-for="toast in toasts" :key="toast.id" 
             class="pointer-events-auto min-w-[300px] max-w-[400px] px-4 py-3 rounded-xl shadow-2xl dark:shadow-none border flex items-start gap-3 backdrop-blur-xl transition-all duration-300"
             :class="{
               'bg-white/90 border-emerald-200 dark:bg-[#1a1a2e]/95 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400': toast.type === 'success',
               'bg-white/90 border-red-200 dark:bg-[#1a1a2e]/95 dark:border-red-500/30 text-red-700 dark:text-red-400': toast.type === 'error',
               'bg-white/90 border-blue-200 dark:bg-[#1a1a2e]/95 dark:border-blue-500/30 text-blue-700 dark:text-blue-400': toast.type === 'info'
             }">
           
           <!-- Success Icon -->
           <svg v-if="toast.type === 'success'" class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
           
           <!-- Error Icon -->
           <svg v-if="toast.type === 'error'" class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
           
           <!-- Info Icon -->
           <svg v-if="toast.type === 'info'" class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
           
           <div class="flex-1 text-[13.5px] font-medium leading-relaxed" :class="{
             'text-slate-800 dark:text-slate-200': true
           }">{{ toast.message }}</div>
           
           <button @click="removeToast(toast.id)" class="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 mt-0.5">
             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
           </button>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import { useToast } from '@/composables/useToast.js'
import { useAuth } from '@/composables/useAuth.js'
import { apiFetch } from '@/utils/api.js'
import LoginView from './modules/system/frontend/LoginView.vue';
import OfflineBanner from './components/OfflineBanner.vue';

const isDark = ref(true)
const menus = ref([])
const router = useRouter()
const showNotifications = ref(false)
const notifications = ref([])
const unreadNotifications = ref(0)
const systemName = ref('')
const systemLogo = ref('')
const systemInfo = ref({})
let socket = null

const { toasts, removeToast, success, error, info } = useToast()
const { currentUser, isAuthenticated, setUser, setActions, login, logout, restoreSession, hasAccess } = useAuth()

const fetchMenus = async () => {
  try {
    const res = await apiFetch('/api/system/menus');
    if (res.ok) {
      const data = await res.json();
      menus.value = data.menus || [];
    }
  } catch (e) {
    console.error("Menus fetch failed:", e);
  }
};

const fetchSystemInfo = async () => {
  try {
    const res = await apiFetch('/api/system/info');
    if (res.ok) {
      systemInfo.value = await res.json();
    }
  } catch (e) {
    console.error("System info fetch failed:", e);
  }
};

const fetchSettings = async () => {
  try {
    const res = await apiFetch('/api/system/settings');
    if (res.ok) {
      const data = await res.json();
      const settings = data.data;
      if (settings.system_name) {
        systemName.value = settings.system_name;
        document.title = settings.system_name;
      }
      if (settings.logo_url) {
        systemLogo.value = settings.logo_url;
      }
      // Áp dụng theme mặc định nếu user chưa tự chỉnh
      if (!localStorage.getItem('theme') && settings.default_theme) {
        if (settings.default_theme === 'dark') {
          isDark.value = true;
          document.documentElement.classList.add('dark');
        } else {
          isDark.value = false;
          document.documentElement.classList.remove('dark');
        }
      }
    }
  } catch (e) {
    console.error("Settings fetch failed:", e);
  }
};

const fetchProfile = async () => {
  try {
    const res = await apiFetch('/api/system/profile');
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setActions(data.actions || []);
      fetchMenus();
    }
  } catch (e) {
    console.error("Profile fetch failed:", e);
  }
};

const fetchNotifications = async () => {
  try {
    const res = await apiFetch('/api/system/notifications?limit=20');
    if (res.ok) {
      const data = await res.json();
      notifications.value = data.data;
    }
    const countRes = await apiFetch('/api/system/notifications/unread-count');
    if (countRes.ok) {
      const countData = await countRes.json();
      unreadNotifications.value = countData.count;
    }
  } catch (e) {
    console.error("Notifications fetch failed:", e);
  }
};

const markAllAsRead = async () => {
  try {
    await apiFetch('/api/system/notifications/read-all', { method: 'PUT' });
    notifications.value.forEach(n => n.is_read = true);
    unreadNotifications.value = 0;
  } catch (e) {
    console.error("Mark all read failed:", e);
  }
};

const handleNotificationClick = async (notif) => {
  if (!notif.is_read) {
    try {
      await apiFetch(`/api/system/notifications/${notif.id}/read`, { method: 'PUT' });
      notif.is_read = true;
      unreadNotifications.value = Math.max(0, unreadNotifications.value - 1);
    } catch (e) {
      console.error("Mark read failed:", e);
    }
  }
  showNotifications.value = false;
  if (notif.link) {
    router.push(notif.link);
  }
};

const initSocket = () => {
  if (socket) return;
  socket = io(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/system' : `${window.location.origin}/system`, {
    withCredentials: true
  });
  
  socket.on('connect', () => {
    socket.emit('join', currentUser.value.id);
  });
  
  socket.on('notification:new', (notif) => {
    notifications.value.unshift(notif);
    unreadNotifications.value++;
    
    // Show toast based on type
    if (notif.type === 'ERROR') {
      error(`${notif.title}: ${notif.message}`, 5000);
    } else if (notif.type === 'SUCCESS') {
      success(`${notif.title}: ${notif.message}`, 5000);
    } else {
      info(`${notif.title}: ${notif.message}`, 5000);
    }
  });
};

const handleLoginSuccess = (data) => {
  login(data.user, data.token);
  fetchProfile(); // Load detailed permissions
  fetchNotifications();
  initSocket();

  setTimeout(() => {
    success(`Welcome back, ${data.user.full_name || data.user.username}!`);
  }, 300);
};

const handleLogout = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  logout();
};

const toggleDarkMode = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

onMounted(() => {
  fetchSettings();
  fetchSystemInfo();
  restoreSession();
  
  if (isAuthenticated.value) {
    fetchProfile();
    fetchNotifications();
    initSocket();
  }

  // Close notifications dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (showNotifications.value && !e.target.closest('.relative')) {
      showNotifications.value = false;
    }
  });

  window.addEventListener('user-updated', () => {
    setUser(JSON.parse(localStorage.getItem('user') || 'null'));
    fetchProfile(); // Reload permissions in case they changed
  });

  const storedTheme = localStorage.getItem('theme');
  if (storedTheme) {
    if (storedTheme === 'light') {
      isDark.value = false;
      document.documentElement.classList.remove('dark');
    } else {
      isDark.value = true;
      document.documentElement.classList.add('dark');
    }
  }
})
</script>
