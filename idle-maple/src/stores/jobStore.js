import { defineStore } from 'pinia'
import { ref } from 'vue'
import config from '@/config'

export const useJobStore = defineStore('job', () => {
    const baseJobData = ref({})
    const jobGroupData = ref({})
    const jobData = ref({})
    const availableJobsData = ref([])

    const loadBaseJob = async () => {
        try {
            const module = await import('@/data/job/base_job.json')
            const jsonData = module.default
            jsonData.data.forEach(item => {
                baseJobData.value[item.id] = {
                    id: item.id,
                    name_chs: item.name_chs,
                    grow_hp: item.grow_hp,
                    grow_mp: item.grow_mp,
                    subsidy_hp: item.subsidy_hp,
                    subsidy_mp: item.subsidy_mp
                }
            })
            console.log('基础职业加载完成', Object.keys(baseJobData.value).length)
        } catch (error) {
            console.error('加载基础职业数据失败:', error)
        }
    }

    const loadJobGroup = async () => {
        try {
            const module = await import('@/data/job/job_group.json')
            const jsonData = module.default
            jsonData.data.forEach(item => {
                const initAp = {}
                if (item.init_ap) {
                    item.init_ap.split(',').forEach(ap => {
                        const [key, value] = ap.split('|')
                        initAp[parseInt(key)] = parseInt(value)
                    })
                }
                jobGroupData.value[item.id] = {
                    id: item.id,
                    name_chs: item.name_chs,
                    init_ap: initAp
                }
            })
            console.log('职业群加载完成', Object.keys(jobGroupData.value).length)
        } catch (error) {
            console.error('加载职业群数据失败:', error)
        }
    }

    const loadJob = async () => {
        try {
            const module = await import('@/data/job/job.json')
            const jsonData = module.default
            jsonData.data.forEach(item => {
                const statFactor = {}
                if (item.stat_factor) {
                    item.stat_factor.split(',').forEach(sf => {
                        const [key, value] = sf.split('|')
                        statFactor[parseInt(key)] = parseInt(value)
                    })
                }
                jobData.value[item.id] = {
                    id: item.id,
                    name_chs: item.name_chs,
                    from_base_job: parseInt(item.from_base_job),
                    from_job_group: parseInt(item.from_job_group),
                    stat_factor: statFactor,
                    phase: item.phase
                }
            })
            console.log('职业加载完成', Object.keys(jobData.value).length)
        } catch (error) {
            console.error('加载职业数据失败:', error)
        }
    }

    const loadAvailableJobs = async () => {
        try {
            const module = await import('@/data/job/available_job.json')
            const jsonData = module.default
            jsonData.data.forEach(item => {
                availableJobsData.value.push(item.job)
            })
            console.log('可创建职业加载完成', availableJobsData.value.length)
        } catch (error) {
            console.error('加载可用职业数据失败:', error)
        }
    }

    const loader = async () => {
        if (Object.keys(baseJobData.value).length === 0){
            await loadBaseJob()
        }
        if (Object.keys(jobGroupData.value).length === 0) {
            await loadJobGroup()
        }
        if (Object.keys(jobData.value).length === 0) {
            await loadJob()
        }
        if (availableJobsData.value.length === 0) {
            await loadAvailableJobs()
        }
    }

    // 获取职业图标路径（后期实装纸娃娃系统会放到avaterStore）
    function getJobIcon(jobId) {
        return config.getJobIconPath(jobId)
    }

    function getJobName(jobId) {
        return jobData.value[jobId].name_chs
    }

    const getJobGroupNameFromJobId = (jobId) => {
        return jobGroupData.value[jobData.value[jobId].from_job_group].name_chs
    }

    const getMaxHpMp = (jobId, level) => {
        const job = jobData.value[jobId]
        const baseJob = baseJobData.value[job.from_base_job]
        const max_hp = 50 + baseJob.grow_hp * (level - 1) + job.phase * baseJob.subsidy_hp
        const max_mp = 50 + baseJob.grow_mp * (level - 1) + job.phase * baseJob.subsidy_mp
        return [ max_hp, max_mp ]
    }

    return {
        baseJobData,
        jobGroupData,
        jobData,
        availableJobsData,
        loader,
        getJobIcon,
        getJobName,
        getJobGroupNameFromJobId,
        getMaxHpMp
    }

})
