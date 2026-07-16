import { createRouter, createWebHashHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import { useWebSocketStore } from '../stores/websocketStore'
import { useUserStore } from '../stores/userStore'
import { useUiStore } from '@/stores/uiStore'

const routes = [
  {
    path: '/login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: Home,  // 主布局组件
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 认证检查函数
function checkAuth() {
  const uid = localStorage.getItem('uid')
  const token = localStorage.getItem('token')
  const expireTime = localStorage.getItem('expire_time')

  if (uid && token && expireTime) {
    const currentTime = Date.now() / 1000
    console.log(expireTime, currentTime, ((expireTime - currentTime) / 3600 / 24).toFixed(3), "day")
    return expireTime > currentTime
  }
  return false
}

// 登出方法
router.logout = function () {
  // 关闭 WebSocket
  const wsStore = useWebSocketStore()
  const userStore = useUserStore()
  const uiStore = useUiStore()
  wsStore.closeWebSocket()
  wsStore.user_init = false  
  // 清除本地存储
  localStorage.removeItem('uid')
  localStorage.removeItem('token')
  localStorage.removeItem('expire_time')
  localStorage.removeItem('active')
  // userStore.reset();
  uiStore.reset();
  // 跳转到登录页
  this.push('/login')
}

// 全局前置守卫
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !checkAuth()) {
    // 如果需要认证但未认证，重定向到登录页
    next('/login')
  } else if (to.path === '/login' && checkAuth()) {
    // 如果已认证但尝试访问登录页，重定向到首页
    next('/')
  } else {
    // 正常放行
    next()
  }
})

export default router
