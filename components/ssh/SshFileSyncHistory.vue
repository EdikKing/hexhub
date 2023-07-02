<template>
  <file-sync-history
      ref="syncHistory"
      :loading="loading"
      :progress="progress"
      :tooltip="tooltip"
      v-model:status="status"
      v-model:items="items"
      title="文件传输"
      :counts="counts"
      @contextMenuItem="onContextMenuItem"
  ></file-sync-history>
</template>

<script lang="ts">
import {reactive, ref,shallowRef, onMounted, onUnmounted,watch, getCurrentInstance} from "vue";
import FileSyncHistory,{SyncType,SyncStatus,FileItem} from "~/components/file/FileSyncHistory.vue";
import {PropType} from "#app/compat/capi";
import Rpc from "~/lib/rpc"
import {ContextMenu} from "~/lib/layer";
import {pathParent} from "~/lib/util/common";
import Toast from "~/lib/layer/toast";

const TypeOpenFie = "openFile"
const TypeQueueChangePush = "queueChangePush"
const TypeQueueSwitchQueryStatus = "queueSwitchQueryStatus"
const TypeQueueClearAll = "queueClearAll"
const TypeQueueClear = "queueClear"
const TypeQueueStop = "queueStop"
const TypeQueueRestart = "queueRestart"
const TypeQueueResume = "queueResume"
const TypeQueueOnSucceed = "queueOnSucceed"
const TypeQueueOnFailed = "queueOnFailed"

