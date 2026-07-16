<template>
    <div class="map-container">
        <div class="viewer-nav">
            <button v-for="viewer in viewers" :key="viewer.name" :class="['viewer-button', { active: activeViewer === viewer.name }]" @click="activeViewer = viewer.name">
                {{ viewer.label }}
            </button>
        </div>

        <div class="map-content-wrapper">
            <!-- 左侧地图区域 -->
            <div class="map-left-panel">
                <div v-if="activeViewer === 'map'" class="map-viewer">
                    <!-- 地图图片 -->
                    <img :src="mapUrl" alt="地区地图" class="map-image" @load="handleImageLoad" draggable="false"/>
                    <!-- 地图点位 -->
                    <div v-if="mapList.length > 0" class="map-points-container">
                        <div v-for="map in mapList" :key="mapStore.mapData[map].id" class="map-point" :data-type="mapStore.mapData[map].icon_type" :data-current="mapStore.mapData[map].id === currentMapId" :style="{ top: `${mapStore.mapData[map].position.x}px`, left: `${mapStore.mapData[map].position.y}px` }" @click="handlePointClick(map)">
                            <!-- 当前位置指针 -->
                            <div v-if="mapStore.mapData[map].id === currentMapId" class="current-pointer"></div>
                            <span class="point-name">{{ mapStore.mapData[map].name }}</span>
                        </div>
                    </div>
                </div>

                <div v-else class="point-viewer">
                    <img v-if="pointImageUrl" :src="pointImageUrl" alt="" class="point-image-hidden" @load="handleImageLoad" draggable="false" />

                    <div v-if="imageSize.width && imageSize.height" class="point-canvas" :style="{ width: `${imageSize.width}px`, height: `${imageSize.height}px` }">
                        <div class="point-map" :style="pointMapStyle">
                            <div v-for="link in pointLinks" :key="`link-${link.id}`" class="point-link" :style="link.style"></div>
                            <div v-for="point in visiblePoints" :key="point.id" class="map-point" :class="{ current: point.id === currentMapId }" :data-type="point.icon_type" :data-current="point.id === currentMapId" :style="{ top: `${point.position.y}px`, left: `${point.position.x}px` }" @click="handlePointClick(point.id)">
                                <div v-if="point.id === currentMapId" class="current-pointer"></div>
                                <span class="point-name">{{ point.name_chs }}</span>
                            </div>
                        </div>
                    </div>

                    <div v-else class="empty-tip">
                        point viewer 加载中...
                    </div>
                </div>
            </div>

            <!-- 右侧信息面板 -->
            <div class="map-right-panel">
                <div class="info-section">
                    <h3 class="section-title">当前地图</h3>
                    <div class="current-map-info">
                        <p class="map-name">{{ currentPoint?.name_chs || '未知地图' }}</p>
                    </div>
                </div>

                <!-- 怪物列表 -->
                <div v-if="currentMobList.length > 0" class="info-section">
                    <h3 class="section-title">怪物 ({{ currentMobList.length }})</h3>
                    <div class="mob-list">
                        <div v-for="mobInfo in currentMobList" :key="mobInfo.mob_id" class="mob-item">
                            <img :src="mobStore.getMobIcon(mobInfo.mob_id)" :alt="mobStore.mobData[mobInfo.mob_id]?.name_chs" class="mob-icon" />
                            <span class="mob-name">{{ mobStore.mobData[mobInfo.mob_id]?.name_chs || '未知怪物' }}</span>
                        </div>
                    </div>
                </div>

                <!-- NPC列表 -->
                <div v-if="currentNpcList.length > 0" class="info-section">
                    <h3 class="section-title">NPC ({{ currentNpcList.length }})</h3>
                    <div class="npc-list">
                        <div v-for="npcId in currentNpcList" :key="npcId" class="npc-item">
                            <div class="npc-header" @click="toggleNpc(npcId)">
                                <img :src="getNpcIcon(npcId)" :alt="getNpcName(npcId)" class="npc-icon" />
                                <span class="npc-name">{{ getNpcName(npcId) }}</span>
                                <!-- 点击整个 header 收起/展开（移除独立按钮） -->
                            </div>

                            <div v-if="expandedNpc === npcId" class="npc-text-titles">
                                <div v-for="text in visibleNpcTexts(npcId)" :key="text.id" class="npc-text-title">
                                    <div class="title-row" @click.stop="toggleDetail(npcId, text.id)">
                                        <span>{{ text.title || '（无标题）' }}</span>
                                    </div>
                                    <div v-if="openedDetail === `${npcId}-${text.id}`" class="npc-detail">
                                        <p v-html="text.detail || npcStore.getNpcDetail(npcId, text.id)"></p>
                                        <div v-if="text.link_quest" class="quest-row">
                                            <template v-if="isQuestStatus(text.link_quest, questStore.statusInt.ACCEPT)">
                                                <button class="accept-quest accepted" disabled>任务已接受</button>
                                                <span class="submit-wrapper">
                                                    <template v-if="canSubmit(text.link_quest)">
                                                        <a href="#" class="submit-quest" @click.stop.prevent="submitQuest(text.link_quest, npcId)">完成任务</a>
                                                    </template>
                                                    <template v-else>
                                                        <button class="submit-quest disabled" disabled>完成任务</button>
                                                        <div class="tooltip">提交任务条件不满足</div>
                                                    </template>
                                                </span>
                                            </template>
                                            <template v-else>
                                                <a href="#" class="accept-quest" @click.stop.prevent="acceptQuest(text.id, npcId)">接受任务</a>
                                            </template>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 空状态提示 -->
                <div v-if="currentMobList.length === 0 && currentNpcList.length === 0" class="empty-state">
                    <p>当前地图没有怪物和NPC</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useUserStore } from '@/stores/userStore'
