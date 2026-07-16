<template>
  <div class="bag-container">
    <!-- 左侧：背包 -->
    <div class="bag-left">
      <div class="bag-header">
        <h2>{{ activeCategory === 'equipment' ? '装备背包' : '物品背包' }}</h2>
        <div class="category-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="category-tab"
            :class="{ active: activeCategory === tab.key }"
            @click="activeCategory = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>
      <div v-if="!currentDisplayItems.length" class="empty-bag">
        {{ activeCategory === 'equipment' ? '装备背包空空如也...' : '背包空空如也...' }}
      </div>
      <div v-else class="item-grid-wrapper custom-scrollbar">
        <div class="grid-container">
          <div v-for="item in currentDisplayItems" :key="item.id" class="item-card" @click.stop="onItemClick(item, $event)" @mouseenter="showItemTooltip(item, $event)" @mouseleave="hideItemTooltip">
            <img :src="getDisplayItemIcon(item)" :alt="getDisplayItemName(item)" class="item-icon" @error="handleImageError" />
            <div class="quantity-badge">{{ item.quantity }}</div>
            <div class="item-name">{{ getDisplayItemName(item) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：装备栏 -->
    <div class="role-right">
      <div class="role-header">
        <h2>装备栏</h2>
      </div>
      <div class="equipment-grid-wrapper custom-scrollbar">
        <div class="equipment-grid">
          <template v-for="equip in enabledEquipments" :key="equip.id">
            <div
              v-for="(pos, index) in equip.positions"
              :key="`${equip.id}-${index}`"
              class="equipment-slot item-card"
              :style="{ gridRow: pos.row, gridColumn: pos.col }"
              @click.stop="onItemClick({ ...equip, source: 'equipment-slot' }, $event)"
              @mouseenter="showItemTooltip({ ...equip, source: 'equipment-slot' }, $event)"
              @mouseleave="hideItemTooltip"
            >
              <img
                v-if="getEquipmentSlotEquipmentId(equip.id)"
                :src="getEquipmentSlotIcon(equip.id)"
                :alt="getEquipmentSlotName(equip.id)"
                class="item-icon"
                @error="handleImageError"
              />
              <span v-else class="slot-text">{{ equip.name_chs }}</span>
              <div v-if="getEquipmentSlotEquipmentId(equip.id)" class="item-name">{{ getEquipmentSlotName(equip.id) }}</div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>

  <!-- 物品菜单 -->
  <div v-if="showMenu" class="item-menu" :style="{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }" @click.stop>
    <div
      v-for="option in menuOptions"
      :key="option.key"
      class="menu-item"
      :class="{ disabled: option.disabled }"
      @click="!option.disabled && option.event()"
    >
      {{ option.label }}
    </div>
  </div>

</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useItemStore } from '@/stores/itemStore'
import { useUiStore } from '@/stores/uiStore'
import { handleImageError } from '@/assets/public'

// 访问 store 中的 getEquipmentTypeId
const itemStore = useItemStore()

const userStore = useUserStore()
const uiStore = useUiStore()
// 已在上方初始化

//使用计算属性封装逻辑
const bag = computed(() => {
  const bagData = userStore.currentRole?.bag || {}
  return Object.values(bagData)
})
const equipmentBag = computed(() => {
  const equipmentData = userStore.currentRole?.equipmentBag || {}
  return Object.values(equipmentData)
})
const activeCategory = ref('item')
const tabs = [
  { key: 'item', label: '物品' },
  { key: 'equipment', label: '装备' }
]

const currentDisplayItems = computed(() => {
  return activeCategory.value === 'equipment' ? equipmentBag.value : bag.value
})

// 根据 item_id 获取物品名称
const getItemName = (item_id) => { 
  return itemStore.itemData[item_id]?.name_chs ?? `${item_id}` 
}

const getEquipmentName = (item_id) => {
  return itemStore.equipmentData[item_id]?.name_chs ?? `${item_id}`
}

const getDisplayItemName = (item) => {
  return activeCategory.value === 'equipment' ? getEquipmentName(item.id) : getItemName(item.id)
}

const getDisplayItemIcon = (item) => {
  return activeCategory.value === 'equipment' ? itemStore.getEquipmentIcon(item.id) : itemStore.getItemIcon(item.id)
}

const getCurrentCategoryData = (item) => {
  if (item?.source === 'equipment-slot') {
    const equipmentId = getEquipmentSlotEquipmentId(item.id) || item.equipmentId || item.id
    return equipmentId ? itemStore.equipmentData[equipmentId] : null
  }
  return activeCategory.value === 'equipment' ? itemStore.equipmentData[item.id] : itemStore.itemData[item.id]
}

// 装备相关
const enabledEquipments = computed(() => Object.values(itemStore.equipmentSlotData).filter(e => e.enable === 1))

const getEquipmentSlotEquipmentId = (slotId) => {
  const wear = userStore.currentRole?.wear || {}
  const value = wear[slotId]

  if (value == null) return null
  if (typeof value === 'object') {
    return value.equipmentId ?? value.id ?? null
  }

  return Number(value)
}

const getEquipmentSlotIcon = (slotId) => {
  const equipmentId = getEquipmentSlotEquipmentId(slotId)
  if (!equipmentId) return ''
  return itemStore.getEquipmentIcon(equipmentId)
}

const getEquipmentSlotName = (slotId) => {
  const equipmentId = getEquipmentSlotEquipmentId(slotId)
  if (!equipmentId) return ''
  return itemStore.equipmentData[equipmentId]?.name_chs ?? `${equipmentId}`
}

// 菜单相关状态
const showMenu = ref(false)
const menuPosition = ref({ x: 0, y: 0 })
const selectedItem = ref(null)

// 菜单项列表
const menuOptions = ref([])

// 物品点击事件
const onItemClick = (item, event) => {
  const itemData = getCurrentCategoryData(item)
  showMenu.value = true
  
  // 计算菜单位置：基于物品格子中心靠右下2/3处（内部）
  const target = event.target.closest('.item-card')
  if (target) {
    const rect = target.getBoundingClientRect()
    // 左上角位置：格子中心 + 宽高各1/6的偏移（即从中心向右下移动1/3，这样菜单左上角就在2/3处）
    menuPosition.value = { 
      x: rect.left + rect.width / 2 + rect.width / 6, 
      y: rect.top + rect.height / 2 + rect.height / 6
    }
  } else {
    // 降级方案：使用鼠标位置
    menuPosition.value = { x: event.clientX, y: event.clientY }
  }
  
  selectedItem.value = item

  // 动态生成菜单项
  const options = []
  const isEquipmentSlot = item?.source === 'equipment-slot'

  if (isEquipmentSlot) {
    options.push({ key: 'take_off', label: '脱下', event: () => takeOffEquipment(item.id), disabled: false })
    menuOptions.value = options
    return
  }

  if (activeCategory.value === 'equipment') {
    options.push({ key: 'equip', label: '装备', event: () => equipItem(item.id), disabled: false })
    menuOptions.value = options
    return
  }

  const isRegularItem = !item?.source && activeCategory.value !== 'equipment'
  if (isRegularItem && itemData && itemData.available === 1) {
    options.push({ key: 'use', label: '使用', event: useItem, disabled: false })
  }

  if (options.length === 0) {
    options.push({ key: 'none', label: '无操作', event: () => {}, disabled: true })
  }

  menuOptions.value = options
}

// 使用物品
const useItem = () => {
  console.log('使用物品', selectedItem.value)
  showMenu.value = false
}

const equipItem = (equipmentId) => {
  if (equipmentId != null) {
    userStore.sendPutOnEquipment(Number(equipmentId))
  }
  showMenu.value = false
}

const takeOffEquipment = (slotId) => {
  if (slotId != null) {
    userStore.sendTakeOffEquipment(Number(slotId))
  }
  showMenu.value = false
}

const clearMenu = () => {
  showMenu.value = false
  selectedItem.value = null
  menuOptions.value = []
}

// 隐藏菜单
const hideMenu = () => {
  clearMenu()
}

// 显示物品信息提示框
const showItemTooltip = (item, event) => {
  const target = event.target.closest('.item-card')
  if (!target) return

  const rect = target.getBoundingClientRect()
  const x = rect.right + 10
  const y = rect.top

  const itemId = item?.source === 'equipment-slot'
    ? (getEquipmentSlotEquipmentId(item.id) || item.equipmentId || item.id)
    : item?.id

  if (itemId == null) return

  uiStore.addItemTip(x, y, itemId)
}

// 隐藏物品信息提示框
const hideItemTooltip = () => {
  uiStore.removeItemTip()
}

// 全局点击监听
const handleGlobalClick = (event) => {
  if (!event.target.closest('.item-menu')) {
    hideMenu()
  }
}

onMounted(async () => {
  document.addEventListener('click', handleGlobalClick)
  await itemStore.loader()
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})
</script>

<style scoped>
.bag-container {
  display: flex;
  flex-direction: row;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  padding: 20px;
  gap: 20px;
  overflow: hidden;
}

.bag-left,
.role-right {
  background-color: #f9f9f9;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bag-left {
  flex: 2;
  min-height: 0;
  padding: 15px;
}

.bag-header {
  padding: 0 10px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-tabs {
  display: flex;
  gap: 8px;
}

.category-tab {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-tab:hover {
  border-color: #60a5fa;
  color: #2563eb;
}

.category-tab.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.item-grid-wrapper {
  flex-grow: 1;
  overflow-y: auto;
  padding: 8px;
  background-color: #f0f4f8;
  border: 1px solid #dce3e8;
  border-radius: 8px;
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.05);
}

/* 将背包列数设为 10，保持与装备栏 5 列相同的格子尺寸（左侧宽度是右侧的两倍） */
.grid-container {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  grid-auto-rows: auto; /* 行高根据内容自动计算，不拉伸导致间距放大 */
  gap: 5px;
}

.role-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 15px;
}

.role-header {
  padding: 0 10px 10px;
}

/* 新增：装备栏外层容器，复用 item-grid-wrapper 样式 */
.equipment-grid-wrapper {
  flex-grow: 1;
  overflow-y: auto;
  padding: 8px;
  background-color: #f0f4f8;
  border: 1px solid #dce3e8;
  border-radius: 8px;
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.05);
}

