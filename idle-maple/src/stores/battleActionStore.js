// 属于action，因为内容较多所以独立出来
import { defineStore } from 'pinia'
import { useActionStore } from "./actionStore"
import { useUserStore } from "./userStore";
import { useUiStore } from "./uiStore";
import { useWebSocketStore } from './websocketStore';
import { useMobStore } from './mobStore';

export const useBattleActionStore = defineStore('battle', () => {
    const actionStore = useActionStore()
    const userStore = useUserStore()
    const uiStore = useUiStore()
    const wsStore = useWebSocketStore()
    const mobStore = useMobStore()

    const BATTLE_MODE = {
        SINGLE: 1,
        MULTI: 2,
        // RAID: 3
    };

    function addBattleAction(actionId, isStart, playerInstance, mobInstance, startTime = 0) {
        actionStore.action[actionId] = {
            id: actionId,
            type: 'battle',
            typeChs: '战斗',
            isStart: isStart,
            endTime: 0,
            playerInstance: playerInstance,
            mobInstance: mobInstance,
            startTime: startTime
        }
    }

    // 发送创建或加入battle action请求
    function sendBattleAction(objId = 0) {
        if (objId == 0) {
            wsStore.sendWebSocketMessage({ type: 'createBattle', data: { mode: BATTLE_MODE.SINGLE } })
        } else {
            wsStore.sendWebSocketMessage({ type: 'joinBattle', data: { id: objId } })
        }
    }

    function recvBattleAction(actionId, player = []) {
        player.push(userStore.currentRole.rid)
        addBattleAction(actionId, false, player, {})
    }

    // 发送开始battle action请求 
    function sendStartBattle(objId) {
        // TODO: 
    }

    function recvStartBattle(actionId, endTime, startTime = Date.now()) {
        const currentAction = actionStore.action[actionId]
        if (currentAction) {
            currentAction.isStart = true
            currentAction.startTime = startTime
            currentAction.endTime = endTime
            // 续传的扣除已经经过的时间，如果是新开的则是0
            currentAction.remainTime = endTime - Math.floor((Date.now() - currentAction.startTime) / 1000)
            currentAction._timer = setInterval(() => {
                if (currentAction.remainTime > 0) {
                    currentAction.remainTime -= 1
                }
            }, 1000)
        } else {
            uiStore.addNetworkErrorDialog()
        }
    }

    function recvRefreshMob(actionId, mob) {
        const currentAction = actionStore.action[actionId]
        if (currentAction) {
            currentAction.mobInstance = mob
            // 迭代mobInstance对象，给每个mob对象的mob.attr赋值
            Object.values(currentAction.mobInstance).forEach(mobItem => {
                const mobData = mobStore.mobData[mobItem.template]
                if (mobData) {
                    mobItem.attr.max_hp = mobData.attr.max_hp
                    mobItem.attr.hp = mobData.attr.max_hp
                }
                console.log
            })
        } else {
            uiStore.addNetworkErrorDialog()
        }
    }

    function sendLeaveBattle(actionId) {
        wsStore.sendWebSocketMessage({ type: 'leaveBattle', data: { id: actionId } })
    }

    return {
        addBattleAction,
        sendBattleAction,
        recvBattleAction,
        sendStartBattle,
        recvStartBattle,
        recvRefreshMob,
        sendLeaveBattle,
    }
})