import { useMapStore } from '@/stores/mapStore'
import { useUiStore } from '@/stores/uiStore'
import { useMobStore } from '@/stores/mobStore'
import { useNpcStore } from '@/stores/npcStore'
import { useQuestStore } from '@/stores/questStore'
import { useActionStore } from '@/stores/actionStore';

const userStore = useUserStore();
const mapStore = useMapStore();
const uiStore = useUiStore();
const mobStore = useMobStore();
const npcStore = useNpcStore();
const questStore = useQuestStore();
const actionStore = useActionStore();

const mapUrl = computed(() => mapStore.getMapImage(userStore.currentRole.map))

const mapList = computed(() => mapStore.getAreaFromMapId(userStore.currentRole.map).reflect_map)

const currentMapId = computed(() => userStore.currentRole.map);
const currentPoint = computed(() => mapStore.mapData[currentMapId.value])
const visiblePoints = computed(() => {
    if (!currentPoint.value) return []
    const ids = [currentMapId.value, ...(currentPoint.value.link_map || [])]
    return ids
        .filter((id, index) => mapStore.mapData[id] && ids.indexOf(id) === index)
        .map(id => mapStore.mapData[id])
})
const pointImageUrl = computed(() => mapStore.getMapImage(userStore.currentRole.map))
const pointLinks = computed(() => {
    if (!currentPoint.value) return []
    return visiblePoints.value
        .filter(point => point.id !== currentMapId.value)
        .map(point => {
            const x1 = currentPoint.value.position.x
            const y1 = currentPoint.value.position.y
            const x2 = point.position.x
            const y2 = point.position.y
            const dx = x2 - x1
            const dy = y2 - y1
            const length = Math.sqrt(dx * dx + dy * dy)
            const angle = Math.atan2(dy, dx) * 180 / Math.PI
            return {
                id: point.id,
                style: {
                    left: `${x1}px`,
                    top: `${y1}px`,
                    width: `${length}px`,
                    transform: `rotate(${angle}deg)`
                }
            }
        })
})

const pointMapStyle = computed(() => {
    if (!currentPoint.value || !imageSize.value.width || !imageSize.value.height) {
        return {}
    }
    const offsetX = imageSize.value.width / 2 - currentPoint.value.position.x
    const offsetY = imageSize.value.height / 2 - currentPoint.value.position.y
    return {
        transform: `translate(${offsetX}px, ${offsetY}px)`
    }
})

const viewers = [
    { name: 'map', label: 'map viewer' },
    { name: 'point', label: 'point viewer' }
]
const activeViewer = ref('map')

