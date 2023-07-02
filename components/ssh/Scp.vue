<template>
<div>
  <file-upload :tips="$t('ssh.scp-upload-tips')" ref="scpUpload" @onClose="onUploadDialogClose" @pause="abortUpload" @start="startUpload" @remove="abortUpload"></file-upload>
</div>
</template>

<script lang="ts">

import {PropType} from "#app/compat/capi";
import {getCurrentInstance, ref} from "vue"

const packetTypeScpUpload = "scpUpload"
const packetTypeScpDownload = "scpDownload"

import FileUpload from "~/components/file/FileUpload.vue";
import Rpc from "~/lib/rpc";
import {api} from "~/apis/client/base";
import {TableHeader} from "~/components/common/AdvancedTable.vue";
import {onUnmounted, reactive} from "vue";
import {FileCoverConfirm, Prompt, Toast} from "~/lib/layer";
export default {
  name: "Scp",
  components: {FileUpload},
  props:{
    rpc: {
      type: Object as PropType<Rpc>,
    }
  },
  setup(props,ctx){
    const proxy = <any>getCurrentInstance().proxy
    let queue = {}
    let coverPromise = null
    //文件存在是，选择覆盖还是跳过（true覆盖，false跳过，null未选择）
    let coverSkip = null
    let currentPath = null
    let id = 0

    const scpUpload = ref()

    /**
     *
     * @param path
     * @param files
     */
    const openUpload = (path,files?:FileList|DataTransferItemList)=>{
      currentPath = path
      coverSkip = null
      scpUpload.value.open(proxy.$t('scp.dialog-title',{path:path}),files)
    };

    /**
     *
     * @param rpc : Rpc
     * @param path
     */
    const openDownload = (path)=>{
      Prompt.open(proxy.$t("ssh.scp-download-title"),path).then((v)=> {
        props.rpc.sendWaitReply(packetTypeScpDownload, v).then((p) => {
          window.open(p.string())
        }).catch(err => {
          Toast.error(err.message)
        })
      })
    };

    const onUploadDialogClose = ()=>{
      clearAllQueue()
    };

    const clearAllQueue = ()=>{
      for (const key in queue) {
        const controller = queue[key]
        controller.abort()
      }
      queue = {}
    };
    const abortUpload = (file)=>{
      file.current = 0
      if(file.taskId){
        const controller = queue[file.taskId]
        if(controller){
          controller.abort()
          delete queue[file.taskId]
        }
      }
    };
    //如果上传时文件已存在选择覆盖还是跳过
    const isFileCoverSkip = async (file) => {
      //如果之前已经选择过是否跳过，则直接返回结果
      if(coverSkip !== null){
        return coverSkip
      }
      //如果已经有一个选择框弹出正在选择，那么等待这个选择框的选择结果
      if (coverPromise != null) {
        try {
          //覆盖
          const result = await coverPromise
          //如果这个弹窗是全部应用，则直接取这个弹窗的选择结果
          if(result.allApply){
            coverSkip = true
            return true
          }
        }catch (e){
          //跳过
          //如果这个弹窗是全部应用，则直接取这个弹窗的选择结果
          if(e.allApply){
            coverSkip = false
            return false
          }
        }
      }
      //如果有正在显示的弹窗，或者正在显示的弹窗没有选择全部应用，那么再弹出本文件选择覆盖或跳过的弹窗
      coverPromise = FileCoverConfirm.open(file)
      try {
        //覆盖
        const result = await coverPromise
        //全部应用
        if(result.allApply){
          coverSkip = true
        }
        return true
      }catch (e){
        //跳过
        //全部应用
        if(e.allApply){
          coverSkip = false
        }
        return false
      }
    };
    const startUpload = (file,force,updateCurrentFunc,errorFunc,completedFunc)=>{
      const fileInfo = {
        "size": file.size,
        "perm": 666,
        "path": currentPath +'/'+file.path,
        "updatedTime": file.updatedTime,
      }
      if(!file.taskId){
        file.taskId = "f"+(id++)
      }
      props.rpc.sendWaitReply(packetTypeScpUpload, fileInfo).then(async (p) => {
        const res = p.json()
        //在非强制上传模式下，如果服务器已存在该文件，则需要弹窗让用户选择覆盖还是跳过
        if(!force){
          if (res.existed) {
            if (!await isFileCoverSkip(file.name)) {
              //跳过
              errorFunc(file,proxy.$t("common.skip"))
              return
            }
          }
        }
        const formData = new FormData();
        formData.append('file', file.file);
        const controller = new AbortController();
        queue[file.taskId] = controller
        api.request({
          method: 'post',
          url: res.uri, // 接口地址
          data: formData,
          baseURL: "",
          signal: controller.signal,
          // 上传进度
          onUploadProgress: (progressEvent) => {
            file.current = progressEvent.loaded
            updateCurrentFunc()
          }
        }).then(r => {
          completedFunc(file)
        }).catch(res => {
          console.log("err", res)
          errorFunc(file, res?.response?.data?.message?res.response.data.message:res?.message)
        }).finally(() => {
          delete queue[file.taskId]
        });
      }).catch(err => {
        // console.log("err",err)
        errorFunc(file,err.message)
      })
    }

    onUnmounted(()=>{
      clearAllQueue()
    })

    return {
      scpUpload,onUploadDialogClose,abortUpload,startUpload,openUpload,openDownload,clearAllQueue
    }
  },
}
</script>

<style scoped>

</style>
