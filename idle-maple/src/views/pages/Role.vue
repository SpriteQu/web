<template>
  <div class="role-choice">
    <!-- 角色列表 -->
    <div class="game-cards">
      <!-- 渲染已有角色卡片 -->
      <div v-for="role in userStore.roles" :key="role.rid" class="game-card role-card" :class="{ active: role.id === userStore.currentRole.rid }">
        <div class="card-content">
          <h3>{{ role.name }}</h3>
          <div class="role-info mt-auto">
            <div class="icon-wrapper">
              <img :src="jobStore.getJobIcon(role.job)" :alt="jobStore.jobData[role.job]?.name_chs" class="job-icon" />
            </div>
            <p>职业：{{ jobStore.jobData[role.job]?.name_chs || '加载中...' }}</p>
            <p>等级：Lv.{{ role.level }}</p>
          </div>
        </div>

        <button v-if="role.id != userStore.currentRole.rid" class="switch-btn" @click="userStore.sendActiveRole(role.id)" :class="{ cooldown: cooldownTime > 0 }">
          {{ switchButtonText }}
          <span v-if="cooldownTime > 0" class="cooldown-text">({{ cooldownTime }}s)</span>
        </button>
      </div>

      <!-- 创建新角色卡片 -->
      <div class="game-card create-card" @click="openCreateDialog">
        <h3>+</h3>
        <p>创建新角色</p>
      </div>

      <!-- 创建角色模态框 -->
      <div v-if="showCreateDialog" class="confirm-modal">
        <div class="modal-content">
          <h3 class="modal-title">创建新角色</h3>
          <div class="input-group">
            <label for="roleName">角色名称</label>
            <input id="roleName" v-model="newRoleName" type="text" placeholder="2-8个字符（中英文、数字）" maxlength="8" @keyup.enter="createRole" />
            <div class="character-count">
              {{ newRoleName.length }}/8
              <span v-if="nameError" class="error-text">{{ nameError }}</span>
            </div>
          </div>

          <div class="job-selection">
            <label>选择职业</label>
            <div class="job-options">
              <div v-for="jobId in jobStore.availableJobsData" :key="jobId" class="job-option" :class="{ selected: selectedJob === jobId }" @click="selectedJob = jobId">
                <img :src="jobStore.getJobIcon(jobId)" :alt="jobStore.getJobGroupNameFromJobId(jobId)" class="job-icon" />
                <span class="job-name">{{ jobStore.getJobGroupNameFromJobId(jobId) }}</span>   
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button @click="createRole" class="confirm-btn" :disabled="!isValidRoleName">确定</button>
            <button @click="closeCreateDialog" class="cancel-btn">取消</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from "vue"
  import { useUserStore } from "@/stores/userStore"
  import { useWebSocketStore } from "@/stores/websocketStore"
  import { useJobStore } from "@/stores/jobStore"
  import { useUiStore } from "@/stores/uiStore"

  const userStore = useUserStore()
  const wsStore = useWebSocketStore()
  const uiStore = useUiStore()
  const jobStore = useJobStore()

  const switchButtonText = computed(() => {
    return userStore.isSwitching ? '正在切换中...' : (hasActivatedRole ? "切换角色" : "选择角色")
  })

  const cooldownTime = ref(0)
  let timer = null
  watch(
  () => userStore.currentRole.rid,
  () => {
    console.log("角色切换", userStore.currentRole.rid)
    if (timer) clearInterval(timer)
    
    // 设置初始值
    cooldownTime.value = Math.max(0, Math.ceil((userStore.SWITCH_COOLDOWN * 1000 - (Date.now() - Number(userStore.lastRoleChange))) / 1000))
    // 如果冷却时间大于0，启动计时器
    if (cooldownTime.value > 0) {
      timer = setInterval(() => {
        cooldownTime.value -= 1
        if (cooldownTime.value <= 0) {
          cooldownTime.value = 0
          clearInterval(timer)
          timer = null
        }
      }, 1000)
    }
  },
  { immediate: true }
)

  // 判断是否有角色已经被激活
  const hasActivatedRole = computed(() => {
    return userStore.currentRole.rid >= 0
  })

  // 创建新角色相关逻辑
  const showCreateDialog = ref(false)
  const newRoleName = ref("")
  const selectedJob = ref(null)
  const nameError = ref("")

  const isValidRoleName = computed(() => {
    nameError.value = ""
    const name = newRoleName.value.trim()

    if (name.length < 2 || name.length > 8) {
      nameError.value = "长度需为2-8个字符"
      return false
    }

    // 检查是否符合正则表达式
    const pattern = /^[A-Za-z0-9\u4e00-\u9fa5]+$/
    if (!pattern.test(name)) {
      nameError.value = "只能包含中英文和数字"
      return false
    }

    return true
  })

  function openCreateDialog() {
      showCreateDialog.value = true
      newRoleName.value = ""
      nameError.value = ""
  }

  function closeCreateDialog() {
    showCreateDialog.value = false
  }

  function createRole() {
    if (selectedJob.value === null || selectedJob.value === undefined) {
      uiStore.addDialog("warning", "请选择职业")
      return
    }

    if (!isValidRoleName.value) {
      uiStore.addDialog("warning", nameError.value || "角色名不符合要求")
      return
    }
    userStore.sendCreateRole(newRoleName.value.trim(), selectedJob.value)
    closeCreateDialog()
  }

  // 组件挂载时初始化
  onMounted(() => {
  })
