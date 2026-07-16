<template>
  <div class="home-container">
    <!-- 顶部Header -->
    <header class="app-header">
      <div class="logo">Idle_Maple</div>
  <div class="user-info">
    <span class="current-role" v-if="userStore.currentRole.rid >= 0">
          <div class="action-blocks">
            <div class="action-block" v-for="action in actionStore.action" :key="action.id">
              <div :class="['action-bar-row', { 'action-row-hidden': ['battle', 'move'].includes(action.type) }]">
                <span class="action-bar-label">次数</span>
                <div class="action-bar">
                  <div 
                    class="action-bar-fill times-bar-fill"
                    :style="{ width: action.times > 0 ? (action.completed / action.times * 100) + '%' : '0%' }"
                  ></div>
                  <span class="action-bar-text" v-if="action.times != null">{{ action.completed || 0 }}/{{ action.times }}</span>
                </div>
              </div>
              <div class="action-bar-row">
                <span class="action-bar-label">进度</span>
                <div class="action-bar">
                  <div 
                    class="action-bar-fill" 
                    :key="`${action.id}-${action.completed}`"
                    :class="{ 'animating': action.time > 0 }"
                    :style="{ '--duration': action.time + 's' }"
                  ></div>
                </div>
              </div>
              <div class="action-text-row">
                <span class="action-text">{{ actionStore.getActionVerb(action.id) }}中...</span>
                <button class="action-nav-btn" @click="switchPage(action.type === 'battle' ? 'battle' : 'map')">跳转</button>
              </div>
            </div>
          </div>
          <div class="role-bars">
            <div class="role-info">
              <!-- <span class="role-label">当前角色:</span> -->
              <span class="role-name">{{ currentRole?.name }}</span>
              <span class="role-job">{{jobStore.jobData[currentRole?.job]?.name_chs || '未知职业'}} {{currentRole?.level}}级</span>
            </div>
            <div class="bar-row">
              <div class="bar hp-bar-mini" :class="{ 'full-width': !showMpBar }">
                <div class="bar-fill" :style="{ width: hpPercentage + '%' }"></div>
                <span class="bar-text">{{ hpCurrent }}/{{ hpMax }}</span>
              </div>
              <div class="bar mp-bar-mini" v-if="showMpBar">
                <div class="bar-fill" :style="{ width: mpPercentage + '%' }"></div>
                <span class="bar-text">{{ mpCurrent }}/{{ mpMax }}</span>
              </div>
            </div>
            <div class="bar exp-bar-mini">
              <div class="bar-fill" :style="{ width: expPercentage + '%' }"></div>
              <span class="bar-text">{{ userStore.currentRole?.exp || 0 }}/{{ userStore.currentRole?.expMax || 1 }} ({{ formatPercentage }}%)</span>
            </div>
          </div>
          <div class="role-extra-info">
            <span class="uid">UID: {{ uidDisplay }}</span>
            <span class="role-count">角色数: {{ roleCountDisplay }}</span>
          </div>
        </span>
        <span v-else>未选择角色</span>
        <button @click="logout">登出</button>
      </div>
    </header>

    <!-- 主体布局 -->
    <div class="main-layout">
      <!-- 左侧边栏 -->
      <nav class="sidebar">
        <div class="sidebar-scroll">
          <ul>
            <li v-for="item in menuItems" :key="item.id" :class="{ active: currentPage === item.id }" @click="switchPage(item.id)">
              <span class="menu-icon" :class="item.icon"></span>
              {{ item.name }}
            </li>
          </ul>
        </div>
      </nav>

      <!-- 右侧内容区 -->
      <div class="content-area">
        <!-- 使用 keep-alive 缓存指定组件 -->
        <keep-alive>
          <component :is="currentComponent" :key="currentPage" v-if="currentPage" />
        </keep-alive>
      </div>
    </div>
  </div>

  <!-- 对话框容器 -->
  <div class="dialog-container">
    <transition-group name="slide">
      <Module v-for="d in uiStore.dialog" :key="d.id" :message="d.message" :type="d.type" :prefix="d.prefix" />
    </transition-group>
  </div>

  <div class="item-tip-container">
    <Module v-if="uiStore.itemTip" :key="uiStore.itemTip.id" :itemTip="uiStore.itemTip" :variant="'item-tip'" />
  </div>

</template>