// 不确定有没有用先不删
const imageSize = ref({ width: 0, height: 0 });
const loading = ref(false);
const handleImageLoad = (action) => {
    loading.value = false;
    const img = action.target;
    imageSize.value = {
        width: img.naturalWidth,
        height: img.naturalHeight
    };
};

// 锁定动作！！！！
const handlePointClick = (point) => {
    console.log(point);
    if (mapStore.isMovable(userStore.currentRole.map, point)) {
        actionStore.sendMoveAction(point)
    } else {
        uiStore.addDialog("error", "不是相邻的地图无法移动")
    }
};

// 当前地图的怪物列表
const currentMobList = computed(() => {
    return currentPoint.value?.mob_list || []
})

// 当前地图的NPC列表
const currentNpcList = computed(() => {
    return currentPoint.value?.npc || []
})

// 获取NPC名称
const getNpcName = (npcId) => {
    return npcStore.npcData[npcId]?.name_chs || `NPC ${npcId}`
}

// 获取NPC图标
const getNpcIcon = (npcId) => {
    return npcStore.getNpcIcon(npcId)
}

// NPC 展开与 detail 控制
const expandedNpc = ref(null)
const openedDetail = ref(null)

const toggleNpc = async (npcId) => {
    if (expandedNpc.value === npcId) {
        expandedNpc.value = null
        openedDetail.value = null
        return
    }

    // 点击 NPC 时只加载文本详情（基础数据应在地图切换时已加载）
    await npcStore.loadNpcText(npcId)
    // preload any linked quest data so submit checks work
    const texts = npcStore.getNpcTexts(npcId) || []
    for (const t of texts) {
        const qid = t.link_quest || t.id
        if (qid) await questStore.loadQuest(qid)
    }
    expandedNpc.value = npcId
}

const toggleDetail = (npcId, textId) => {
    const key = `${npcId}-${textId}`
    if (openedDetail.value === key) {
        openedDetail.value = null
    } else {
        openedDetail.value = key
    }
}

// 接受任务
const acceptQuest = (questId, npcId) => {
    questStore.sendQuest(questStore.commandInt.ACCEPT, parseInt(questId), npcId)
}

const submitQuest = (questId, npcId = 0) => {
    questStore.sendQuest(questStore.commandInt.SUBMIT, parseInt(questId), npcId)
}

const cancelQuest = (questId) => {
    questStore.sendQuest(questStore.commandInt.CANCEL, parseInt(questId))
}

// 判断任务是status状态
const isQuestStatus = (questId, status) => {
    const qmap = userStore.currentRole?.quest || {}
    // console.log("questID-status-check_status", questId, Number(qmap[questId]), status)
    return Number(qmap[questId]) === status
}

// 判断是否满足提交条件（背包中有足够物品）
const canSubmit = (questId) => {
    return questStore.questCanSubmit(questId)
}

// 
const canNpcTextShow = (invisible_arr, visible_arr) => {
    // 如果 invisible_arr 存在且包含任一已完成任务，则该文本应隐藏（完成、联动任务完成检查）
    if (Array.isArray(invisible_arr) && invisible_arr.length) {
        for (const qid of invisible_arr) {
            if (!qid) continue
            if (isQuestStatus(qid, questStore.statusInt.FINISH)) 
                return false
        }
    }

    // 如果 visible_arr 存在且包含任一未完成任务，则该文本应隐藏（前置任务检查）
    // if (Array.isArray(visible_arr) && visible_arr.length) {
    //     for (const qid of visible_arr) {
    //         if (!qid) continue
    //         if (!isQuestStatus(qid, questStore.statusInt.FINISH)) 
    //             return false
    //     }
    // }

    // 默认显示
    return true
}

// 返回可见的 npc 文本，避免模板中同时使用 v-for 与 v-if
const visibleNpcTexts = (npcId) => {
    const texts = npcStore.getNpcTexts(npcId) || []
    const filtered = npcStore.npcTextFilter(npcId, texts)
    return filtered.filter(t => t && canNpcTextShow(t.invisible, t.visible))
}

// 组件挂载时初始化（不在挂载时加载 NPC 数据）
onMounted(async () => {
    await mobStore.loader()
})

</script>

