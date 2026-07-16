<template>
  <div
    v-if="isVisible"
    class="toast"
    :class="[typeClass, { 'item-tip': isItemTip }]"
    :style="itemTipStyle"
    @click="onToastClick"
  >
    <div v-if="isItemTip && itemTip" class="item-tip-content">
      <div class="tooltip-header">
        <span class="tooltip-name">{{ itemTip.name }}</span>
        <span v-if="itemTip.typeName" class="tooltip-type">{{ itemTip.typeName }}</span>
      </div>
      <div v-if="itemTip.attributes && itemTip.attributes.length > 0" class="tooltip-stats">
        <div v-for="(attr, index) in itemTip.attributes" :key="index" class="stat-item">
          {{ attr.text }}
        </div>
      </div>
      <div v-if="itemTip.description" class="tooltip-description" :class="{ 'with-divider': itemTip.attributes && itemTip.attributes.length > 0 }">
        {{ itemTip.description }}
      </div>
    </div>
    <div v-else class="toast-content" :class="{ 'reward-styled': type === 'reward' }">
      [{{ typeText }}] {{ message }}
    </div>
    <div v-if="!isItemTip" class="progress-bar" :style="progressStyle"></div>
  </div>
</template>

<script>
export default {
  name: 'Dialog',
  props: {
    message: { type: String, required: false, default: '' },
    type: { type: String, default: 'info' },
    duration: { type: Number, default: 3000 },
    prefix: { type: String, default: '' },
    itemTip: { type: Object, default: null },
    variant: { type: String, default: 'toast' }
  },
  data() {
    return {
      isVisible: true,
      progress: 100,
      intervalId: null
      ,
      // allow an actual duration that can be overridden for certain types
      actualDuration: this.duration
    }
  },
  computed: {
    isItemTip() {
      return this.variant === 'item-tip' && !!this.itemTip
    },
    typeClass() {
      return `toast-${this.type}`
    },
    typeText() {
      if (this.prefix) return this.prefix
      const textMap = {
        success: '成功',
        net: '网络',
        error: '错误',
        warning: '提示',
        info: '信息',
        reward: '奖励',
      }
      return textMap[this.type] || '信息'
    },
    progressStyle() {
      return {
        width: `${this.progress}%`,
        backgroundColor: this.getProgressColor(),
        height: this.getProgressHeight(),
        opacity: this.getProgressOpacity()
      }
    },
    itemTipStyle() {
      if (!this.isItemTip) return {}
      return {
        left: `${this.itemTip.x}px`,
        top: `${this.itemTip.y}px`,
        position: 'fixed'
      }
    }
  },
  methods: {
    getProgressColor() {
      const colors = {
        success: '#d4edda',
        error: '#f8d7da',
        warning: '#fff3cd',
        info: '#d1ecf1',
        // net uses contrasting progress color against dark background
        net: '#ffffff'
      }
      return colors[this.type] || colors.info
    },
    getProgressHeight() {
      return '4px'
    },
    getProgressOpacity() {
      return '1'
    },
    startCountdown() {
      const intervalDuration = 50
      const duration = this.actualDuration || this.duration
      const step = (intervalDuration / duration) * 100

      // initialize progress to full
      this.progress = 100

      this.intervalId = setInterval(() => {
        this.progress = Math.max(0, this.progress - step)
        if (this.progress <= 0) {
          this.isVisible = false
          clearInterval(this.intervalId)
        }
      }, intervalDuration)
    },

    // allow manual close for certain dialog types
    onToastClick() {
      if (this.type === 'net') {
        this.isVisible = false
        if (this.intervalId) {
          clearInterval(this.intervalId)
          this.intervalId = null
        }
      }
    }
  },
  mounted() {
    if (this.isItemTip) {
      this.isVisible = true
      return
    }

    // override duration for specific types
    if (this.type === 'net') {
      this.actualDuration = 999000
    } else {
      this.actualDuration = this.duration
    }

    this.startCountdown()
    setTimeout(() => {
      this.isVisible = false
    }, this.actualDuration)
  },
  beforeUnmount() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }
}
</script>

<style scoped>
.toast {
  position: relative;
  padding: 6px 12px;
  border-radius: 4px;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.8);
  opacity: 0.8;
  margin-bottom: 10px;
  min-width: 200px;
  max-width: 400px;
  width: fit-content;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  white-space: pre-line;
  text-align: left;
  border: 1px solid rgba(0, 0, 0, 0.1);
  pointer-events: none;
  font-size: 13px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1); /* 内阴影，增加层次 */
}

.toast-content {
  word-break: break-word;
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  width: 100%;
  background-color: rgba(255, 255, 255, 0.3);
  transition: width linear;
  transition-duration: 0.1s;
  border-radius: 0 0 4px 4px;
}

/* 各类型对话框的底色和文字颜色 */
.toast.item-tip {
  position: fixed;
  min-width: 220px;
  max-width: 300px;
  padding: 12px;
  border-radius: 4px;
  background-color: rgba(230, 230, 230, 0.95);
  color: #1f2937;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1);
  z-index: 10000;
  pointer-events: none;
  white-space: normal;
}

.item-tip-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.3);
}

.tooltip-name {
  font-size: clamp(14px, 1.5vmin, 16px);
  font-weight: bold;
  color: #1e40af;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  flex: 1;
  text-align: center;
}

.tooltip-type {
  font-size: clamp(11px, 1.2vmin, 12px);
  color: #64748b;
  white-space: nowrap;
}

.tooltip-description {
  font-size: clamp(11px, 1.2vmin, 13px);
  color: #475569;
  line-height: 1.6;
  white-space: pre-line;
}

.tooltip-description.with-divider {
  padding-top: 8px;
  border-top: 1px solid rgba(59, 130, 246, 0.2);
}

.tooltip-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-item {
  font-size: clamp(11px, 1.2vmin, 13px);
  color: #059669;
  font-weight: 500;
}

.stat-item::before {
  content: "• ";
  color: #10b981;
  font-weight: bold;
}

.toast-success { 
  background-color: #4caf50; 
  color: #fff;
}
.toast-error { 
  background-color: #f44336; 
  color: #fff;
}
.toast-warning { 
  background-color: #ff9800; 
  color: #fff;
}
.toast-info { 
  background-color: #2196f3; 
  color: #fff;
}
.toast-reward { 
  background-color: #ffffff; 
  color: #000;
  font-weight: 600;
}
.toast-net {
  background-color: #000000;
  color: #ffffff;
  pointer-events: auto;
  cursor: pointer;
}
</style>