<script setup>
import { useUserStore } from '@/stores/userStore'
import { useMapStore } from '@/stores/mapStore'
import { useJobStore } from '@/stores/jobStore'
import { useItemStore } from '@/stores/itemStore'
import { useMobStore } from '@/stores/mobStore'
import { useVillageStore } from '@/stores/villageStore'
import { useNpcStore } from '@/stores/npcStore'
import { useQuestStore } from '@/stores/questStore'
import { useWebSocketStore } from '@/stores/websocketStore'
import { useUiStore } from '@/stores/uiStore'
import { useActionStore } from '@/stores/actionStore'
import { onMounted, onBeforeUnmount, computed, ref } from 'vue'
import RoleComponent from '@/views/pages/Role.vue'
import BagComponent from '@/views/pages/Bag.vue'
import VillageComponent from '@/views/pages/Village.vue'
import EnhanceComponent from '@/views/pages/Enhance.vue'
import SkillComponent from '@/views/pages/Skill.vue'
import MapComponent from '@/views/pages/Map.vue'
import QuestComponent from '@/views/pages/Quest.vue'
import BattleComponent from '@/views/pages/Battle.vue'
import GuideComponent from '@/views/pages/Guide.vue'
import TradeComponent from '@/views/pages/Trade.vue'
import ShopComponent from '@/views/pages/Shop.vue'
import TestComponent from '@/views/pages/Test.vue'
import Module from '@/views/Modules/Dialog.vue'
import router from '@/router'

const userStore = useUserStore()
const actionStore = useActionStore()
const wsStore = useWebSocketStore()
const uiStore = useUiStore()
const mapStore = useMapStore()
const jobStore = useJobStore()
const itemStore = useItemStore()
const mobStore = useMobStore()
const villageStore = useVillageStore()
const npcStore = useNpcStore()
const questStore = useQuestStore()
// 计算属性：用户ID显示
const uidDisplay = computed(() => {
  return userStore.uid == 0 ? '加载中...' : userStore.uid
})

// 计算属性：角色数显示
const roleCountDisplay = computed(() => {
  return Object.keys(userStore.roles).length
})

const currentRole = computed(() => {
  return userStore.roles[userStore.currentRole.rid]
})

const roleAttr = computed(() => userStore.currentRole?.attr || {})

const hpCurrent = computed(() => {
  const value = Number(roleAttr.value.hp)
  return Number.isFinite(value) ? value : 0
})

const hpMax = computed(() => {
  const value = Number(roleAttr.value.max_hp)
  return Number.isFinite(value) && value > 0 ? value : 1
})

const hpPercentage = computed(() => {
  const max = hpMax.value
  if (!max || max <= 0) return 0
  const percentage = (hpCurrent.value / max) * 100
  return Math.min(Math.max(percentage, 0), 100)
})

const mpCurrent = computed(() => {
  const value = Number(roleAttr.value.mp)
  return Number.isFinite(value) ? value : 0
})

const mpMax = computed(() => {
  const value = Number(roleAttr.value.max_mp)
  return Number.isFinite(value) && value > 0 ? value : 1
})

const mpPercentage = computed(() => {
  const max = mpMax.value
  if (!max || max <= 0) return 0
  const percentage = (mpCurrent.value / max) * 100
  return Math.min(Math.max(percentage, 0), 100)
})

// 计算属性：经验百分比
const expPercentage = computed(() => {
  const role = userStore.currentRole
  if (!role || !role.expMax || role.expMax <= 0) {
    return 0
  }
  const percentage = (role.exp / role.expMax) * 100
  return Math.min(Math.max(percentage, 0), 100) // 限制在 0-100 之间
})

// 格式化百分比显示（最多两位小数，省略末尾的0，使用去尾法）
const formatPercentage = computed(() => {
  const value = expPercentage.value
  // 如果是整数，直接返回整数
  if (Number.isInteger(value)) {
    return value.toString()
  }
  // 使用 Math.floor 进行去尾处理，保留两位小数
  const flooredValue = Math.floor(value * 100) / 100
  // 去除末尾的0和小数点
  return parseFloat(flooredValue.toFixed(2)).toString()
})

// 检查是否有激活的角色
const hasActivatedRole = computed(() => {
  return userStore.currentRole.rid >= 0
})

// 控制蓝条显示
const showMpBar = ref(true)

const currentPage = ref('role')
const menuItems = computed(() => {
  const allItems = [
    { id: 'role', name: '角 色', icon: 'icon-role' },
    { id: 'bag', name: '背 包', icon: 'icon-bag' },
    { id: 'village', name: '匠人村', icon: 'icon-village' },
    // { id: 'enhance', name: '强化', icon: 'icon-enhance' },
    // { id: 'skill', name: '技能', icon: 'icon-mskill' },
    { id: 'map', name: '地 图', icon: 'icon-map' },
    { id: 'quest', name: '任 务', icon: 'icon-quest' },
    { id: 'battle', name: '战 斗', icon: 'icon-battle' },
    // { id: 'guild', name: '公会', icon: 'icon-guild' },
    // { id: 'trade', name: '交易', icon: 'icon-trade' },
    // { id: 'shop', name: '商城', icon: 'icon-shop' },
    { id: 'test', name: 'test', icon: 'icon-test' },
  ]
  
  // 如果角色未激活，只显示角色选择页面
  if (!hasActivatedRole.value) {
    return allItems.filter(item => item.id === 'role')
  }
  
  return allItems
})