<style scoped>
.map-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.viewer-nav {
    position: relative;
    z-index: 2;
    display: flex;
    gap: 10px;
    width: 100%;
    padding: 12px 16px 8px;
    background: rgba(255, 255, 255, 0.95);
    box-sizing: border-box;
    flex-shrink: 0;
}

.map-content-wrapper {
    display: flex;
    flex: 1;
    overflow: hidden;
    min-height: 0;
}

.map-left-panel {
    flex: 1;
    overflow: auto;
    position: relative;
    min-width: 0;
}

.map-right-panel {
    width: 320px;
    background: rgba(255, 255, 255, 0.95);
    border-left: 1px solid #e5e7eb;
    overflow-y: auto;
    padding: 20px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.info-section {
    background: #f9fafb;
    border-radius: 8px;
    padding: 16px;
    border: 1px solid #e5e7eb;
}

.section-title {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    border-bottom: 2px solid #3b82f6;
    padding-bottom: 8px;
}

.current-map-info {
    text-align: center;
}

.map-name {
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 4px 0;
}

.map-id {
    font-size: 12px;
    color: #6b7280;
    margin: 0;
}

.mob-list,
.npc-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.mob-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    background: white;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    transition: all 0.2s ease;
}

.mob-item:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-color: #3b82f6;
}

.mob-icon {
    width: 40px;
    height: 40px;
    object-fit: contain;
    flex-shrink: 0;
}

.mob-name {
    font-size: 14px;
    font-weight: 500;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
}

.npc-item {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 10px;
    background: white;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    transition: all 0.2s ease;
}

.npc-item:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-color: #10b981;
}

.npc-icon {
    width: 40px;
    height: 40px;
    object-fit: contain;
    flex-shrink: 0;
}

.npc-name {
    font-size: 14px;
    font-weight: 500;
    color: #1f2937;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* NPC header 可点击 */
.npc-header {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    cursor: pointer;
    justify-content: space-between;
}

.npc-text-titles {
    margin-top: 8px;
}

.npc-text-title {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 8px 10px;
    background: #ffffff;
    margin-bottom: 8px;
}

.quest-row {
    margin-top: 6px;
}

.cancel-quest,
.submit-quest,
.accept-quest {
    display: inline-block;
    padding: 4px 8px;
    font-size: 13px;
    color: #065f46;
    background: rgba(16,185,129,0.08);
    border: 1px solid rgba(16,185,129,0.18);
    border-radius: 6px;
    text-decoration: none;
    transition: background-color 0.12s ease, transform 0.08s ease;
    cursor: pointer;
}

.accept-quest:hover {
    background: rgba(16,185,129,0.12);
    transform: translateY(-1px);
}

.accept-quest.accepted {
    opacity: 0.6;
    color: rgba(6,95,70,0.6);
    background: rgba(16,185,129,0.04);
    border-color: rgba(16,185,129,0.08);
    cursor: default;
    pointer-events: none;
}

.submit-wrapper { position: relative; display: inline-block; margin-left: 8px }
.submit-quest.disabled { opacity: 0.6; cursor: default; pointer-events: none; background: rgba(16,185,129,0.04); border-color: rgba(16,185,129,0.08); color: rgba(6,95,70,0.6) }
.submit-wrapper .tooltip { position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%) translateY(6px); background: rgba(17,24,39,0.95); color: #fff; padding: 6px 8px; border-radius: 6px; font-size: 12px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .12s ease, transform .12s ease }
.submit-wrapper:hover .tooltip { opacity: 1; transform: translateX(-50%) translateY(0) }

.title-row {
    cursor: pointer;
    user-select: none;
}

.npc-detail {
    margin-top: 8px;
    padding: 8px;
    background: #f8fafc;
    border-radius: 4px;
    border-left: 3px solid #10b981;
}

.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #9ca3af;
    font-style: italic;
}

.map-viewer {
    position: relative;
    width: 100%;
}

.point-viewer {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: 16px 0 24px;
}

.point-viewer .point-name {
    opacity: 1;
}

.point-link {
    position: absolute;
    height: 2px;
    background: rgba(59, 130, 246, 0.4);
    border-radius: 999px;
    transform-origin: left center;
    z-index: 0;
}

