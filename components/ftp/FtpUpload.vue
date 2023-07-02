<template>
<div>
  <file-upload
      ref="ftpUpload"
      @onClose="onUploadDialogClose"
      @pause="abortUpload"
      @start="startUpload"
      @remove="abortUpload"
></file-upload>
</div>
</template>

<script lang="ts">

import {getCurrentInstance, onUnmounted, ref} from "vue";

const packetTypeBrowserUpload = "browserUpload"

import FileUpload from "~/components/file/FileUpload.vue";
import Rpc from "~/lib/rpc";
import {api, genApiUrl} from "~/apis/client/base";
import axios from "axios";
import {FileCoverConfirm} from "~/lib/layer";
import {PropType} from "#app/compat/capi";
export default {
  name: "FtpUpload",
  components: {FileUpload},
  emits: ["onClose"],
  props:{
    rpc: {
      type: Object as PropType<Rpc>,
    }
  },
  setup(props,ctx) {
    const proxy = <any>getCurrentInstance().proxy
    let queue = {}
    let coverPromise = null
    //文件存在是，选择覆盖还是跳过（true覆盖，false跳过，null未选择）
    let coverSkip = null
    let currentPath = null
    let id = 0

    const ftpUpload = ref()

    /**
     *
     * @param path
     * @param files
     */
    const open = (path,files?:FileList|DataTransferItemList)=>{
      currentPath = path
      coverSkip = null
      ftpUpload.value.open(`FTP文件上传-当前目录:${path}`,files)
    };
    const onUploadDialogClose = ()=>{
      clearAllQueue()
      ctx.emit("onClose")
    };
    const clearAllQueue = ()=>{
      for (const key in queue) {
        const cancel = <AbortController>queue[key]
        cancel.abort()
      }
      queue = {}
    };
    const abortUpload = (file)=>{
      if(file.taskId){
        const cancel = <AbortController>queue[file.taskId]
        if(cancel){
          cancel.abort()
          delete queue[file.taskId]
        }
      }
    };
    //如果上传时文件已存在选择覆盖还是跳过
    const isFileCoverSkip = async (file)=>{
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
      props.rpc.sendWaitReply(packetTypeBrowserUpload, fileInfo).then(async (p) => {
        const res = <{url:string,existed:boolean}>p.json()
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
        if(file.current <= 0){
          formData.append('file', file.file);
        }else{
          //断点续传,因为本地进度不准确，需要向服务器查询上次上传到哪里了，从这里开始接着传
          const data = await api.head(res.url,{baseURL:""})
          file.current = Number.parseInt(data.headers['content-range'])
          const blobFile = <File>file.file
          formData.append('file', blobFile.slice(file.current));
        }
        const lastCurrent = file.current
        const controller = new AbortController();
        queue[file.taskId] = controller
        api.request({
          method: 'post',
          url: res.url, // 接口地址
          data: formData,
          baseURL: "",
          //暂停续传
          headers: lastCurrent <= 0 ? undefined : {Range: `bytes=${lastCurrent}-`},
          signal: controller.signal,
          // 上传进度
          onUploadProgress: (progressEvent) => {
            //如果已暂停就不更新进度了
            if(!controller.signal.aborted) {
              file.current = lastCurrent + progressEvent.loaded
              updateCurrentFunc()
            }
          }
        }).then(r => {
          completedFunc(file)
        }).catch(err => {
          console.log("err", err)
          //如果是主动暂停忽略异常
          if(!controller.signal.aborted){
            errorFunc(file, err?.response?.data?.message?err.response.data.message:err?.message)
          }else{
            //主动暂停更新实际上传进度
            api.head(res.url,{baseURL: ""}).then((res)=>{
              file.current = Number.parseInt(res.headers['content-range'])
              updateCurrentFunc()
            })
          }
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
      ftpUpload,onUploadDialogClose,abortUpload,startUpload,open,clearAllQueue
    }
  },
}
</script>

<style scoped>

</style>
