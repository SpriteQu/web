// 用来缓存其他玩家信息，根据需求不同缓存的属性各不相同
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useWebSocketStore } from "./websocketStore"
import { useUserStore } from './userStore'

export const usePlayerStore = defineStore('player', () => {
    const wsStore = useWebSocketStore()
    const userStore = useUserStore()
    const player = ref({})

    function addPlayer(rid, name){

    }

    function getPlayer(rid) {
        if (rid == userStore.currentRole.rid) {
            return userStore.currentRole
        } else {
            return player[rid]
        }
    }

    function sendRequestPlayer(){
        wsStore.sendWebSocketMessage()
    }

    function recvRequestPlayer(){

    }

    return{
        player,
        addPlayer,
        getPlayer,
        sendRequestPlayer,
        recvRequestPlayer,
    }
})