.point-image-hidden {
    position: absolute;
    width: auto;
    height: auto;
    opacity: 0;
    pointer-events: none;
    visibility: hidden;
}

.point-canvas {
    position: relative;
    overflow: hidden;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
}

.point-map {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.viewer-button {
    padding: 8px 16px;
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    background: #f8fafc;
    color: #1f2937;
    cursor: pointer;
    transition: all 0.2s ease;
}

.viewer-button:hover {
    background: #eff6ff;
}

.viewer-button.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
}

.map-image {
    position: relative;
    display: block;
    width: auto;
    height: auto;
    max-width: none;
    max-height: none;
    object-fit: none;
    -webkit-user-drag: none;
}

.map-points-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.map-point {
    position: absolute;
    border: 1px solid #000;
    /* 黑色细边框 */
    border-radius: 50%;
    transform: translate(-50%, -50%);
    cursor: pointer;
    pointer-events: auto;
    transition: all 0.2s ease;
    box-shadow:
        inset 2px 2px 3px rgba(255, 255, 255, 0.3),
        /* 左上角光泽效果 */
        0 0 2px rgba(0, 0, 0, 0.5);
    /* 轻微外阴影 */
}

/* 不同类型点位的尺寸 */
.map-point[data-type="0"],
.map-point[data-type="2"] {
    width: 14px;
    height: 14px;
}

.map-point[data-type="1"],
.map-point[data-type="3"] {
    width: 10px;
    height: 10px;
}

/* 不同类型点位的颜色 */
.map-point[data-type="0"] {
    background-color: #0088FF;
}

.map-point[data-type="1"] {
    background-color: #FFCC22;
}

.map-point[data-type="2"] {
    background-color: #EE11BB;
}

.map-point[data-type="3"] {
    background-color: #33CCFF;
}


.map-point:hover {
    transform: translate(-50%, -50%) scale(1.5);
    z-index: 10;
    box-shadow:
        inset 3px 3px 4px rgba(255, 255, 255, 0.4),
        /* 放大后的光泽效果 */
        0 0 4px rgba(0, 0, 0, 0.7);
    /* 放大后的外阴影 */
}

.point-name {
    position: absolute;
    top: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    background-color: rgba(0, 0, 0, 0.45);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    opacity: 1;
    transition: none;
    pointer-events: none;
    border: 1px solid rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(4px);
}

.map-point:hover .point-name {
    opacity: 1;
}

.point-id {
    position: absolute;
    top: -18px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    color: white;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 1px 3px;
    border-radius: 3px;
    border: 1px solid #333;
    opacity: 0.7;
    transition: opacity 0.2s;
}

.map-point:hover .point-id {
    opacity: 1;
}

.current-pointer {
    position: absolute;
    bottom: 28px;
    /* 改为在点位下方显示 */
    left: 50%;
    transform: translateX(-50%) rotate(180deg);
    /* 添加旋转180度 */
    width: 24px;
    height: 24px;

    /* 水晶箭头设计 */
    background:
        linear-gradient(135deg,
            rgba(178, 34, 34, 0.95) 0%,
            rgba(220, 20, 60, 0.95) 50%,
            transparent 51%),
        linear-gradient(-135deg,
            rgba(178, 34, 34, 0.95) 0%,
            rgba(220, 20, 60, 0.95) 50%,
            transparent 51%);
    border: 2px solid white;

    clip-path: polygon(50% 0%,
            100% 100%,
            50% 70%,
            0% 100%);

    /* 发光效果 */
    filter:
        drop-shadow(0 2px 4px rgba(178, 34, 34, 0.5)) brightness(1.1);
    /* 更改发光颜色至更深的红色 */

    /* 修正后的浮动动画 */
    animation: crystal-float 1.8s ease-in-out infinite;
}

/* 调整动画方向 */
@keyframes crystal-float {

    0%,
    100% {
        transform: translateX(-50%) rotate(180deg) translateY(0) scale(1);
        opacity: 0.9;
    }

    50% {
        transform: translateX(-50%) rotate(180deg) translateY(-10px) scale(1.1);
        opacity: 1;
    }
}

/* 调整光圈位置 */
.map-point[data-current="true"]::after {
    top: auto;
    bottom: -6px;
}
</style>