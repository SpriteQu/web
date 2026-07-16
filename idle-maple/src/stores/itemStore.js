import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import config from '@/config'
import { useActionStore } from '@/stores/actionStore'

export const useItemStore = defineStore('item', () => {
  const actionStore = useActionStore()
  const itemTypeData = ref({})
  const equipmentTypeData = ref({})
  const itemData = ref({})
  const equipmentData = ref({})
  const equipmentSlotData = ref({})

  const loadItemType = async () => {
    try {
      const module = await import('@/data/item/item_type.json')
      const jsonData = module.default
      jsonData.data.forEach(itemType => {
        itemTypeData.value[itemType.id] = {
          id: itemType.id,
          name_chs: itemType.name_chs
        }
      })
    } catch (error) {
      console.error('加载物品类型数据失败:', error)
    }
  }

  const loadEquipmentType = async () => {
    try {
      const module = await import('@/data/item/equipment_type.json')
      const jsonData = module.default
      jsonData.data.forEach(equipmentType => {
        // console.log(equipmentType.id, equipmentType.name_chs, equipmentType.name_en, equipmentType.suit)
        equipmentTypeData.value[equipmentType.id] = {
          id: equipmentType.id,
          name_en: equipmentType.name_en,
          name_chs: equipmentType.name_chs,
          suit: equipmentType.suit
        }
      })
    } catch (error) {
      console.error('加载装备类型数据失败:', error)
    }
  }

  const loadItem = async () => {
    try {
      const module = await import('@/data/item/item.json')
      const jsonData = module.default
      jsonData.data.forEach(item => {
        let _attr = []
        if (item.attr) {
          item.attr.split(',').forEach(i => {
            const [key, value] = i.split('|')
            _attr.push({
              attr: key,
              value: parseInt(value)
            })
          })
        }
        itemData.value[item.id] = {
          id: item.id,
          name_chs: item.name_chs,
          type: item.type,
          icon: item.icon ?? String(item.id),
          attr: _attr,
          available: item.available,
          tradeType: item.trade,
          description: item.description ?? '',
        }
      })
    } catch (error) {
      console.error('加载物品数据失败:', error)
    }
  }

  // 装备也属于物品，但是有一些特有属性
  const loadEquipment = async () => {
    try {
      const module = await import('@/data/item/equipment.json')
      const jsonData = module.default
      jsonData.data.forEach(item => {
        let _attr = []
        if (item.attr) {
          item.attr.split(',').forEach(i => {
            const [key, value] = i.split('|')
            _attr.push({
              attr: key,
              value: parseInt(value)
            })
          })
        }
        let _req_attr = []
        if (item.req_attr) {
          item.req_attr.split(',').forEach(i => {
            const [key, value] = i.split('|')
            _req_attr.push({
              attr: key,
              value: parseInt(value)
            })
          })
        }
        equipmentData.value[item.id] = {
          id: item.id,
          name_chs: item.name_chs,
          type: item.type,
          icon: item.icon ?? String(item.id),
          req_level: item.req_level ?? 0,
          attr: _attr,
          req_attr: _req_attr,
          available: item.available,
          tradeType: item.trade,
          description: item.description ?? '',
        }
      })
    } catch (error) {
      console.error('加载装备数据失败:', error)
    }
  }

  const loadEquipmentSlot = async () => {
    try {
      const module = await import('@/data/item/equipment_slot.json')
      const jsonData = module.default
      jsonData.data.forEach(equip => {
        // 处理多个 position（用 | 分隔）
        if (!equip.position) {
          console.warn(`装备 ${equip.id} (${equip.name_chs}) 缺少 position 字段，跳过`)
          return
        }

        const positions = equip.position.split('|').map(pos => {
          const [col, row] = pos.split(',')
          return {
            row: parseInt(row),
            col: parseInt(col)
          }
        })

        equipmentSlotData.value[equip.id] = {
          id: equip.id,
          name_chs: equip.name_chs,
          name_en: equip.name_en,
          positions: positions, // 改为 positions 数组
          cash: equip.cash,
          enable: equip.enable
        }
      })
    } catch (error) {
      console.error('加载装备数据失败:', error)
    }
  }

  const loader = async () => {
    if (Object.keys(itemTypeData.value).length === 0) {
      await loadItemType()
    }
    if (Object.keys(equipmentTypeData.value).length === 0) {
      await loadEquipmentType()
    }
    if (Object.keys(itemData.value).length === 0) {
      await loadItem()
      await loadEquipment()
    }
    if (Object.keys(equipmentSlotData.value).length === 0) {
      await loadEquipmentSlot()
    }
  }

  // 兼容equipment
  const getItemName = (itemId, lang = 'chs') => {
    const item = itemData.value[itemId] ?? equipmentData.value?.[itemId]
    return item?.[`name_${lang}`] ?? itemId
  }

  // 兼容equipment
  const getItemIcon = (itemId) => {
    const item = itemData.value[itemId] ?? equipmentData.value?.[itemId]
    if (!item) return config.staticAssets.defaultIcon
    const base = itemData.value[itemId]
      ? config.staticAssets.itemIconBase
      : config.staticAssets.equipmentIconBase
    return `${base}/${item.icon}.png`
  }

  // 保留装备获取icon方法，确实是装备的可以直接访问该方法
  const getEquipmentIcon = (equipmentId) => {
    const equipment = equipmentData.value[equipmentId]
    return equipment ? `${config.staticAssets.equipmentIconBase}/${equipment.icon}.png` : config.staticAssets.defaultIcon
  }

  const getEquipmentSlot = (equipmentId) => {
    const equipment = equipmentData.value[equipmentId]
    if (!equipment) return null
    const typeId = equipment.type
    return equipmentTypeData.value[typeId].suit || null
  }

  // 获取装备类型在基础类型中的ID
  const getEquipmentTypeId = computed(() => {
    const types = Object.values(itemTypeData.value)
    return types.find(item => item.name_chs === '装备')?.id
  })

  const isEquipType = (item) => {
    if (!item) return false
    const data = itemData.value[item.id]
    if (!data || data.type == null) return false
    const equipTypeId = getEquipmentTypeId.value
    if (equipTypeId == null) return false
    return Number(data.type) === Number(equipTypeId)
  }

  return {
    itemTypeData,
    equipmentTypeData,
    itemData,
    equipmentData,
    equipmentSlotData,
    loader,
    getItemIcon,
    getItemName,
    getEquipmentTypeId,
    isEquipType,
    getEquipmentIcon,
    getEquipmentSlot,
  }
})