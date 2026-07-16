import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUiStore } from "@/stores/uiStore"
import { useWebSocketStore } from '@/stores/websocketStore'
import { useItemStore } from '@/stores/itemStore'
import { useActionStore } from '@/stores/actionStore'
import { useJobStore } from '@/stores/jobStore'

export const useUserStore = defineStore('user', () => {
  const uiStore = useUiStore()
  const wsStore = useWebSocketStore()
  const itemStore = useItemStore()
  const actionStore = useActionStore()
  const jobStore = useJobStore()
  // user
  const uid = ref(0)
  const roles = ref({})     // 角色列表的基本信息
  //role
  const currentRole = ref({})   // active时初始化一次，level、job、name如果需要修改要去roles里面改
  let max_exp_list = {}
  //config
  const isSwitching = ref(false)
  const lastRoleChange = ref(null)
  const SWITCH_COOLDOWN = 5

  async function loader() {
    lastRoleChange.value = localStorage.getItem('lastRoleChange')
    setUid(localStorage.getItem('uid'))
    const module = await import('@/data/player/level_up_exp.json')
    max_exp_list = Object.fromEntries(
      module.data.map((item, index) => [index + 1, Number(item.exp)])
    )
  }

  function setUid(newUid) {
    uid.value = newUid
  }

  function setRid(newRid) {
    currentRole.value.rid = newRid
    localStorage.setItem('rid', newRid)
  }

  function setRoles(roleList) {
    const roleMap = {}
    roleList.forEach(role => { roleMap[role.id] = role })
    roles.value = roleMap
  }

  const ITEM_BRANCH = {
    ITEM: 1,
    EQUIPMENT: 2,
    NULL: 0
  };

  // 判断物品类型（普通物品、装备物品）
  function distinctions(itemId) {
    if (itemId in itemStore.itemData) {
      return ITEM_BRANCH.ITEM
    } else if (itemId in itemStore.equipmentData) {
      return ITEM_BRANCH.EQUIPMENT
    } else {
      return ITEM_BRANCH.NULL
    }
  }

  function addToBag(items) {
    // 单物品构造成数组统一处理
    if (!Array.isArray(items)) {
      items = [items];
    }
    items.forEach(item => {
      if (!item) return;
      // 判断物品类型，选择对应的背包
      const type = distinctions(item.id);
      let targetBag;
      let key = item.id;
      if (type === ITEM_BRANCH.ITEM) {
        targetBag = currentRole.value.bag;
      } else if (type === ITEM_BRANCH.EQUIPMENT) {
        targetBag = currentRole.value.equipmentBag;
        if (item.unique_id && item.unique_id > 1) {
          key = item.unique_id;
        }
      } else {
        console.warn(`未知物品类型: ${item.id}`);
        return;
      }
      // 增加到对应背包
      if (targetBag[key]) {
        targetBag[key].quantity += item.quantity;
      } else {
        targetBag[key] = { ...item };
      }
    });
  }

  function removeFromBag(itemId, quantityToRemove = 1) {  // remove是直接传itemId的，不用判断unique，unique也会当id传进来
    // 判断物品类型，选择对应的背包
    const type = distinctions(itemId);
    let targetBag;
    if (type === ITEM_BRANCH.ITEM) {
      targetBag = currentRole.value.bag;
    } else if (type === ITEM_BRANCH.EQUIPMENT) {
      targetBag = currentRole.value.equipmentBag;
    } else {
      console.warn(`未知物品类型: ${itemId}`);
      return null;
    }
    // 从对应背包中移除物品
    const item = targetBag[itemId];
    if (!item) return null;
    const removed = { ...item };
    item.quantity -= quantityToRemove;
    if (item.quantity <= 0) {
      delete targetBag[itemId];
    }
    removed.quantity = quantityToRemove;
    return removed;
  }

  function addToWear(equipments) {
    if (!Array.isArray(equipments)) {
      equipments = [equipments];
    }
    equipments.forEach(equipment => {
      if (!equipment) return;
      const slot = itemStore.getEquipmentSlot(equipment.id);
      if (slot) {
        currentRole.value.wear[slot] = { ...equipment };
      }
    });
  }

  function removeFromWear(slotId) {
    const equipment = currentRole.value.wear[slotId];
    if (!equipment) return null;
    delete currentRole.value.wear[slotId];
    return { ...equipment };
  }

  function setMap(mapId) {
    currentRole.value.map = mapId
  }

  function setQuest(questId, status) {
    currentRole.value.quest[questId] = status
  }

  function sendPutOnEquipment(equipmentId) {
    const targetEquipment = currentRole.value.wear[itemStore.getEquipmentSlot(equipmentId)]
    if (equipmentId === targetEquipment?.id) {
      console.warn(`装备 ${equipmentId} 和穿戴装备完全一致，loop`)
      return
    }
    wsStore.sendWebSocketMessage({ type: "putOn", data: { id: equipmentId } })
  }

  function recvPutOnEquipment(equipmentId) {
    const slotId = itemStore.getEquipmentSlot(equipmentId)
    addToBag(removeFromWear(slotId))
    addToWear(removeFromBag(equipmentId))
  }

  function sendTakeOffEquipment(slotId) {
    wsStore.sendWebSocketMessage({ type: "takeOff", data: { id: slotId } })
  }

  function recvTakeOffEquipment(slotId) {
    addToBag(removeFromWear(slotId));
  }

  function recvReward(data) {
    console.log('开始处理奖励信息:', data)
    const rewardType = actionStore.action[data.action]?.typeChs || actionStore.actionHistory[data.action]?.typeChs || "奖励"
    // exp, meso
    const messages = []
    if (data.reward && Object.keys(data.reward).length > 0) {
      for (const [itemId, quantity] of Object.entries(data.reward)) {
        console.log('itemId:', itemId, 'quantity:', quantity)
        addToBag({ id: Number(itemId), quantity: quantity })
        messages.push(`获得 ${itemStore.getItemName(itemId)} x${quantity}`)
      }
    }
    if (data.consume && Object.keys(data.consume).length > 0) {
      for (const [itemId, quantity] of Object.entries(data.consume)) {
        console.log('itemId:', itemId, 'quantity:', quantity)
        removeFromBag(itemId, quantity)
        messages.push(`消耗 ${itemStore.getItemName(itemId)} x${quantity}`)
      }
    }
    if (messages.length > 0) {
      uiStore.addDialog("reward", messages.join("\n"), rewardType)
    } else {
      uiStore.addDialog("reward", "你似乎没有获得任何奖励... v_v", rewardType)
    }
    actionStore.updateActionProgress(data.action)

  }

  function clearCurrentRole() {
    actionStore.clearAllAction() // 先清空放置切换角色污染，再接收可能持续battle信息
    currentRole.value = {
      rid: -1,
      equipment: {},
      equipmentBag: {},
      wear: {},
      attr: {},
      expMax: 2147483647,
      exp: 2147483643,
      bag: {},
      map: -1,
      quest: {}
    }
  }

  //删除且[到期]了才会真的在本地删除
  function removeRoleByRid(rid) {
    roles.value = roles.value.filter(role => role.rid !== rid)
  }

  // 一般只有当前角色状态才会更改（升级、转职等） 写法待更新
  // function updateRole(updatedRole) {
  //   const index = roles.value.findIndex(role => role.rid === updatedRole.rid)
  //   if (index !== -1) {
  //     roles.value[index] = updatedRole
  //   }
  // }

  // 发送创建角色指令到服务器
  function sendCreateRole(name, job) {
    if (!name || !job) {
      uiStore.addDialog("error", "数据错误请刷新后重试")
      return
    }
    wsStore.sendWebSocketMessage({ type: "createRole", data: { name: name, job: job } })
  }

  // 接收创建（增加）角色指令
  function recvCreateRole(rid, _job, _level, _name) {
    roles.value[rid] = { id: rid, job: _job, level: _level, name: _name }
    uiStore.addDialog("success", "创建角色成功")
  }

  // 发送切换角色指令到服务器
  function sendActiveRole(rid) {
    if (rid <= 0) {
      uiStore.addDialog("error", "数据错误请刷新后重试")
    }
    console.log('now time:', Date.now(), 'last change:', Number(lastRoleChange.value), 'interval:', (Date.now() - Number(lastRoleChange.value)) / 1000, 's')
    if (isSwitching.value) {
      uiStore.addDialog("error", "正在等待服务器返回数据")
      return
    }
    if (lastRoleChange.value) {
      const timer = Date.now() - Number(lastRoleChange.value) - SWITCH_COOLDOWN * 1000
      if (timer < 0) {
        uiStore.addDialog("warning", `切换角色频率过快，请${Math.floor(-timer / 1000 + 1)}秒后再试`)
        return
      }
    }
    lastRoleChange.value = Date.now()   // 防止刷新所以这里也要写一遍，接收到返回消息时会再覆盖一次
    localStorage.setItem('lastRoleChange', lastRoleChange.value)
    isSwitching.value = true
    wsStore.sendWebSocketMessage({ type: "activeRole", data: { id: rid } })
  }

  // 读取
  async function levelUpRefresh() {
    currentRole.value.expMax = max_exp_list[currentRole.value.level]
    console.log("准备读入最大hp_mp", currentRole.value.job, currentRole.value.level)
    console.log(currentRole.value.attr)
    const [max_hp, max_mp] = jobStore.getMaxHpMp(currentRole.value.job, currentRole.value.level)
    currentRole.value.attr['max_hp'] = max_hp
    currentRole.value.attr['max_mp'] = max_mp
  }

  // 接收到切换角色指令
  function recvActiveRole(data) {
    clearCurrentRole()    // 清空当前角色内存
    currentRole.value.rid = data.rid
    currentRole.value.attr = data.attr
    currentRole.value.level = data.level
    currentRole.value.job = data.job
    levelUpRefresh()
    currentRole.value.exp = data.exp
    if (data.bag) { addToBag(data.bag) }
    if (data.equipment_bag) { addToBag(data.equipment_bag) }
    if (data.wear) { addToWear(data.wear) }
    setMap(data.map)
    console.log('data.quest:', data.quest)
    if (data.quest) {
      data.quest.forEach(q => {
        setQuest(q.id, q.status);
      });
    }
    // 未实现的action续传
    // const battle = data.continue_action || {}
    // if (Object.keys(battle).length > 0) {
    //   actionStore.set_room_id(battle.room_id)
    //   actionStore.set_room_start(true)
    //   actionStore.set_room_end_time(battle.end_time)
    //   actionStore.set_player_instance(battle.user)
    //   actionStore.set_mob_instance(battle.mob)
    // }
    localStorage.setItem("active", data.rid)
    isSwitching.value = false
    localStorage.setItem('lastRoleChange', Date.now().toString())
  }

  function recvHeal(hp, mp) {
    currentRole.value.attr['hp'] = hp
    currentRole.value.attr['mp'] = mp
  }

  return {
    uid,
    currentRole,
    roles,
    isSwitching,
    lastRoleChange,
    SWITCH_COOLDOWN,
    loader,
    setUid,
    setRid,
    setRoles,
    addToBag,
    removeFromBag,
    // addToEquipmentBag,
    recvReward,
    // removeFromEquipmentBag,
    addToWear,
    removeFromWear,
    setMap,
    setQuest,
    sendPutOnEquipment,
    recvPutOnEquipment,
    sendTakeOffEquipment,
    recvTakeOffEquipment,
    sendActiveRole,
    sendCreateRole,
    recvActiveRole,
    recvCreateRole,
    recvHeal,
    removeRoleByRid,
    // updateRole,



  }
})