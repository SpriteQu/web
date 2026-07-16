<template>
  <div class="village-container">
    <!-- 单级分类导航位于下方 -->
    <div v-if="currentTypeList.length" class="type-nav">
      <button v-for="type in currentTypeList" :key="type.id" :class="['type-button', { active: activeTypeId === type.id }]" @click="setActiveTypeId(type.id)">
        {{ type.name_chs }}
      </button>
    </div>
    <div v-else class="loading-text">加载中...</div>

    <!-- 项目列表 -->
    <div v-if="currentItemList.length" class="cards-grid">
      <div v-for="item in currentItemList" :key="item.id" class="card-item">
        <div class="card-name">{{ item.name_chs }}</div>
        <div class="card-image-large">
          <img :src="villageStore.getVillageIcon(item.id)" :alt="item.name_chs" @error="handleImageError" />
        </div>
        
        <!-- 所有活动类型都显示产物 -->
        <div v-if="item.product" class="product-section">
          <span class="product-label">可能产出:</span>
          <div class="product-output-list">
            <div v-for="product in getProductItems(item.product)" :key="product.id" class="product-output-item">
              <div class="small-image-item">
                <img :src="itemStore.getItemIcon(product.id)" :alt="itemStore.getItemName(product.id)" :title="itemStore.getItemName(product.id)" @error="handleImageError" />
              </div>
              <span class="product-name"></span>
            </div>
          </div>
        </div>
        
        <!-- 详细信息区域 - 所有活动类型都显示 -->
        <div class="card-info">
          <div class="info-item">等级需求: {{ item.level }} 经验: {{ item.exp }}</div>
          <div class="info-item">耗时: {{ formatTime(item.time) }}</div>
          
          <!-- 制作特有：消耗物品清单 -->
          <div v-if="currentType?.class === 2 && item.materials && item.materials.length > 0" class="materials-section">
            <div class="materials-title">需要材料:</div>
            <div class="materials-list">
              <div v-for="(material, index) in item.materials" :key="index" class="material-item">
                <img :src="itemStore.getItemIcon(material.itemId)" :alt="itemStore.getItemName(material.itemId)" :title="itemStore.getItemName(material.itemId)" class="material-icon" @error="handleImageError" />
                <span class="material-count">x{{ material.count }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <button class="card-button" @click="handleActivityAction(item.id)" :title="item.description">
          {{ currentType?.verb || '操作' }}
        </button>
      </div>
    </div>
    <div v-else-if="currentTypeList.length" class="empty-tip">
      当前类型下没有数据
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useVillageStore } from '@/stores/villageStore'
import { useActionStore } from '@/stores/actionStore'
import { useItemStore } from '@/stores/itemStore'
import { handleImageError } from '@/assets/public'

const villageStore = useVillageStore()
const actionStore = useActionStore()
const itemStore = useItemStore()

const activeTypeId = ref(null)

const setActiveTypeId = (typeId) => {
  activeTypeId.value = typeId
}

const getItemName = computed(() => { return (itemId) => itemStore.itemData[itemId]?.name_chs || itemStore.equipmentData[itemId]?.name_chs || itemId })

// 当前分类列表（从 store 的 villageTypeData）
const currentTypeList = computed(() => Object.values(villageStore.villageTypeData || {}))
const currentType = computed(() => currentTypeList.value.find(type => type.id === activeTypeId.value))

// 当前分类下的数据列表
const currentItemList = computed(() => {
  if (!activeTypeId.value) return []
  const items = Object.values(villageStore.villageData || {})
  return items.filter(item => item.type_id === activeTypeId.value)
})


const handleActivityAction = (itemId) => {
  const item = villageStore.villageData[itemId]
  const typeId = item.type_id
  const typeInfo = villageStore.villageTypeData[typeId]
  console.log('准备发送action申请', itemId, typeInfo.class)
  actionStore.sendVillageAction(itemId, typeInfo.class)
}

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes === 0) {
    return `${secs}秒`
  }else if (secs === 0) {
    return `${minutes}分`
  }
  return `${minutes}分${secs}秒`
}

