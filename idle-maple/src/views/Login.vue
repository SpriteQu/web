<template>
  <div class="login-container" :style="{ backgroundImage: `url(${getBgImage()})` }">
    <div class="auth-box">
      <div class="auth-header">
        <h1>{{ isLoginMode ? '欢迎回来' : '创建账号' }}</h1>
      </div>
      <form @submit.praction="handleSubmit" class="auth-form">
        <!-- 用户名输入 -->
        <div class="form-group" :class="{ 'has-error': errors.username }">
          <label for="username">
            用户名
            <span class="error-text" v-if="errors.username">{{ errors.username }}</span>
          </label>
          <input id="username" v-model="form.username" type="text" required placeholder="请输入用户名"
            @blur="validateUsername(false)" @focus="clearError('username')" />
        </div>

        <!-- 密码输入 -->
        <div class="form-group" :class="{ 'has-error': errors.password }">
          <label for="password">
            密码
            <span class="error-text" v-if="errors.password">{{ errors.password }}</span>
          </label>
          <input id="password" v-model="form.password" type="password" required placeholder="请输入密码"
            @blur="validatePassword(false)" @focus="clearError('password')" />
        </div>

        <!-- 表单级错误提示 -->
        <div class="error-message-placeholder">
          <div v-if="formError" class="error-message">{{ formError }}</div>
        </div>

        <!-- 提交按钮 -->
        <button type="submit" class="submit-btn" :disabled="loading || hasErrors">
          {{ loading ? '处理中...' : isLoginMode ? '登录' : '注册' }}
        </button>
      </form>

      <!-- 切换模式 -->
      <div class="toggle-mode">
        <span>{{ isLoginMode ? '没有账号？' : '已有账号？' }}</span>
        <button @click="toggleMode" class="toggle-btn">
          {{ isLoginMode ? '注册' : '登录' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import config from '@/config'
import { useRouter } from 'vue-router'

const router = useRouter()
import bgImage from '@/assets/bg001.jpg'
const getBgImage = () => {
  return bgImage
}

// 响应式数据
const isLoginMode = ref(true)
const loading = ref(false)
const formError = ref('')
const isCheckingUsername = ref(false)

// 表单数据
const form = reactive({
  username: '',
  password: ''
})

// 错误信息
const errors = reactive({
  username: '',
  password: ''
})

// 用户名预检缓存
const usernameCheckCache = reactive({
  available: {}, // 可用的用户名
  unavailable: {} // 不可用的用户名及原因
})

const hasErrors = computed(() => {
  return Object.values(errors).some(error => error !== '')
})

// 方法
const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value
  formError.value = ''
  resetForm()
  clearAllErrors()
}

const resetForm = () => {
  form.username = ''
  form.password = ''
}

const clearAllErrors = () => {
  errors.username = ''
  errors.password = ''
}

const clearError = (field) => {
  errors[field] = ''
  formError.value = ''
}

const validateUsername = async (isSubmit = false) => {
  const { username } = form
  if (!username) {
    errors.username = isSubmit ? '请输入用户名' : ''
    return !isSubmit // 非提交时为空不算错误
  }

  if (username.length < 6 || username.length > 16) {
    errors.username = '用户名长度需在6-16个字符之间'
    return false
  }

  if (/^\d+$/.test(username)) {
    errors.username = '用户名不能为纯数字'
    return false
  }

  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    errors.username = '用户名只能包含字母和数字'
    return false
  }

  // 如果是注册模式且不是提交操作，进行用户名预检
  if (!isLoginMode.value && !isSubmit) {
    return await preCheckUsername()
  }

  errors.username = ''
  return true
}

// 用户名预检方法
const preCheckUsername = async () => {
  if (isCheckingUsername.value) return false
  
  const username = form.username.trim()
  isCheckingUsername.value = true

  // 检查缓存
  if (usernameCheckCache.available[username]) {
    errors.username = ''
    isCheckingUsername.value = false
    return true
  }

  if (usernameCheckCache.unavailable[username]) {
    errors.username = `用户名不可用：${usernameCheckCache.unavailable[username]}`
    isCheckingUsername.value = false
    return false
  }

  try {
    const response = await fetch(
      `${config.apiUrl}${config.apiPath.precheck}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      }
    )

    const result = await response.json()

    if (result.success) {
      errors.username = ''
      usernameCheckCache.available[username] = true
      isCheckingUsername.value = false
      return true
    } else {
      const errorMsg = result.message || '用户名不可用'
      errors.username = `用户名不可用：${errorMsg}`
      usernameCheckCache.unavailable[username] = errorMsg
      isCheckingUsername.value = false
      return false
    }
  } catch (error) {
    console.error('用户名预检失败:', error)
    // 预检失败不影响表单提交，只记录错误
    isCheckingUsername.value = false
    return true
  }
}

const validatePassword = (isSubmit = false) => {
  const { password } = form
  if (!password) {
    errors.password = isSubmit ? '请输入密码' : ''
    return !isSubmit
  }

  if (password.length < 8 || password.length > 20) {
    errors.password = '密码长度需在8-20个字符之间'
    return false
  }

  if (!/^[a-zA-Z0-9]+$/.test(password)) {
    errors.password = '密码只能包含字母和数字'
    return false
  }

  errors.password = ''
  return true
}

const validateForm = () => {
  let isValid = true
  // 提交时强制验证所有字段，并显示所有错误
  isValid = validateUsername(true) && isValid
  isValid = validatePassword(true) && isValid
  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return // 错误信息已经显示在各字段旁边
  }

  loading.value = true
  formError.value = ''

  try {
    const url = isLoginMode.value
      ? `${config.apiUrl}${config.apiPath.login}`
      : `${config.apiUrl}${config.apiPath.register}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: form.username,
        password: form.password
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || '请求失败')
    }

    if (result.success) {
      if (isLoginMode.value) {
        // 存储认证信息
        localStorage.setItem("uid", result.uid)
        localStorage.setItem("token", result.token)
        localStorage.setItem("expire_time", result.expire_time)
        // 使用 Vue Router 跳转
        router.push('/')
        // 显示成功消息
        formError.value = "登录成功"
      } else {
        formError.value = "注册成功"
        setTimeout(() => {
          isLoginMode.value = true
          formError.value = ''
          resetForm()
          clearAllErrors()
        }, 2000)
      }
    } else {
      formError.value = result.message || (isLoginMode.value ? "登录失败" : "注册失败")
      console.error("操作失败:", result.message)
    }
  } catch (error) {
    console.error("请求出错:", error)
    formError.value = error.message || (isLoginMode.value ? "登录时发生网络错误" : "注册时发生网络错误")
  } finally {
    loading.value = false
  }
}

