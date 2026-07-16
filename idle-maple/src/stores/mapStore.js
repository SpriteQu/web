import { defineStore } from "pinia"
import { ref } from "vue"

export const useMapStore = defineStore("map", () => {
    const mapWorldData = ref({})
    const mapAreaData = ref({})
    const mapData = ref({})

    const loadMapWorld = async () => {
        try {
            const module = await import('@/data/map/map_world.json')
            const jsonData = module.default
            jsonData.data.forEach(mapWorld => {
                mapWorldData.value[mapWorld.id] = {
                    id: mapWorld.id,
                    name_chs: mapWorld.name_chs,
                    reflect_area: mapWorld.reflect_area ? mapWorld.reflect_area.split(',').map(Number) : []
                }
            })
            console.log('加载地图世界完成')
        } catch (error) {
            console.error('加载地图世界数据失败:', error)
        }
    }

    const loadMapArea = async () => {
        try {
            const module = await import('@/data/map/map_area.json')
            const jsonData = module.default
            jsonData.data.forEach(mapArea => {
                mapAreaData.value[mapArea.id] = {
                    id: mapArea.id,
                    name_chs: mapArea.name_chs,
                    from_world: mapArea.from_world,
                    reflect_map: mapArea.reflect_map ? mapArea.reflect_map.split(',').map(Number) : []
                }
            })
            console.log('加载地图区域完成')
        } catch (error) {
            console.error('加载地图区域数据失败:', error)
        }
    }

    const loadMap = async () => {
        try {
            const module = await import('@/data/map/map.json')
            const jsonData = module.default
            jsonData.data.forEach(map => {
                let linkMap = []
                if (map.link_map) {
                    linkMap = String(map.link_map).split(',').map(id => parseInt(id.trim()))
                }
                linkMap = map.link_map ? String(map.link_map).split(',').map(id => parseInt(id.trim())) : []
                const mobList = []
                if (map.mobs) {
                    map.mobs.split(',').forEach(m => {
                        const [key, value] = m.split('|')
                        mobList.push({
                            mob_id: parseInt(key),
                            rate: parseFloat(value)
                        })
                    })
                }
                let npcList = []
                if (map.npc) {
                    npcList = String(map.npc).split(',').map(id => parseInt(id.trim()))
                }
                // 解析position为{x: x_num, y: y_num}
                const [x = 0, y = 0] = map.position ? String(map.position).split(',').map(v => parseInt(v.trim())) : [];
                const position = { x, y };
                mapData.value[map.id] = {
                    id: map.id,
                    name_chs: map.name_chs,
                    from_area: map.from_area,
                    position: position,
                    icon_type: map.icon_type || 0,
                    link_map: linkMap,
                    mob_list: mobList,
                    npc: npcList
                }
            })
            console.log('加载地图完成')
        } catch (error) {
            console.error('加载地图数据失败:', error)
        }
    }

    const loader = async () => {
        if (Object.keys(mapWorldData).values.length === 0) {
            await loadMapWorld()
        }
        if (Object.keys(mapAreaData).values.length === 0) {
            await loadMapArea()
        }
        if (Object.keys(mapData).values.length === 0) {
            await loadMap()
        }
    }

    const getAreaFromMapId = (mapId) => {
        const areaId = mapData.value[mapId].from_area
        return mapAreaData.value[areaId]
    }

    const getMapImage = (mapId) => {        // 其实是查询map所在area的地图
        const areaId = getAreaFromMapId(mapId).id
        return `/src/assets/map/area/${areaId}.png`
    }

    const getMapPointImage = (pointId) => {
        return `/src/assets/map/module/${pointId}.png`
    }

    // 可移动性判定
    const isMovable = (nowMap, targetMap) => {
        return mapData.value[nowMap]?.link_map.includes(targetMap)
    }

    return {
        mapWorldData,
        mapAreaData,
        mapData,
        loader,
        getAreaFromMapId,
        getMapImage,
        getMapPointImage,
        isMovable,
    }
})
