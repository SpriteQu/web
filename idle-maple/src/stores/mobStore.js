import { defineStore } from 'pinia'
import { ref } from 'vue'
import config from '@/config'

export const useMobStore = defineStore('mob', () => {
    const mobData = ref({})

    const loadMob = async () => {
        try {
            const module = await import('@/data/mob/mob.json')
            const jsonData = module.default
            jsonData.data.forEach(item => {
                // 解析 attr 为对象
                const attrObj = {}
                item.attr?.split(',').forEach(pair => {
                    const [key, value] = pair.split('|')
                    if (key && value !== undefined) {
                        attrObj[key.trim()] = isNaN(Number(value)) ? value : Number(value)
                    }
                })

                mobData.value[item.id] = {
                    id: item.id,
                    name_chs: item.name_chs,
                    level: item.level,
                    attr: attrObj,
                    icon: item.icon,
                }
            })
            console.log('Mob加载完成', Object.keys(mobData.value).length)
        } catch (error) {
            console.error('加载Mob数据失败:', error)
        }
    }

    const loader = async () => {
        if (Object.keys(mobData.value).length === 0) {
            await loadMob()
        }
    }

    // 获取职业图标路径（后期实装纸娃娃系统会放到avaterStore）
    function getMobIcon(mobId) {
        return config.getMobIconPath(mobId)
    }

    function getMobName(mobId) {
        return mobData.value[mobId].name_chs
    }
    function getMobLevel(mobId) {
        return mobData.value[mobId].level
    }

    return {
        mobData,
        loader,
        getMobIcon,
        getMobName,
        getMobLevel,
    }

})