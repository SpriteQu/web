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
const staticAssets = {
  defaultIcon: '/src/assets/miss.png',
  itemIconBase: '/src/assets/item',
  equipmentIconBase: '/src/assets/equipment'
};

// 环境特定的URL配置
const url = isDev ? {
  apiUrl: 'http://127.0.0.1:6281',
  staticUrl: 'http://127.0.0.1:6282',
  wsUrl: 'ws://127.0.0.1:6283'
} : {
  apiUrl: 'http://a.com:6281',
  staticUrl: 'http://a.com:6282',
  wsUrl: 'ws://a.com:6283'
};

// 合并配置
export default {
  ...url,
  ...path,
  staticAssets
};