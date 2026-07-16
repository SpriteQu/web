import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useVillageStore = defineStore('village', () => {
    // 现在从 type.json 读取全部类型 id 和 name_chs
    const villageTypeData = ref({})
    const villageData = ref({})

    const loadVillageTypeData = async () => {
        try {
            const module = await import('@/data/village/type.json')
            const jsonData = module.default
            if (jsonData.data) {
                jsonData.data.forEach(t => {
                    villageTypeData.value[t.id] = {
                        id: t.id,
                        class: t.class,
                        name_chs: t.name_chs,
                        verb: t.verb
                    }
                })
            }
        } catch (error) {
            console.error('加载村庄类型数据失败:', error)
        }
    }

    const loadVillageData = async () => {
        try {
            const module = await import('@/data/village/village.json')
            const jsonData = module.default
            if (jsonData.data) {
                jsonData.data.forEach(village => {
                    const entry = {
                        id: village.id,
                        name_en: village.name_en,
                        name_chs: village.name_chs,
                        type_id: village.type,
                        equip: village.equip,
                        product: village.product,
                        level: village.level,
                        exp: village.exp ?? 0,
                        time: village.time,
                        description: village.description ?? ''
                    }

                    if (village.expend) {
                        entry.materials = village.expend.split(',').map(item => {
                            const [itemId, count] = item.trim().split('|')
                            return {
                                itemId: parseInt(itemId),
                                count: parseInt(count)
                            }
                        })
                    }

                    villageData.value[village.id] = entry
                })
            }
        } catch (error) {
            console.error('加载村庄数据失败:', error)
        }
    }

    const loader = async () => {
        if (Object.keys(villageTypeData.value).length === 0) {
            await loadVillageTypeData()
        }
        if (Object.keys(villageData.value).length === 0) {
            await loadVillageData()
        }
    }

    const getVillageIcon = (villageId) => {
        return `/src/assets/village/${villageId}.png`
    }

    return {
        villageTypeData,
        villageData,
        loader,
        getVillageIcon
    }
})