const currentComponent = computed(() => {
  switch (currentPage.value) {
    case 'role': return RoleComponent
    case 'bag': return BagComponent
    case 'village': return VillageComponent
    case 'enhance': return EnhanceComponent
    case 'skill': return SkillComponent
    case 'map': return MapComponent
    case 'quest': return QuestComponent
    case 'battle': return BattleComponent
    case 'guild': return GuideComponent
    case 'trade': return TradeComponent
    case 'setting': return SettingComponent
    case 'shop': return ShopComponent
    case 'test': return TestComponent
    default: return null
  }
})

const switchPage = (pageId) => {
    // 如果目标页面不是角色选择页，检查是否有激活的角色
  if (pageId === 'role' || hasActivatedRole.value) {
    currentPage.value = pageId
  } else {
    uiStore.addDialog("warning", "还没有选择角色，请先选择一个角色再操作")
  }
}

const logout = () => {
  const confirmLogout = window.confirm('确定要退出登录吗？')
  if (confirmLogout) {
    router.logout()
  }
}

// 组件挂载时初始化
onMounted(async() => {
  await jobStore.loader()
  await userStore.loader()
  await mapStore.loader()
  await itemStore.loader()
  await mobStore.loader()
  await villageStore.loader()
  await npcStore.loader()
  wsStore.initWebSocket(localStorage.getItem('uid'), localStorage.getItem('token'))
})

// 组件卸载前清理
onBeforeUnmount(() => {
})
</script>

<style scoped>
.action-row-hidden {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}

/* 全局重置 */
html,
body,
#app,
#__layout,
#__nuxt {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow-x: hidden;
}

* {
  box-sizing: border-box;
}

/* 主容器 */
.home-container {
  display: flex;
  flex-direction: column;
  height: 98vh;
  max-height: 98vh;
  font-family: 'Arial', sans-serif;
  background-color: #f5f7fa;
  color: #4a4a4a;
  overflow: hidden;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Header - 淡蓝清新风格 */
.app-header {
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
  margin: 8px 12px 0 12px;
  position: sticky;
  top: 8px;
  z-index: 100;
  background: linear-gradient(135deg, #f0f8ff 0%, #e6f2ff 50%, #dbeafe 100%);
  backdrop-filter: blur(15px) saturate(180%);
  border-radius: 12px;
  border: 1px solid rgba(147, 197, 253, 0.5);
  box-shadow: 
    0 4px 20px rgba(59, 130, 246, 0.1),
    0 2px 8px rgba(59, 130, 246, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -1px 0 rgba(59, 130, 246, 0.1);
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3));
}

.user-info {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 0.9rem;
  color: #475569;
  font-weight: 500;
}

.uid,
.role-count {
  color: #f59e0b;
  font-weight: 600;
}

.current-role {
  color: #2563eb;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 12px;
  text-shadow: 0 0 8px rgba(37, 99, 235, 0.2);
}

/* 角色血条/蓝条 */
.role-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  padding: 4px 6px;
  background: linear-gradient(135deg, rgba(240, 242, 245, 0.85) 0%, rgba(226, 232, 240, 0.85) 100%);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  margin-top: 0px;
  border: 1px solid rgba(147, 197, 253, 0.3);
  box-shadow: 
    0 2px 8px rgba(59, 130, 246, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.role-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  width: 100%;
  justify-content: center;
  white-space: nowrap;
}

.role-label {
  color: #64748b;
  font-weight: 500;
}

.role-name {
  color: #2563eb;
  font-weight: 600;
}

.role-job {
  color: #475569;
  font-size: 10px;
}

.bar-row {
  display: flex;
  gap: 6px;
  width: 206px;
  justify-content: center;
}

.bar {
  position: relative;
  width: 100px;
  height: 12px;
  background-color: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 
    inset 0 1px 3px rgba(0, 0, 0, 0.15),
    0 1px 2px rgba(255, 255, 255, 0.8);
}

.bar.full-width {
  width: 100%;
}

.exp-bar-mini {
  width: 100%;
  position: relative;
  overflow: hidden; /* 通过外层容器截断，保持内部渐变完整 */
  border-radius: 4px;
}

.bar-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 4px;
}

