import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUiStore } from "@/stores/uiStore"
import { useWebSocketStore } from '@/stores/websocketStore'
import { useVillageStore } from '@/stores/villageStore'

export const useActionStore = defineStore('action', () => {
  const uiStore = useUiStore()
  const wsStore = useWebSocketStore()
  const villageStore = useVillageStore()
  const action = ref({})
  const actionHistory = ref({})  // 已经结束的事件历史记录，查询用防止协程晚于结束时间先到来被释放


  // 获取动词，用于home页顶部卡片显示
  function getActionVerb(actionId) {
    const type = action.value[actionId].type
    if (type == 'battle') {
      return action.value[actionId].typeChs
    } else {
      return villageStore.villageTypeData[type].verb
    }
  }

  const LEAVESPONSOR = {
    NONE: 0,
    SELF: 1,
    OWNER: 2,
  };

  function addVillageAction(actionId, objId, times, completed = 0) {
    const typeId = villageStore.villageData[objId].type_id
    const time = villageStore.villageData[objId].time
    const typeChs = villageStore.villageTypeData[typeId].name_chs
    action.value[actionId] = {
      id: actionId,
      type: typeId,
      typeChs: typeChs,
      produceId: objId,
      times: times,
      time: time,
      completed: completed,
      isProxy: false  // 暂时写死
    }
  }

  const clearAction = (actionId, recycle = true) => {
    if (recycle) {
      actionHistory.value[actionId] = action.value[actionId];   // 将事件移至历史记录
    }
    delete action.value[actionId]
  }

  // 用以切换角色时清空
  const clearAllAction = () => {
    const actionIds = Object.keys(action.value);
    actionIds.forEach(action_id => {
      clearAction(action_id, false);
    });
  }

  const sendVillageAction = (objId, classId) => {
    if (objId <= 0) {
      uiStore.addDialog("error", "数据错误请刷新后重试")
    }
    else {
      wsStore.sendWebSocketMessage({ type: 'village', data: { id: objId, class: classId } })
    }
  }

  const sendMoveAction = (objId) => {
    wsStore.sendWebSocketMessage({ type: 'move', data: { id: objId } })
  }

  function recvAction(actionId, objId, times) {
    addVillageAction(actionId, objId, times, 0)
  }

  // 更新village action进度
  function updateActionProgress(actionId) {
    if (action.value[actionId]) {
      action.value[actionId].completed += 1;
    }
  }

  const recvEndAction = (actionId, sponsor = LEAVESPONSOR.NONE) => {
    clearAction(actionId)
    if (sponsor == LEAVESPONSOR.NONE) {
      uiStore.addDialog("info", "行动已结束")
    } else if (sponsor == LEAVESPONSOR.SELF) {
      uiStore.addDialog("info", "行动已结束:主动退出")
    } else if (sponsor == LEAVESPONSOR.OWNER) {
      uiStore.addDialog("info", "行动已结束:被房主移除")
    } else {
      uiStore.addDialog("info", "行动已结束")
      console.warn('未知sponsor:', sponsor)
    }

  }

  return {
    action,
    actionHistory,
    getActionVerb,
    clearAction,
    clearAllAction,
    sendVillageAction,
    sendMoveAction,
    recvAction,
    updateActionProgress,
    recvEndAction
  }
})