</script>

<style scoped>
.role-choice {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.game-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  width: 100%;
  max-width: 1300px;
  margin: 0 auto;
}

.role-card,
.create-card {
  min-height: 220px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  min-width: 0;
  justify-content: space-between;
  position: relative;
}

.role-card:hover,
.create-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.card-content {
  padding: 15px;
  display: flex;
  flex-direction: column;
  height: 160px; /* 固定高度，确保所有卡片内容区一致 */
  justify-content: flex-start; /* 内容顶部对齐 */
  flex-grow: 1;
  overflow: hidden;
}

.role-info {
  margin-top: auto; /* 关键：将内容推到底部 */
  text-align: center;
  padding-top: 8px;
  border-top: 1px solid #eee; /* 可选：加个分隔线更清晰 */
  font-size: 0.9rem;
  color: #666;
}

.role-card h3,
.create-card h3 {
  margin: 0 0 10px;
  font-size: 1.2rem;
  color: #333;
  text-align: center;
}

.role-card p,
.create-card p {
  margin: 5px 0;
  font-size: 0.9rem;
  color: #666;
  text-align: center;
}

.create-card {
  border: 2px dashed #dee2e6;
  background-color: #f8f9fa;
  cursor: pointer;
  justify-content: center;
}

.create-card h3 {
  font-size: 2rem;
  color: #6c757d;
  margin-bottom: 5px;
}

.switch-btn {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 10px;
  background-color: #4a89dc;
  color: white;
  border: none;
  border-radius: 0 0 10px 10px;
  cursor: pointer;
  transition: background-color 0.2s ease, opacity 0.3s ease;
  font-weight: 500;
  opacity: 0;
  z-index: 1;
}

.switch-btn:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.role-card:hover .switch-btn {
  opacity: 1;
}

.cooldown-text {
  margin-left: 5px;
  color: #ff6b6b;
}

.role-card.active {
  color: #fff;
  position: relative;
  box-shadow: 0 0 20px rgba(61, 44, 206, 0.6);
}

/* 创建角色模态框样式 */
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
  padding: 25px;
  border-radius: 10px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  max-height: 80vh;
  overflow-y: auto;
}

.modal-title {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
  font-size: 1.3rem;
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.input-group input {
  width: 90%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.input-group input:focus {
  border-color: #4a89dc;
  outline: none;
  box-shadow: 0 0 0 2px rgba(74, 137, 220, 0.2);
}

.character-count {
  text-align: right;
  font-size: 0.8rem;
  color: #888;
  margin-top: 4px;
}

.error-text {
  color: #ff4d4f;
  margin-left: 10px;
}

.job-selection {
  margin-bottom: 25px;
}

.job-selection label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.job-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.job-option {
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  min-height: 120px;
  padding-top: 20px;
}

.job-option:hover {
  background-color: #f5f7fa;
}

.job-option.selected {
  border-color: #4a89dc;
  background-color: #ebf2fd;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(74, 137, 220, 0.2);
}

.icon-wrapper {
  height: 90px; /* 固定高度，统一所有卡片图标区域 */
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 8px;
}

.job-icon {
  max-width: 80px;
  max-height: 70px; /* 真正限制图片大小 */
  width: auto;
  height: auto;
  object-fit: contain; /* 保持比例，完整显示 */
}

.job-name {
  font-weight: 600;
  margin-bottom: 5px;
  text-align: center;
}

.job-desc {
  font-size: 0.8rem;
  color: #666;
  text-align: center;
  margin: 0;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}

.confirm-btn,
.cancel-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: background-color 0.3s;
  min-width: 100px;
}

.confirm-btn {
  background-color: #4a89dc;
  color: white;
}

.confirm-btn:hover:not(:disabled) {
  background-color: #3a70c2;
}

.confirm-btn:disabled {
  background-color: #a0b8e0;
  cursor: not-allowed;
}

.cancel-btn {
  background-color: #f0f0f0;
  color: #555;
}

.cancel-btn:hover {
  background-color: #e0e0e0;
}
</style>