import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useQuestStore } from '@/stores/questStore'

export const useNpcStore = defineStore('npc', () => {
    const npcData = ref({})
    const userStore = useUserStore()
    const questStore = useQuestStore()

    //加载npc基础数据，会在home页面启动时加载

    const loadNpc = async () => {
        try {
            const npc_module = await import('@/data/npc/npc.json')
            const npcJsonData = npc_module.default

            const addItem = (npc) => {
                if (!npc) return
                const parts = npc.text ? String(npc.text).split(',').map(s => s.trim()).filter(Boolean) : []
                const textMap = {}
                parts.forEach(p => {
                    textMap[p] = {}
                })

                npcData.value[npc.id] = {
                    id: npc.id,
                    name_chs: npc.name_chs,
                    text: textMap
                }
            }

            npcJsonData.data.forEach(item => addItem(item))
            console.log('全部 NPC 基础数据加载完成')
        } catch (error) {
            console.error('加载NPC基础数据失败:', error)
        }
    }

    // 加载 NPC 文本详情：从 npc_text.json 中加载当前 NPC 所需的文本条目，懒加载
    const loadNpcText = async (npcId) => {
        if (!npcId) {
            console.warn('loadNpcText 需要传入 npcId')
            return
        }

        const entry = npcData.value[npcId]
        if (!entry) {
            console.warn(`NPC ${npcId} 基础数据不存在，先调用 loadNpc`)
            return
        }

        // 如果已有 text 且包含 detail 则认为已加载
        const hasDetail = Object.values(entry.text || {}).some(v => v && (v.detail || v.title))
        if (hasDetail) {
            console.log(`NPC ${npcId} 文本已加载，跳过`)
            return
        }

        try {
            const npc_text_module = await import('@/data/npc/npc_text.json')
            const npcTextJsonData = npc_text_module.default
            const parseList = (val) => {
                return val ? String(val).split(',').map(s => s.trim()).filter(Boolean) : []
            }

            const textIndex = {}
            if (Array.isArray(npcTextJsonData.data)) {
                npcTextJsonData.data.forEach(t => {
                    const obj = {
                        title: t.title || '',
                        detail: t.detail || ''
                    }

                    if (t.link_quest != null && String(t.link_quest).trim() !== '') {
                        obj.link_quest = String(t.link_quest).trim()
                    }

                    obj.visible = (t.visible != null && String(t.visible).trim() !== '') ? parseList(t.visible) : []
                    obj.invisible = (t.invisible != null && String(t.invisible).trim() !== '') ? parseList(t.invisible) : []

                    textIndex[String(t.id)] = obj
                })
            }

            const textMap = entry.text || {}
            Object.keys(textMap).forEach(key => {
                if (textIndex[key]) {
                    textMap[key] = textIndex[key]
                } else {
                    textMap[key] = { title: '', detail: '', visible: [], invisible: [] }
                }
            })

            // 写回
            npcData.value[npcId].text = textMap
            console.log(`NPC ${npcId} 文本详情加载完成`)
        } catch (error) {
            console.error('加载NPC文本详情失败:', error)
        }
    }

    const loader = async () => {
        if (Object.keys(npcData.value).length === 0) {
            await loadNpc()
        }
    }

    // 获取NPC图标路径
    const getNpcIcon = (npcId) => {
        return `/src/assets/npc/${npcId}.png`
    }

    // 返回指定 NPC 的文本数组 [{ id, title, detail, link_quest?, visible, invisible }]
    const getNpcTexts = (npcId) => {
        const entry = npcData.value[npcId]
        if (!entry) return []
        const textMap = entry.text || {}
        return Object.keys(textMap).map(key => {
            const item = textMap[key] || {}
            return {
                id: key,
                title: item.title || '',
                detail: item.detail || item.text || '',
                // link_quest 若存在为单值字符串，否则 undefined
                link_quest: item.link_quest,
                visible: item.visible || [],
                invisible: item.invisible || []
            }
        })
    }

    // 配合getNpcTexts()，参数2为该方法返回值，对值进行过滤：用id检查，在npcData.text.visible中的存在的id的任务都要为完成状态，且.invisible中的任务都要为未完成状态，才会保留，否则被剔除
    const npcTextFilter = (npcId, npcTexts) => {
        if (!Array.isArray(npcTexts)) return []
        const entry = npcData.value[npcId]
        const questMap = userStore.currentRole?.quest || {}
        const isQuestFinished = (questId) => Number(questMap[String(questId)]) === questStore.statusInt.FINISH

        const shouldKeepText = (text) => {
            const raw = entry?.text?.[String(text.id)] || {}
            const visible = Array.isArray(raw.visible) ? raw.visible : (Array.isArray(text.visible) ? text.visible : [])
            const invisible = Array.isArray(raw.invisible) ? raw.invisible : (Array.isArray(text.invisible) ? text.invisible : [])

            const visibleOk = visible.every(questId => !questId || isQuestFinished(questId))
            const invisibleOk = invisible.every(questId => !questId || !isQuestFinished(questId))
            return visibleOk && invisibleOk
        }
        return npcTexts.filter(shouldKeepText)
    }

    // 返回某条具体 detail 文本
    const getNpcDetail = (npcId, textId) => {
        const texts = getNpcTexts(npcId)
        const found = texts.find(t => String(t.id) === String(textId))
        return found ? found.detail : ''
    }

    return {
        npcData,
        loadNpc,
        loadNpcText,
        getNpcIcon,
        getNpcTexts,
        getNpcDetail,
        npcTextFilter,
        loader
    }
})