.hp-bar-mini .bar-fill {
  background: linear-gradient(to right, #f87171, #ef4444, #dc2626);
  box-shadow: 
    0 0 8px rgba(239, 68, 68, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.mp-bar-mini .bar-fill {
  background: linear-gradient(to right, #60a5fa, #3b82f6, #2563eb);
  box-shadow: 
    0 0 8px rgba(59, 130, 246, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.exp-bar-mini .bar-fill {
  background: linear-gradient(to right, #fde047, #facc15, #eab308);
  box-shadow: 
    0 0 10px rgba(250, 204, 21, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  /* 宽度由模板中的 :style 动态控制，父容器的 overflow:hidden 会截断多余部分 */
}

.bar-text {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: bold;
  color: #000;
  font-family: Arial, sans-serif;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
}

/* Action 区块 - 嵌入感，不突出 */
.action-blocks {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-right: 12px;
}

.action-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 5px 7px;
  background: rgba(240, 242, 245, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(147, 197, 253, 0.2);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.06);
  width: 155px;
}

.action-bar-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-bar-label {
  font-size: 9px;
  color: #94a3b8;
  flex-shrink: 0;
  width: 24px;
}

.action-bar {
  flex: 1;
  height: 6px;
  background-color: rgba(203, 213, 225, 0.6);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-bar-fill {
  height: 100%;
  background: linear-gradient(to right, #93c5fd, #60a5fa, #3b82f6);
  border-radius: 3px;
  box-shadow: 0 0 4px rgba(59, 130, 246, 0.3);
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  width: 0%;
}

/* 次数进度条 - 添加平滑过渡 */
.times-bar-fill {
  transition: width 0.3s ease-out;
}

/* 进度条动画 */
.action-bar-fill.animating {
  animation: progressFill var(--duration) linear forwards;
}

@keyframes progressFill {
  from {
    width: 0%;
  }
  to {
    width: 100%;
  }
}

.action-bar-text {
  position: relative;
  z-index: 2;
  font-size: 9px;
  font-weight: bold;
  color: #1e293b;
  text-shadow: 0 0 2px rgba(255, 255, 255, 0.8);
  pointer-events: none;
  white-space: nowrap;
}

.action-text-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 1px;
}

.action-text {
  font-size: 9px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.user-info .action-nav-btn {
  padding: 1px 6px;
  font-size: 9px;
  font-weight: 500;
  color: #60a5fa;
  background: transparent;
  border: 1px solid #93c5fd;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  line-height: 1.4;
}

.user-info .action-nav-btn:hover {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.user-info .action-stop-btn {
  padding: 1px 6px;
  font-size: 9px;
  font-weight: 500;
  color: #ef4444;
  background: transparent;
  border: 1px solid #fca5a5;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  line-height: 1.4;
}

.user-info .action-stop-btn:hover {
  color: #dc2626;
  border-color: #f87171;
  background: rgba(239, 68, 68, 0.05);
}

.role-extra-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: 10px;
  justify-content: center;
}

/* Header 按钮 - 扁平风格 */
.app-header button {
  padding: 6px 15px;
  font-weight: 500;
  color: #2563eb;
  background: transparent;
  border: 1.5px solid #3b82f6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.app-header button:hover {
  background: #3b82f6;
  color: #ffffff;
  transform: translateY(-1px);
}

.app-header button:active {
  transform: translateY(0);
  background: #2563eb;
}

/* 主体布局 */
.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 侧边栏 */
.sidebar {
  width: 220px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 
    1px 0 3px rgba(59, 130, 246, 0.08),
    2px 0 8px rgba(59, 130, 246, 0.05);
  border-right: 1px solid rgba(147, 197, 253, 0.3);
  flex-shrink: 0;
}

.sidebar-scroll {
  height: 100%;
  overflow-y: auto;
  padding: 15px 0;
}

/* 自定义滚动条 */
.sidebar-scroll::-webkit-scrollbar {
  width: 4px;
}

.sidebar-scroll::-webkit-scrollbar-track {
  background: rgba(59, 130, 246, 0.03);
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #93c5fd 0%, #60a5fa 100%);
  border-radius: 2px;
}

.sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%);
}

.sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar li {
  padding: 12px 25px;
  margin: 5px 10px;
  display: flex;
  align-items: center;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #475569;
  font-weight: 500;
}

.sidebar li:hover {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  color: #2563eb;
  transform: translateX(3px);
}

.sidebar li.active {
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 
    0 2px 8px rgba(59, 130, 246, 0.3),
    0 0 15px rgba(59, 130, 246, 0.2);
}

.menu-icon {
  display: inline-block;
  width: 20px;
  height: 20px;
  margin-right: 12px;
  background-color: #60a5fa;
  border-radius: 4px;
  opacity: 0.7;
  transition: all 0.3s ease;
}

.sidebar li:hover .menu-icon {
  opacity: 1;
  background-color: #3b82f6;
}

.sidebar li.active .menu-icon {
  opacity: 1;
  background-color: #ffffff;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
}

/* 内容区 */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #f5f7fa;
  width: 100%;
}

/* 对话框容器 */
.dialog-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: 10px;
  pointer-events: none;
}
</style>
