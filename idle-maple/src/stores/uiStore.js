// stores/uiStore.js
import { defineStore } from 'pinia'
import { useItemStore } from '@/stores/itemStore'

export const useUiStore = defineStore('ui', {
  state: () => ({
    // 所有要显示的对话框
    dialog: [],
    itemTip: null,
    itemTipTimer: null
  }),
  actions: {
    addDialog(type, message, prefix = '') {
      const id = Math.random().toString(36).substring(2, 9)
      this.dialog.push({
        id,
        type,
        message,
        duration: 3000,
        prefix
      })
      return id
    },
    addNetworkErrorDialog() {
      return this.addDialog('error', '网络异常，请刷新后重新获取信息');
    },
    removeDialog(id) {
      this.dialog = this.dialog.filter(d => d.id !== id)
    },
    addItemTip(x, y, itemId) {
      if (this.itemTipTimer) {
        clearTimeout(this.itemTipTimer)
      }

      this.removeItemTip()

      const itemStore = useItemStore()
      const itemData = itemStore.equipmentData[itemId] || itemStore.itemData[itemId]
      if (!itemData) {
        return null
      }

      let typeName = ''
      const typeId = itemData.type || itemData.type_id || itemData.equipment_type_id
      if (typeId && itemStore.itemTypeData[typeId]) {
        typeName = itemStore.itemTypeData[typeId].name_chs
      } else if (typeId && itemStore.equipmentTypeData[typeId]) {
        typeName = itemStore.equipmentTypeData[typeId].name_chs
      }

      const attributes = []
      if (itemData.attr && itemData.attr.length > 0) {
        itemData.attr.forEach(attr => {
          attributes.push({ text: `${attr.attr}: +${attr.value}` })
        })
      }

      let description = itemData.description || ''
      description = description.replace(/\\n/g, '\n')

      this.itemTip = {
        id: `${itemId}-${Date.now()}`,
        x,
        y,
        name: itemData.name_chs || '未知物品',
        typeName,
        description,
        attributes
      }

      this.itemTipTimer = setTimeout(() => {
        this.removeItemTip()
      }, 3000)

      return this.itemTip
    },
    removeItemTip() {
      if (this.itemTipTimer) {
        clearTimeout(this.itemTipTimer)
        this.itemTipTimer = null
      }
      this.itemTip = null
    },
    reset() {
      this.dialog = []
      this.removeItemTip()
    },
  }
})