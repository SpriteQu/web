import config from '@/config'

export const handleImageError = (action) => {
  const target = action?.target
  if (target) {
    target.src = config.staticAssets.defaultIcon
  }
}