// const loadBackground = async () => {
//   try {
//     await new Promise(resolve => setTimeout(resolve, 1000))
//     backgroundImage.value = `${config.staticUrl}${config.apiPath.res}?${assets.assets_list.login_bg}`
//   } catch (err) {
//     console.error('加载背景失败:', err)
//     backgroundImage.value = '' // 失败时使用默认背景
//   }
// }

// 生命周期
onMounted(() => {
})
</script>

<style scoped>
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.login-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: background-image 0.5s ease;
  background-color: rgba(255, 255, 255, 0.7);
  overflow: hidden;
}

.auth-box {
  width: 480px;
  padding: 1.2rem 2rem;
  background: rgba(255, 255, 255, 0.45);
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(31, 38, 135, 0.15);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  margin: 20px;
  box-sizing: border-box;
}

.auth-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.auth-header h1 {
  color: #2c3e50;
  font-size: 1.8rem;
  font-weight: 600;
  text-shadow:
    -1px -1px 0 #fff,
    1px -1px 0 #fff,
    -1px 1px 0 #fff,
    1px 1px 0 #fff;
  margin: 0.5rem 0;
}

.auth-form {
  margin-bottom: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.form-group {
  margin-bottom: 1rem;
  width: 80%;
}

.form-group label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
  color: #2c3e50;
  font-weight: 500;
  text-shadow:
    -1px -1px 0 rgba(255, 255, 255, 0.7),
    1px -1px 0 rgba(255, 255, 255, 0.7),
    -1px 1px 0 rgba(255, 255, 255, 0.7),
    1px 1px 0 rgba(255, 255, 255, 0.7);
}

.error-text {
  color: #e74c3c;
  font-size: 0.8rem;
  font-weight: normal;
  text-shadow: none;
}

.form-group input {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #dfe6e9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
  background-color: rgba(255, 255, 255, 0.7);
  box-sizing: border-box;
}

.form-group.has-error input {
  border-color: #e74c3c;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.submit-btn {
  width: 80%;
  padding: 0.6rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
  text-shadow:
    -1px -1px 0 rgba(0, 0, 0, 0.1),
    1px -1px 0 rgba(0, 0, 0, 0.1),
    -1px 1px 0 rgba(0, 0, 0, 0.1),
    1px 1px 0 rgba(0, 0, 0, 0.1);
  margin-top: 0.5rem;
  box-sizing: border-box;
}

.submit-btn:hover {
  background-color: #2980b9;
}

.submit-btn:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.toggle-mode {
  text-align: center;
  margin-top: 1rem;
  color: #7f8c8d;
  text-shadow:
    -1px -1px 0 rgba(255, 255, 255, 0.7),
    1px -1px 0 rgba(255, 255, 255, 0.7),
    -1px 1px 0 rgba(255, 255, 255, 0.7),
    1px 1px 0 rgba(255, 255, 255, 0.7);
}

.toggle-btn {
  background: none;
  border: none;
  color: #3498db;
  cursor: pointer;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.3s;
  text-shadow:
    -1px -1px 0 rgba(255, 255, 255, 0.7),
    1px -1px 0 rgba(255, 255, 255, 0.7),
    -1px 1px 0 rgba(255, 255, 255, 0.7),
    1px 1px 0 rgba(255, 255, 255, 0.7);
}

.toggle-btn:hover {
  background-color: rgba(52, 152, 219, 0.1);
}

.error-message-placeholder {
  min-height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80%;
}

.error-message {
  width: 100%;
  padding: 0.6rem;
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  border-radius: 8px;
  text-align: center;
  text-shadow:
    -1px -1px 0 rgba(255, 255, 255, 0.7),
    1px -1px 0 rgba(255, 255, 255, 0.7),
    -1px 1px 0 rgba(255, 255, 255, 0.7),
    1px 1px 0 rgba(255, 255, 255, 0.7);
  margin: 0.5rem 0;
  box-sizing: border-box;
}

@media (max-width: 480px) {
  .auth-box {
    width: calc(100% - 40px);
    padding: 1.2rem;
    margin: 20px;
  }

  .auth-header h1 {
    font-size: 1.5rem;
  }

  .form-group input {
    padding: 0.5rem;
  }

  .form-group,
  .submit-btn,
  .error-message-placeholder {
    width: 90%;
  }
}
</style>