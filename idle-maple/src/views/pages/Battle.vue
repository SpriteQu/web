<template>
  <div class="battle-container">
    <!-- 地图怪物信息 -->
    <div class="info">
      <h2>一些信息</h2>
    </div>

    <!-- Tab 切换区域 -->
    <div class="tab-nav">
      <button v-for="tab in tabs" :key="tab.name" :class="['tab-button', { active: activeTab === tab.name }]" @click="changeTab(tab.name)">
        {{ tab.label }}
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="tab-content">
      <!-- 常规战斗 -->
      <div v-if="activeTab === 'SingleBattle'" class="tab-pane">
        <h2>{{ currentMapMob.length ? '当前地图怪物' : '当前地图没有可战斗目标' }}</h2>
        <div class="mob-list">
          <div v-for="mob in currentMapMob" :key="mob.mob_id" class="mob-item">
            <img :src="mobStore.getMobIcon(mob.mob_id)" :alt="mobStore.mobData[mob.mob_id].name_chs" :title="mobStore.mobData[mob.mob_id].name_chs" class="mob-icon" />
          </div>
        </div>
        <!-- 开始战斗 -->
        <div v-if="currentMapMob.length > 0" class="battle-actions">
          <div v-if="battleStore.room_start" class="battle-in-progress">战斗正在进行中...</div>
          <button v-else @click="battleActionStore.sendBattleAction()" class="start-battle-btn">开始战斗</button>
        </div>
      </div>

      <!-- 组队战斗 -->
      <div v-if="activeTab === 'TeamBattle'" class="tab-pane">这里是组队战斗内容。</div>

      <!-- 战斗详情 -->
      <div v-if="activeTab === 'BattleDetails'" class="tab-pane battle-details">
        <template v-if="hasBattleAction">
          <div v-for="action in currentBattleActions" :key="action.id" class="battle-details-container">
            <div v-if="isInBattle(action)" class="battle-details-inner">
              <!-- 顶部操作栏 -->
              <div class="battle-header">
                <span class="countdown-timer">房间剩余时间 {{ formattedCountdown(action.remainTime) }}</span>
                <button @click="confirmLeaveBattle(action.id)" class="leave-battle-btn">离开战斗</button>
              </div>

              <!-- 确认模态框 -->
              <div v-if="showLeaveConfirm" class="confirm-modal">
                <div class="modal-content">
                  <p>离开战斗会退出战斗房间，且无法再次加入该房间，你确定要这么做吗？</p>
                  <div class="modal-actions">
                    <button @click="leaveBattleRoom" class="confirm-btn">确定</button>
                    <button @click="cancelLeaveBattle" class="cancel-btn">取消</button>
                  </div>
                </div>
              </div>

              <!-- 战斗内容主体 -->
              <div class="battle-content">
                <!-- 左半部分：玩家信息 -->
                <div class="left-panel">
                  <div class="player-list">
                    <div v-for="playerId in playerInstance(action)" :key="playerId" class="player-card">
                      <!-- 血条 -->
                      <div class="player-hp">
                        <div class="hp-container">
                          <div class="hp-bar">
                            <div class="hp-fill" :style="{ width: (getPlayer(playerId).attr.hp / getPlayer(playerId).attr.max_hp) * 100 + '%' }"></div>
                            <span class="hp-text">{{ getPlayer(playerId).attr.hp }} / {{ getPlayer(playerId).attr.max_hp }}</span>
                          </div>
                        </div>
                      </div>

                      <!-- 头像 -->
                      <div class="player-avatar">
                        <img :src="jobStore.getJobIcon(getPlayer(playerId).job)" alt="角色头像" />
                      </div>

                      <!-- 名字、等级、职业 -->
                      <div class="player-basic">
                        <span>Lv{{ getPlayer(playerId).level }}</span>
                        <span>{{ getPlayerName(playerId) }}</span>
                        {{ jobStore.getJobName(getPlayer(playerId).job) || "未知职业" }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 右半部分：敌人信息 -->
                <div class="right-panel">
                  <div v-if="Object.keys(mobInstance(action) || {}).length > 0" class="mob-list">
                    <div v-for="(mob, id) in mobInstance(action)" :key="id" class="mob-card">
                      <!-- 血条 -->
                      <div class="mob-hp">
                        <div class="hp-container">
                          <div class="hp-bar">
                            <div class="hp-fill" :style="{ width: (mob.attr.hp / mob.attr.max_hp) * 100 + '%' }"></div>
                            <span class="hp-text">{{ mob.attr.hp }} / {{ mob.attr.max_hp }}</span>
                          </div>
                        </div>
                      </div>

                      <!-- 头像 -->
                      <div class="mob-avatar">
                        <img :src="mobStore.getMobIcon(mob.template)" :alt="'怪物ID:' + mob.template" />
                      </div>

                      <!-- 名字、等级 -->
                      <div class="mob-basic">
                        <span>Lv{{ getMobLv(mob) }}</span>
                        <span>{{ mobStore.getMobName(mob.template) }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-else class="no-mobs">
                    <p>正在寻找怪物...</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="no-battle">当前没有进行中的战斗。</div>
          </div>
        </template>
        <div v-else class="no-battle">当前没有进行中的战斗。</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue"
import { useJobStore } from "@/stores/jobStore"
import { useUserStore } from "@/stores/userStore"
import { useMapStore } from "@/stores/mapStore"
import { useMobStore } from "@/stores/mobStore"
import { useActionStore } from "@/stores/actionStore"
import { useBattleActionStore } from "@/stores/battleActionStore"
import { usePlayerStore } from "@/stores/playerStore"

const userStore = useUserStore()
const mapStore = useMapStore()
const battleStore = useActionStore()
const jobStore = useJobStore()
const mobStore = useMobStore()
const actionStore = useActionStore()
const battleActionStore = useBattleActionStore()
const playerStore = usePlayerStore()


// 当前地图mob
const currentMapMob = computed(() => {
  return mapStore.mapData[userStore.currentRole.map].mob_list
})

// 从 actionStore 中获取所有的战斗 actions
const currentBattleActions = computed(() => {
  return Object.values(actionStore.action).filter((action) => action.type === 'battle')
})

const hasBattleAction = computed(() => currentBattleActions.value.length > 0)

// Tab 配置
const tabs = computed(() => {
  const baseTabs = [
    { name: "SingleBattle", label: "单人战斗" },
    // { name: 'TeamBattle', label: '组队战斗' },
  ]
  if (hasBattleAction.value) {
    baseTabs.push({ name: "BattleDetails", label: "战斗详情" })
  }
  return baseTabs
})

// 是否在战斗中（基于 action 是否存在且已开始）
const isInBattle = (currentBattle) => {
  return currentBattle?.isStart === true
}

// 玩家实例（从 action 中读取）
const playerInstance = (currentBattle) => {
  return currentBattle?.playerInstance || {}
}

// 通过rid获取player对象
const getPlayer = (playerId) => {
  return playerStore.getPlayer(playerId)
}

// 获取playerName，是自己需要去roles里获取
const getPlayerName = (playerId) => {
  if (playerId == userStore.currentRole.rid) {
    return userStore.roles[playerId].name
  } else {
    return playerStore.getPlayer(playerId)
  }
}

// 怪物实例（从 action 中读取）
const mobInstance = (currentBattle) => {
  return currentBattle?.mobInstance || {}
}

// 传入mob对象获取mob等级（加offset）
const getMobLv = (mob) => {
  const offset = Object.keys(mob.level_overlay || {}).length ? mob.level_overlay : 0
  return mobStore.getMobLevel(mob.template) + offset
}

// 当前激活的 Tab
const activeTab = ref("SingleBattle")

// 切换 Tab 方法
function changeTab(tabName) {
  activeTab.value = tabName
}

// 离开战斗
const showLeaveConfirm = ref(false)
const selectedLeaveActionId = ref(null)
const confirmLeaveBattle = (actionId) => {
  selectedLeaveActionId.value = actionId
  showLeaveConfirm.value = true
}
const leaveBattleRoom = () => {
  if (selectedLeaveActionId.value) {
    battleActionStore.sendLeaveBattle(selectedLeaveActionId.value)
  }
  showLeaveConfirm.value = false
  selectedLeaveActionId.value = null
}
const cancelLeaveBattle = () => {
  showLeaveConfirm.value = false
  selectedLeaveActionId.value = null
}

// 将秒数格式化为 HH:MM:SS
function formattedCountdown(remainSecond) {
  const hours = Math.floor(remainSecond / 3600)
  const minutes = Math.floor((remainSecond % 3600) / 60)
  const seconds = remainSecond % 60
  return `${String(hours)}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

// 进出battle切换标签页
watch(
  hasBattleAction,
  (available) => {
    if (!available && activeTab.value === "BattleDetails") {
      activeTab.value = "SingleBattle"
    } else if (available) {
      activeTab.value = "BattleDetails"
    }
  },
)

</script>

<style scoped>
/* 变量定义 */
.battle-container {
  --primary-color: #3b82f6;
  --success-color: #10b981;
  --danger-color: #ef4444;
  --warning-color: #f59e0b;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --border-color: #e5e7eb;
  --bg-hover: #f9fafb;
}

.battle-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.tab-nav {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.tab-button {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  background-color: #f3f4f6;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.tab-button:hover {
  background-color: #e5e7eb;
  transform: translateY(-1px);
}

.tab-button.active {
  background-color: var(--primary-color);
  color: white;
}

.tab-content {
  background-color: #fff;
  padding: 24px;
  border-radius: 12px;
  min-height: 400px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-pane {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== 战斗详情布局 ========== */
.battle-details-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.battle-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
}

/* 倒计时 */
.countdown-timer {
  font-family: "JetBrains Mono", "Consolas", monospace;
  font-weight: 600;
  color: #fbbf24;
  background: #1f2937;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
  min-width: 70px;
  text-align: center;
}

.battle-content {
  display: flex;
  gap: 24px;
}

.left-panel,
.right-panel {
  flex: 1;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 公共list样式 */
.mob-list,
.player-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}

/* 公共卡片样式 */
.player-card,
.mob-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  background-color: #fff;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  width: calc(50% - 16px);
  max-width: 160px;
  min-height: 180px;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.player-card:hover,
.mob-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 公共头像样式 */
.player-avatar,
.mob-avatar {
  width: 80px;
  height: 100px;
  margin: 8px 0;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  overflow: hidden;
}

.player-avatar img,
.mob-avatar img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: center bottom;
}

/* 公共血条容器 */
.player-hp,
.mob-hp {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 8px;
}

/* 公共信息行 */
.mob-basic,
.player-basic {
  display: flex;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  font-size: 13px;
  white-space: nowrap;
  align-items: baseline;
  margin-top: auto;
  width: 100%;
}

/* 等级样式 */
.mob-basic span:first-child,
.player-basic span:first-child {
  color: var(--warning-color);
  font-weight: 600;
}

/* 名字样式 */
.mob-basic span:last-child,
.player-basic span:last-child {
  color: var(--text-primary);
  font-weight: 500;
}

/* 公共hp条信息 */
.hp-bar {
  position: relative;
  width: 100%;
  height: 12px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  font-size: 12px;
  color: #fff;
  text-align: center;
  line-height: 20px;
}

.hp-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: var(--danger-color);
  transition: width 0.3s ease;
}

.hp-container {
  width: 100%;
  max-width: 180px;
}

.hp-text {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  font-family: Arial, sans-serif;
  letter-spacing: 0.5px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
  /* 描边 */
  text-shadow: -0.5px -0.5px 0 #000, 0.5px -0.5px 0 #000, -0.5px 0.5px 0 #000, 0.5px 0.5px 0 #000;
}

/* 无战斗时样式 */
.no-mobs {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 180px;
  color: var(--text-secondary);
  font-size: 16px;
  font-style: italic;
}

.no-battle {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}

/* 介绍页mob列表中的样式 */
.mob-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background-color: #f9f9f9;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 80px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.mob-item:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.mob-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.battle-actions {
  margin-top: 24px;
  text-align: center;
}

.start-battle-btn {
  padding: 12px 28px;
  background-color: var(--success-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.start-battle-btn:hover {
  background-color: #059669;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.battle-in-progress {
  font-size: 14px;
  color: var(--danger-color);
  font-weight: bold;
  text-align: center;
  padding: 12px;
  background-color: #fee2e2;
  border-radius: 6px;
}

/* 离开战斗按钮 */
.leave-battle-btn {
  padding: 8px 20px;
  background-color: var(--danger-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.leave-battle-btn:hover {
  background-color: #dc2626;
  transform: translateY(-1px);
}

/* 确认模态框 */
.confirm-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 24px;
  border-radius: 12px;
  width: 320px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.modal-content p {
  margin-bottom: 20px;
  font-size: 16px;
  text-align: center;
  color: var(--text-primary);
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.confirm-btn,
.cancel-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.confirm-btn {
  background-color: var(--danger-color);
  color: white;
}

.confirm-btn:hover {
  background-color: #dc2626;
  transform: translateY(-1px);
}

.cancel-btn {
  background-color: var(--text-secondary);
  color: white;
}

.cancel-btn:hover {
  background-color: #5a6268;
  transform: translateY(-1px);
}

/* 响应式布局 */
@media (max-width: 768px) {
  .battle-container {
    padding: 16px;
  }
  
  .battle-content {
    flex-direction: column;
    gap: 16px;
  }
  
  .player-card,
  .mob-card {
    width: calc(33.33% - 16px);
  }
  
  .tab-content {
    padding: 16px;
    min-height: 300px;
  }
  
  .tab-button {
    padding: 8px 16px;
    font-size: 13px;
  }
}
</style>