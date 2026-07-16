import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useWebSocketStore } from '@/stores/websocketStore'
import { useUserStore } from '@/stores/userStore'
import { useUiStore } from '@/stores/uiStore'

export const useQuestStore = defineStore('quest', () => {
    const wsStore = useWebSocketStore()
    const userStore = useUserStore()
    const questData = ref({})
    const uiStore = useUiStore()
    const parseListField = (str) => {
        if (!str) return []
        return String(str).split(',').map(s => s.trim()).filter(Boolean).map(pair => {
            const parts = pair.split('|').map(p => p.trim())
            return {
                id: parseInt(parts[0]) ?? '',
                count: parseInt(parts[1]) ? Number(parts[1]) : 1
            }
        })
    }

    const loadQuest = async (questId) => {
        if (questId == null)
            return
        const key = String(questId)
        if (questData.value[key]) {
            return
        }

        try {
            const module = await import('@/data/quest/quest.json')
            const json = module.default
            if (!Array.isArray(json.data))
                return

            const found = json.data.find(q => String(q.id) === key)
            if (!found) {
                console.warn(`quest ${key} not found in quest.json`)
                return
            }

            const parsed = {
                id: found.id,
                describe: found.describe || '',
                npc: found.npc,
                submit: parseListField(found.submit),
                reward: parseListField(found.reward)
            }

            questData.value[key] = parsed
            return
        } catch (error) {
            console.error('加载 quest 失败', error)
            return
        }
    }

    const commandInt = {
        ACCEPT: 1,
        CANCEL: 0,
        SUBMIT: 2
    };

    const statusInt = {
        ACCEPT: 1,
        FINISH: 2,
        DISABLE: 4
    }

    // 检查任务可以被提交（只检查物品数量是否符合，如果以后增加别的提交类型，需要修改）
    function questCanSubmit(questId) {
        if (!questId) return false
        const q = questData.value[String(questId)]
        if (!q) return false
        const submits = q.submit || []
        if (!submits.length) return true

        const bag = userStore.currentRole?.bag || []
        const equipmentBag = userStore.currentRole?.equipmentBag || []

        // 合并两个背包，优先从普通背包查找，找不到再从装备背包查找
        const findItem = (itemId) => {
            // 先在普通背包中查找
            if (bag[itemId]) return bag[itemId]
            // 普通背包中找不到，再在装备背包中查找
            return equipmentBag[itemId] || null
        }

        for (const req of submits) {
            const needId = Number(req.id)
            const needCount = Number(req.count) || 1
            const bagItem = findItem(needId)
            if (!bagItem || Number(bagItem.quantity) < needCount) return false
        }
        return true
    }

    const sendQuest = async (command, questId, npcId = 0) => {
        await loadQuest(questId)
        wsStore.sendWebSocketMessage({ type: "quest", data: { id: questId, npc: npcId, command: command } })
    }

    const recvQuest = (questId, status) => {
        userStore.setQuest(questId, status)
        if (status === statusInt.FINISH) {
            console.log("quest", questId, status)
            // 遍历questStore.questData[data.id].reward，属性id, count传到userStore.addToBag()当参数
            const questInfo = questData.value[questId]
            if (questInfo && questInfo.reward && Array.isArray(questInfo.reward)) {
                questInfo.reward.forEach(rewardItem => {
                    if (rewardItem && rewardItem.id) {
                        const count = rewardItem.count || 1
                        userStore.addToBag({ id: rewardItem.id, quantity: count })
                    }
                })
            }
            // 遍历questStore.questData[data.id].submit,属性id, count传到userStore.removeFromBag()当参数
            if (questInfo && questInfo.submit && Array.isArray(questInfo.submit)) {
                questInfo.submit.forEach(submitItem => {
                    if (submitItem && submitItem.id) {
                        const count = submitItem.count || 1
                        userStore.removeFromBag(submitItem.id, count)
                    }
                })
            }
            console.log(questInfo)
            uiStore.addDialog("success", "完成了任务[" + questInfo.describe + "]")
        }
    }


    return {
        questData,
        loadQuest,
        commandInt,
        statusInt,
        sendQuest,
        recvQuest,
        questCanSubmit
    }
})