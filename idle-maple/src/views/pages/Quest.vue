<template>
  <div class="page-container">
    <div class="info-section quest-category">

      <div class="category-box">
        <div class="category-header">
          <button class="category-toggle" @click="toggleCategory" :aria-expanded="categoryOpen">
            进行中的任务
            <span class="chev" :class="{open: categoryOpen}" aria-hidden></span>
          </button>
        </div>

        <div class="category-body" v-if="categoryOpen">
        <div v-if="inProgress.length === 0" class="empty-tip">无进行中的任务</div>
        <div v-else class="quest-list">
          <div v-for="id in inProgress" :key="id" class="quest-item">
            <div class="quest-header" @click="toggleQuest(id)">
              <span class="quest-title">{{ questStore.questData[id]?.describe || `任务 ${id}` }}</span>
              <button class="toggle-btn" :class="{open: openedQuest.includes(id)}" aria-hidden="true"></button>
            </div>

            <div v-if="openedQuest.includes(id)" class="quest-detail">
              <!-- <p class="quest-desc">{{ questStore.questData[id]?.describe || '' }}</p> -->
              <div class="quest-meta">
                <div class="meta-row"><strong>提交：</strong>
                  <span v-if="questStore.questData[id] && questStore.questData[id].submit.length">
                    <span v-for="it in questStore.questData[id].submit" :key="it.id" class="item-chip">{{ itemStore.getItemName(it.id) }} x{{ it.count }}</span>
                  </span>
                  <span v-else>—</span>
                </div>
                <div class="meta-row"><strong>奖励：</strong>
                  <span v-if="questStore.questData[id] && questStore.questData[id].reward.length">
                    <span v-for="it in questStore.questData[id].reward" :key="it.id" class="item-chip">{{ itemStore.getItemName(it.id) }} x{{ it.count }}</span>
                  </span>
                  <span v-else>—</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      </div>
      <!-- 已完成的任务（隐藏，暂不实现） -->
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useQuestStore } from '@/stores/questStore'
import { useItemStore } from '@/stores/itemStore'

const userStore = useUserStore()
const questStore = useQuestStore()
const itemStore = useItemStore()

const openedQuest = ref([])
const categoryOpen = ref(true)

const toggleCategory = () => {
  categoryOpen.value = !categoryOpen.value
}

const inProgress = computed(() => {
  const qmap = userStore.currentRole?.quest || {}
  const ids = Object.keys(qmap || {}).filter(k => Number(qmap[k]) === questStore.statusInt.ACCEPT)
  return ids
})

const toggleQuest = async (id) => {
  const idx = openedQuest.value.indexOf(id)
  if (idx !== -1) {
    openedQuest.value.splice(idx, 1)
    return
  }
  openedQuest.value.push(id)
  // 确保加载详情
  await questStore.loadQuest(id)
}

onMounted(async () => {
  await itemStore.loader()
  // 预加载正在进行的任务数据
  for (const id of inProgress.value) {
    await questStore.loadQuest(id)
  }
})

</script>

<style scoped>
.page-container { padding: 24px; }
.quest-category { background: transparent; padding: 16px; border-radius: 10px; width: 80%; margin: 0 auto; box-sizing: border-box }
.category-header { margin-bottom:12px; display:flex; align-items:center; }
.category-toggle { background: transparent; border: none; padding: 0; font-size: 20px; font-weight: 700; color: #0f172a; display:flex; align-items:center; gap:8px }
.category-body { padding: 12px; width: 100%; box-sizing: border-box; background: transparent; border-radius: 6px }
.quest-list { display:flex; flex-direction: column; gap: 10px; }
.quest-item { background: inherit; border: 1px solid rgba(16,185,129,0.25); border-radius: 8px; padding: 10px 12px; }
.quest-header { display:flex; justify-content:space-between; align-items:center; cursor:pointer }
.quest-title { font-weight:600; font-size: 15px; }
.toggle-btn { background:transparent; border:none; color:#3b82f6; cursor:pointer; font-size: 13px; width:18px; height:18px; padding:0 }
.toggle-btn::after { content:'▸'; display:inline-block; transition: transform .12s ease; color:#3b82f6 }
.toggle-btn.open::after { transform: rotate(90deg) }
.quest-detail { margin-top:10px; background: inherit; padding:10px; border-radius:8px }
.meta-row { margin-top:8px; font-size: 13px }
.item-chip { margin-right: 8px; display: inline-block }
.empty-tip { color:#9ca3af }
.chev::after { content:'▾'; display:inline-block; transition: transform .12s ease; color:#334155 }
.chev.open::after { transform: rotate(180deg) }

.category-box { background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 12px; overflow: hidden }

/* responsive: full width on small screens */
@media (max-width: 800px) {
  .quest-category { width: 100%; padding: 22px }
  .category-body { width: 100%; padding-left: 0 }
}
</style>
