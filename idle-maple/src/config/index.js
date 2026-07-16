// 区分开发环境和生产环境
const isDev = 
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

// 公共路径配置
const path = {
  apiPath: { 
    precheck: '/api/check_username',
    login: '/api/login', 
    register: '/api/register',
  },
  wsPath: { 
    root: '/ws' 
  }
};

// 静态资源路径配置
import missAssets from '@/assets/miss.png'
const staticAssets = { defaultIcon: missAssets };
// 配置：图标目录映射
// 批量导入所有图标
const itemModules = import.meta.glob('@/assets/item/*.png', { eager: true, import: 'default' })
const equipmentModules = import.meta.glob('@/assets/equipment/*.png', { eager: true, import: 'default' })
const jobModules = import.meta.glob('@/assets/avatar/job/*.png', { eager: true, import: 'default' })
const mapModules = import.meta.glob('@/assets/map/area/*.png', { eager: true, import: 'default' })
const mapPointModules = import.meta.glob('@/assets/map/module/*.png', { eager: true, import: 'default' })
const mobModules = import.meta.glob('@/assets/mob/*.png', { eager: true, import: 'default' })
const npcModules = import.meta.glob('@/assets/npc/*.png', { eager: true, import: 'default' })
const villageModules = import.meta.glob('@/assets/village/*.png', { eager: true, import: 'default' })
// 工具函数：从 glob 模块构建映射表
const buildIconMap = (globModules) => {
  const map = {}
  for (const [path, module] of Object.entries(globModules)) {
    const fileName = path.split('/').pop().replace('.png', '')
    map[fileName] = module
  }
  return map
}
// 构建映射表
const iconMaps = {
  item: buildIconMap(itemModules),
  equipment: buildIconMap(equipmentModules),
  job: buildIconMap(jobModules),
  map: buildIconMap(mapModules),
  mapPoint: buildIconMap(mapPointModules),
  mob: buildIconMap(mobModules),
  npc: buildIconMap(npcModules),
  village: buildIconMap(villageModules),
}

// 通用获取图标函数
const getIcon = (map, id) => {
  const key = String(id)
  return map[key] || missAssets
}

// 导出所有获取函数
const getItemIconPath = (id) => getIcon(iconMaps.item, id)
const getEquipmentIconPath = (id) => getIcon(iconMaps.equipment, id)
const getJobIconPath = (id) => getIcon(iconMaps.job, id)
const getMapImagePath = (id) => getIcon(iconMaps.map, id)
const getMapPointImagePath = (id) => getIcon(iconMaps.mapPoint, id)
const getMobIconPath = (id) => getIcon(iconMaps.mob, id)
const getNpcIconPath = (id) => getIcon(iconMaps.npc, id)
const getVillageIconPath = (id) => getIcon(iconMaps.village, id)

// 环境特定的URL配置
const url = isDev ? {
  apiUrl: 'http://127.0.0.1:6281',
  staticUrl: 'http://127.0.0.1:6282',
  wsUrl: 'ws://127.0.0.1:6283'
} : {
  apiUrl: 'http://127.0.0.1:6281',
  staticUrl: 'http://127.0.0.1:6282',
  wsUrl: 'ws://127.0.0.1:6283'
};

// 合并配置
export default {
  ...url,
  ...path,
  staticAssets,
  getItemIconPath,
  getEquipmentIconPath,
  getJobIconPath,
  getMapImagePath,
  getMapPointImagePath,
  getMobIconPath,
  getNpcIconPath,
  getVillageIconPath,
};