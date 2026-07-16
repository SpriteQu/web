import { defineStore } from "pinia"
import { useUserStore } from "@/stores/userStore"
import { useUiStore } from "@/stores/uiStore"
import { useItemStore } from "@/stores/itemStore"
import { useMapStore } from "@/stores/mapStore"
import { useActionStore } from "@/stores/actionStore"
import { useBattleActionStore } from "@/stores/battleActionStore"
import { useQuestStore } from "@/stores/questStore"
import config from "@/config"
import router from "@/router"

export const useWebSocketStore = defineStore("websocket", {
  state: () => ({
    socket: null,
    user_init: false,
  }),

  actions: {
    initWebSocket(uid, token) {
      try {
        if (!uid || !token) {
          console.error("无法建立WebSocket连接: 缺少uid或token")
          return
        }

        const wsUrl = `${config.wsUrl}${config.wsPath.root}?uid=${uid}&token=${token}`

        if (this.socket) {
          this.closeWebSocket()
        }

        this.socket = new WebSocket(wsUrl)

        this.socket.onopen = () => {
          this.handleOpen() // 触发 open 处理
        }

        this.socket.onmessage = (action) => {
          this.handleMessage(action.data) // 触发 收到message 处理
        }

        this.socket.onclose = (action) => {
          this.handleClose(action) // 触发 关闭连接 处理
        }

        this.socket.onerror = (error) => {
          this.handleError(error) // 触发 发生错误 处理
        }
      } catch (err) {
        console.error("初始化WebSocket时发生错误:", err)
      }
    },

    closeWebSocket() {
      if (this.socket) {
        this.socket.onopen = null
        this.socket.onmessage = null
        this.socket.onclose = null
        this.socket.onerror = null
        this.socket.close()
        this.socket = null
        this.isConnected = false
        this.isConnecting = false
      }
    },

    sendWebSocketMessage(message) {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message))
      } else {
        console.error("WebSocket连接未就绪")
      }
    },

    // ====== 下面是供外部重写的钩子方法 ======

    handleOpen() {
      console.log("WebSocket连接已建立")
    },

    async handleMessage(data) {
      try {
        data = JSON.parse(data)
        const userStore = useUserStore()
        const uiStore = useUiStore()
        const itemStore = useItemStore()
        const mapStore = useMapStore()
        const actionStore = useActionStore()
        const battleActionStore = useBattleActionStore()
        const questStore = useQuestStore()
        // 角色列表初始化
        if (!this.user_init && data.roles && Array.isArray(data.roles)) {
          userStore.setRoles(data.roles)
          this.user_init = true
          const active_rid = localStorage.getItem("active")
          if (active_rid && data.roles.some((role) => role.id === parseInt(active_rid))) {
            this.sendWebSocketMessage({
              type: "activeRole",
              data: {
                id: parseInt(active_rid),
              },
            })
          }
          return
        }
        // 通用消息
        if (this.user_init) {
          switch (data.type) {
            // 自定义提示消息
            case "info":
              uiStore.addDialog(data.level, data.message)
              break
            // 添加角色回复消息
            case "add_role":
              userStore.recvCreateRole(data.rid, data.job, data.level, data.name)
              break
            // 切换角色回复消息
            case "active_role":
              userStore.recvActiveRole(data)
              break
            // 角色移动
            case "will_goto":
              //TODO:服务器已经接受并通过了移动指令，正在移动线程中，客户端渲染进程（锁定角色）
              break
            case "goto_fix":    // 可能是位置和服务端不同步，回传当前位置，实现上没区别
            case "goto":
              userStore.setMap(data.map)
              break
            case "heal":
              userStore.recvHeal(data.hp, data.mp)
              break
            case "quest":
              questStore.recvQuest(data.id, data.status)
              break
            case "create_action":
              if (data.action_type == "battle") {
                battleActionStore.recvBattleAction(data.id)
              } else {
                actionStore.recvAction(data.id, data.obj_id, data.times)
              }
              break
            case "start_battle":
              battleActionStore.recvStartBattle(data.id, data.end_time)
              break
            case "refresh_mob":
              battleActionStore.recvRefreshMob(data.action_id, data.mob)
              break
            case "end_action":
              actionStore.recvEndAction(data.id, data.sponsor)
              break
            case "put_on":
              userStore.recvPutOnEquipment(data.id)
              break
            case "take_off":
              userStore.recvTakeOffEquipment(data.id)
              break
              // case "leave_room":
              //   actionStore.clearAction(data.room_id)
              //   break

              /* 处理复活player信息 */
              const save = data.save || {}
              if (Object.keys(save).length > 0) {
                for (let i = 0; i < data.save.length; i++) {
                  actionStore.update_hp("player", data.save[i].rid, data.save[i].hp)
                }
              }
              break
            case "attack":
              const att_info = data.info
              for (let i = 0; i < att_info.length; i++) {
                actionStore.attack(att_info[i])
              }
              break
            // battle_reward要额外初始化battle事件
            case "reward":
              userStore.recvReward(data)
              break
            case "battle_reward": {
              const rewardType = actionStore.action[data.action].typeChs || actionStore.actionHistory[data.action].typeChs || "奖励"
              const exp = Number(data.exp) || 0
              const meso = Number(data.meso) || 0
              const items = Array.isArray(data.item) ? data.item : (data.item ? [data.item] : [])
              const consume = Array.isArray(data.consume) ? data.consume : (data.consume ? [data.consume] : [])
              const messages = []
              if (exp > 0) {
                messages.push(`获得经验值: ${exp}`)
              }
              if (meso > 0) {
                messages.push(`获得金币: ${meso}`)
              }
              if (consume.length > 0) {
                consume.forEach(item => {
                  if (item && typeof item === "object" && item.id) {
                    const itemInfo = useItemStore().itemData[item.id]
                    const name = itemInfo ? itemInfo.name_chs : `道具${item.id}`
                    const count = item.count || 1
                    itemStore.removeFromBag(item.id, count)
                    messages.push(`消耗 ${name} x${count}`)
                  }
                })
              }
              if (items.length > 0) {
                items.forEach(item => {
                  if (item && typeof item === "object" && item.id) {
                    const itemInfo = useItemStore().itemData[item.id]
                    const name = itemInfo ? itemInfo.name_chs : `道具${item.id}`
                    const count = item.count || 1
                    userStore.addToBag(item.id, count)
                    messages.push(`获得 ${name} x${count}`)
                  }
                })
              }
              if (messages.length > 0) {
                uiStore.addDialog("reward", messages.join("\n"), rewardType)
              } else {
                uiStore.addDialog("reward", "你似乎没有获得任何奖励... v_v", rewardType)
              }
              if (data.type === "battle_reward") {
                actionStore.clear_mob(data.battle_id)
              } else {
                // 处理对应事件的 completed +1
                if (data.from && actionStore.action[data.from]) {
                  actionStore.action[data.from].completed += 1
                }
              }
              break
            }
            /* 打印未知类型消息 */
            default:
              console.warn("Unknown message type:", data.type, "data:", data)
              break
          }
        }
      } catch (e) {
        console.error("解析消息失败:", e, "data:", data)
      }
    },

    async handleClose(action) {
      console.log("WebSocket连接已关闭", { code: action.code, reason: action.reason, wasClean: action.wasClean })
      const uiStore = useUiStore()
      // 通知 UI 连接断开（1008 单独处理为登录超时错误）
      if (action.code !== 1008) {
        uiStore.addDialog("net", "和服务器断开连接")
      }
      if (action.code === 1008) {
        uiStore.addDialog("error", action.reason ?? "登录超时，请重新登录")
        await new Promise((resolve) => setTimeout(resolve, 3000))
        router.logout()
        return
      }
      if (action.code === 1012) {
        // TODO:服务器维护跳转维护页
        return
      }
    },

    handleError(error) {
      console.error("WebSocket错误:", error)
    },
  },
})