// 解析 product 字段，获取所有产物信息
const getProductItems = (productStr) => {
  if (!productStr) return []

  return productStr.split(',').map(item => {
    const [id, rate] = item.split('|')
    return {
      id: parseInt(id),
      rate: rate ? parseFloat(rate) : 0
    }
  }).filter(item => !Number.isNaN(item.id))
}

onMounted(async () => {
  await villageStore.loader()
  // 默认选中第一个活动类型的第一个分类
  const typeList = Object.values(villageStore.villageTypeData || {})
  if (typeList.length > 0) {
    activeTypeId.value = typeList[0].id
  }
})
</script>

<style scoped>
.village-container {
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
  color: #1f2937;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background-color: #e5e7eb;
  transform: translateY(-1px);
}

.tab-button.active {
  background-color: #3b82f6;
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

/* 活动类型导航（采集/制作/探索） */
.activity-type-nav {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.activity-type-button {
  padding: 10px 24px;
  border: 2px solid transparent;
  border-radius: 8px;
  background-color: #f9fafb;
  cursor: pointer;
  font-weight: 600;
  font-size: 15px;
  color: #4b5563;
  transition: all 0.2s ease;
}

.activity-type-button:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.activity-type-button.active {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.type-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 28px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.type-button {
  padding: 8px 20px;
  border: none;
  border-radius: 20px;
  background-color: #f3f4f6;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  color: #4b5563;
  transition: all 0.2s ease;
}

.type-button:hover {
  background-color: #e5e7eb;
  transform: translateY(-1px);
}

.type-button.active {
  background-color: #3b82f6;
  color: white;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}

.cards-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  justify-content: flex-start;
}

.card-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  width: 200px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.card-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

.card-name {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
  text-align: center;
  word-break: break-word;
}

.card-image-large {
  width: 120px;
  height: 120px;
  margin: 8px 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f9fafb;
  border-radius: 8px;
  overflow: hidden;
}

.card-image-large img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

.card-images-small {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  flex-wrap: wrap;
}

.small-image-item {
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f3f4f6;
  border-radius: 6px;
  overflow: hidden;
}

.small-image-item img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

.product-section {
  margin: 8px 0;
  padding: 8px;
  background-color: #f9fafb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.product-output-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

.product-output-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  background-color: #f3f4f6;
  border-radius: 6px;
}

.product-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
}

.card-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin: 8px 0;
  width: 100%;
}

.info-item {
  font-size: 13px;
  color: #6b7280;
  text-align: center;
}

.materials-section {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
  width: 100%;
}

.materials-title {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  margin-bottom: 6px;
}

.materials-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.material-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.material-icon {
  width: 24px;
  height: 24px;
  max-width: 24px;
  max-height: 24px;
  object-fit: contain;
}

.material-count {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

.card-button {
  margin-top: 12px;
  padding: 8px 20px;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 80%;
}

.card-button:hover {
  background-color: #059669;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.loading-text,
.empty-tip {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  font-size: 16px;
  font-style: italic;
}

@media (max-width: 768px) {
  .village-container {
    padding: 16px;
  }
  
  .tab-content {
    padding: 16px;
    min-height: 300px;
  }
  
  .tab-button {
    padding: 8px 16px;
    font-size: 13px;
  }
  
  .activity-type-button {
    padding: 8px 16px;
    font-size: 13px;
  }
  
  .type-button {
    padding: 6px 14px;
    font-size: 12px;
  }
  
  .cards-grid {
    justify-content: center;
  }
  
  .card-item {
    width: 160px;
    padding: 16px 12px;
  }
  
  .card-name {
    font-size: 15px;
  }
  
  .card-image-large {
    width: 100px;
    height: 100px;
  }
}
</style>