/* 修改：装备网格容器，使用与 grid-container 相同的策略 */
.equipment-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr)); /* 与左侧保持一致，允许灵活缩放 */
  grid-auto-rows: auto; /* 使用 auto 让行高根据 aspect-ratio 自动计算，确保响应式缩放 */
  gap: 5px;
  align-items: start;
}

/* 合并两个格子的基础样式（保证相同尺寸与交互） */
.equipment-slot,
.item-card {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1; /* 使用 aspect-ratio 保持正方形，避免高度被内容推高 */
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: box-shadow 0.18s ease;
  display: block;
}

.item-card {
  cursor: pointer;
}

.slot-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  /* 使用 vmin 使文字随容器等比缩放（在窗口纵向/横向变化时更一致） */
  font-size: clamp(10px, 1.8vmin, 14px);
  color: #999;
  text-align: center;
  transition: transform 0.18s ease;
}

.item-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: auto;
  height: auto;
  max-width: 70%;
  max-height: 70%;
  object-fit: contain;
  transition: transform 0.18s ease;
}

.equipment-slot:hover,
.item-card:hover {
  /* 不对格子容器进行缩放，避免影响 grid gap */
  z-index: 2;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.quantity-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: clamp(10px, 1.2vmin, 12px);
  padding: 2px 6px;
  border-radius: 4px;
  z-index: 2;
}

.item-name {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  width: 90%;
  font-size: clamp(9px, 1.1vmin, 11px);
  color: #333;
  text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.9), -1px -1px 2px rgba(255, 255, 255, 0.9), 1px -1px 2px rgba(255, 255, 255, 0.9), -1px 1px 2px rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 1;
  pointer-events: none;
}

/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background-color: transparent;
}

/* 物品菜单样式 */
.item-menu {
  position: fixed;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 100px;
}

.menu-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.menu-item.disabled {
  color: #999;
  cursor: default;
  background-color: #f4f4f4;
}

</style>