export default {
  name: "SshFileSyncHistory",
  components: {FileSyncHistory},
  props: {
    rpc: {
      type: Object as PropType<Rpc>,
    }
  },
  emits: ['onTaskSucceed','onTaskFailed'],
  setup(props,ctx) {
    const progress = ref(0)
    const loading = ref(false)
    const tooltip = ref<boolean|string>(false)
    const status = ref<number>(SyncStatus.Processing)
    const items = shallowRef<FileItem[]>([])
    const counts = shallowRef(undefined)
    const cacheMap = new Map<number,FileItem>()

    const proxy = <any>getCurrentInstance().proxy

    watch(()=>status.value,()=>{
      loading.value = true
      items.value = []
      if(props.rpc != null){
        props.rpc.send(TypeQueueSwitchQueryStatus,{
          status: status.value
        })
      }
    })

    watch(()=>props.rpc,()=>{
      if(props.rpc == null){
        return
      }
      props.rpc.on(TypeQueueOnSucceed,(p)=>{
        const task = <FileItem>p.json()
        ctx.emit('onTaskSucceed',task)
        Toast.success(`文件${task.name}${task.type==SyncType.Upload?'上传':'下载'}成功`,1000)
      })
      props.rpc.on(TypeQueueOnFailed,(p)=>{
        const task = <FileItem>p.json()
        ctx.emit('onTaskFailed',task)
        Toast.error(`文件${task.name}${task.type==SyncType.Upload?'上传':'下载'}失败`,1000)
      })
      props.rpc.on(TypeQueueChangePush,(p)=>{
        const data = <{status:number,tasks:FileItem[],counts:number[]}>p.json()
        counts.value = data.counts
        if(data.status === SyncStatus.Processing){
          //计算进度和tooltip
          if(data.tasks.length === 0){
            progress.value = 0
          }else{
            //取进行中进度最大的作为进度显示源
            progress.value = data.tasks.map(item=>item.total === 0 ? 1 : item.current/item.total).reduce((previousValue, currentValue,idx,arr)=>{
              return Math.max(previousValue,currentValue)
            },0) * 100
          }
        }
        if(data.status === status.value){
          loading.value = false
          items.value = data.tasks
          //还原item状态，防止更新，选择状态丢失
          data.tasks.forEach((item,idx,arr)=>{
            let cache = cacheMap.get(item.id)
            if(cache){
              cache.speed = item.speed
              cache.status = item.status
              cache.current = item.current
              cache.error = item.error
              cache.completedTime = item.completedTime
              arr[idx] = cache
            }
          })
          cacheMap.clear()
          data.tasks.forEach((item)=>{
            cacheMap.set(item.id,item)
          })
        }

      })
    })

    const onContextMenuItem = (evt:MouseEvent,items:FileItem[])=>{
      //有选中的任意一个item为不允许中断，则无法点击重新启动
      let disableRestart = items.some(item=>!item.allowRestart)
      ContextMenu.open(evt,[
        {
          type: "title",
          title: proxy.$t('common.operate'),
        },
        {type: "line"},
        {
          type: "item",
          title: proxy.$t('file.open'),
          icon: "mdi-file-eye-outline",
          disabled: !items.some(file=>file.status===SyncStatus.Completed||file.type === SyncType.Upload),
          click: ()=>{
            if(props.rpc != null){
              const paths = items.map((item)=>{
                if(item.type === SyncType.Download){
                  return item.targetPath
                }else{
                  return item.srcPath
                }
              })
              props.rpc.sendWaitReply(TypeOpenFie, {paths}).catch((err)=>{
                Toast.error(err.message)
              })
            }
          }
        },
        {
          type: "item",
          title: proxy.$t('file.open-explorer'),
          icon: "mdi-folder-eye-outline",
          disabled: items.length === 0,
          click: ()=>{
            if(props.rpc != null){
              const paths = Array.from(new Set(items.map((item)=>{
                if(item.type === SyncType.Download){
                  return pathParent(item.targetPath)
                }else{
                  return pathParent(item.srcPath)
                }
              })))
              props.rpc.sendWaitReply(TypeOpenFie, {paths}).catch((err)=>{
                Toast.error(err.message)
              })
            }
          }
        },
        {
          type: "item",
          title: proxy.$t('common.clear'),
          icon: "mdi-close-circle-outline",
          disabled: items.length === 0,
          click: ()=>{
            const ids = items.map((item)=>item.id)
            props.rpc.sendWaitReply(TypeQueueClear, {status:status.value,ids}).catch((err)=>{
              Toast.error(err.message)
            })
          }
        },
        {
          type: "item",
          title: proxy.$t('common.clear-all'),
          icon: "mdi-cancel",
          click: ()=>{
            props.rpc.sendWaitReply(TypeQueueClearAll, {status:status.value}).catch((err)=>{
              Toast.error(err.message)
            })
          }
        },
        {
          type: "item",
          title: proxy.$t('common.start'),
          icon: "mdi-play-circle-outline",
          disabled: items.length===0||disableRestart||!(status.value===SyncStatus.Stop||status.value === SyncStatus.Queueing),
          click: ()=>{
            const ids = items.map((item)=>item.id)
            props.rpc.sendWaitReply(TypeQueueResume, {ids}).catch((err)=>{
              Toast.error(err.message)
            })
          }
        },
        {
          type: "item",
          title: proxy.$t('common.restart'),
          icon: "mdi-alpha-r-circle-outline",
          disabled: items.length===0||disableRestart||!(status.value===SyncStatus.Failed||status.value === SyncStatus.Completed),
          click: ()=>{
            const ids = items.map((item)=>item.id)
            props.rpc.sendWaitReply(TypeQueueRestart, {ids,status:status.value}).catch((err)=>{
              Toast.error(err.message)
            })
          }
        },
        {
          type: "item",
          title: proxy.$t('common.pause'),
          icon: "mdi-pause-circle-outline",
          disabled: items.length===0||!(status.value===SyncStatus.Processing),
          click: ()=>{
            const ids = items.map((item)=>item.id)
            props.rpc.sendWaitReply(TypeQueueStop, {ids}).catch((err)=>{
              Toast.error(err.message)
            })
          }
        },
      ],180).then(()=>{})
    }
    return {
      counts,loading,tooltip,status,items,progress,
      onContextMenuItem
    }
  }
}
</script>

<style lang="scss">

</style>