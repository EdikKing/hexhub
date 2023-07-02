<template>
  <div>
    <v-dialog
      v-model="show"
      persistent
      max-width="650"
      content-class="overflow-hidden">
      <v-card class="overflow-y-hidden" v-drag="'.v-overlay__content'">
        <v-card-title>
          <div style="position: absolute;right: 20px;">
            <v-btn @click="fold" variant="text" size="small" icon="mdi-window-minimize"></v-btn>
            <v-btn @click="close" variant="text" size="small" icon="mdi-close" :disabled="processing > 0"></v-btn>
          </div>
          {{title}}
        </v-card-title>

        <div class="upload-container">
          <div class="tips">
            {{$t('file.upload-tips')}}
          </div>
          <div
              ref="fileDrop"
              v-on:drop="onFileDropCallback"
              v-on:dragover.stop.prevent
              @click="$refs.fileInput.click()"
          >
            <div class="upload-area">
              <div class="icon">
                <v-icon x-large>mdi-upload</v-icon>
              </div>
            </div>
          </div>

          <input style="display: none" type="file" ref="fileInput" multiple @input="onFileSelected"/>
          <input style="display: none" type="file" ref="folderInput" webkitdirectory @input="onFileSelected"/>

          <div class="btns-container">
            <div>
              <v-btn class="mr-1" variant="text" prepend-icon="mdi-arrow-right-drop-circle-outline" size="small" color="success" @click="schedule" :disabled="notDownloaded === 0">
                {{$t('common.start')}}
              </v-btn>
              <v-btn class="mr-1" variant="text" prepend-icon="mdi-pause" size="small" color="warning" @click="allPause" :disabled="processing === 0">
                {{$t('common.pause')}}
              </v-btn>
              <v-btn class="mr-1" variant="text" prepend-icon="mdi-backspace-outline" size="small" color="error" @click="clear" :disabled="completed === 0">
                {{$t('common.clear')}}
              </v-btn>
            </div>

            <div>
              <v-btn variant="text" prepend-icon="mdi-file-upload-outline" size="small" color="blue lighten-1" class="mr-1" @click="$refs.fileInput.click()">
                {{$t('file.upload-file')}}
              </v-btn>
              <v-btn variant="text" prepend-icon="mdi-folder-upload-outline" size="small" color="green lighten-1" @click="$refs.folderInput.click()">
                {{$t('file.upload-folder')}}
              </v-btn>
            </div>
          </div>

          <v-divider></v-divider>

          <div v-if="tips && files.length > 0" style="font-size: 10px; text-align: center; width: 100%; padding-top: 10px;">{{tips}}</div>


          <div class="upload-files">
            <div style="display: flex;justify-content: center;width: 100%;height: 60px"  v-if="files.length === 0">
              <v-alert icon="mdi-alert-octagon-outline" border="start">
                {{$t('file.no-file')}}
              </v-alert>
            </div>

            <v-card
              v-for="(file,idx) in files" :key="idx"
              :rounded="0"
              class="file-card"
            >
              <v-progress-linear :model-value="file.current/file.size*100" :color="statusColor[file.status]"></v-progress-linear>
              <div class="status" :style="{'color':$vuetify.theme.current.colors[statusColor[file.status]]}">
                {{$t(`file.upload-status[${file.status}]`)}}
              </div>
              <div class="upload-info" v-if="file.status === status.error">
                <div v-tooltip="file.message">
                  <span class="error-tips" :style="{'color':$vuetify.theme.current.colors.error}">{{file.message}}</span>
                </div>
              </div>
              <div class="upload-info" v-else>
                <div style="width: 100%;display: flex;justify-content: center">
                  <span :style="{color: '#26a69a',width:'50%'}">{{$fileSizeConvert(file.speed)}}/S</span>
                  <v-icon size="small" >mdi-circle-small</v-icon>
                  <span :style="{color: '#ffa726',width:'50%'}">{{file._finalCurrent===file.size?'100':((file._finalCurrent/file.size)*100).toFixed(1)}}%</span>
                </div>
                <div style="width: 100%;display: flex;justify-content: center">
                  <span :style="{color: '#558b2f',width:'50%'}">{{$fileSizeConvert(file._finalCurrent)}}</span>
                  <v-icon size="small" class="ml-0 mr-0">mdi-circle-small</v-icon>
                  <span :style="{color: '#e53935',width:'50%'}">{{$fileSizeConvert(file.size)}}</span>
                </div>
              </div>
              <div class="upload-file-name">
                <div v-tooltip="file.name">
                  <v-chip size="small" variant="outlined" density="comfortable" color="accent">
                    <v-icon size="x-small" class="mr-1">
                      mdi-file
                    </v-icon>
                    {{file.name}}
                  </v-chip>
                </div>
              </div>
              <v-card-actions>
                <v-row justify="center" no-gutters>
                  <v-btn size="x-small" color="success" class="ml-1 mr-1" variant="text" icon="mdi-arrow-right-drop-circle-outline" v-if="file.status === status.queuing || file.status === status.stop" @click="start(file,true)"></v-btn>
                  <v-btn size="x-small" color="warning" class="ml-1 mr-1" variant="text" icon="mdi-stop-circle-outline" v-else-if="file.status === status.uploading" @click="pause(file)"></v-btn>
                  <v-btn size="x-small" color="primary" class="ml-1 mr-1" variant="text" icon="mdi-arrow-u-up-right" v-else-if="file.status === status.error || file.status === status.finish"  @click="restart(file)"></v-btn>
                  <v-btn size="x-small" color="error" class="ml-1 mr-1" variant="text" icon="mdi-close" v-if="file.status > 0" @click="removeFile(idx)"></v-btn>
                </v-row>
              </v-card-actions>
            </v-card>
          </div>
        </div>
      </v-card>
    </v-dialog>
    <file-upload-chip ref="chip" :progress="firstProcessingFile?(firstProcessingFile.current/firstProcessingFile.size*100):false" @expand="open(title)"></file-upload-chip>
  </div>
</template>

<script lang="ts">
import FileUploadChip from "~/components/file/FileUploadChip.vue";
import lodash from "lodash";
import {fi} from "vuetify/locale";
import {pathJoin} from "~/lib/util/common";

export default {
  name: "FileUpload",
  components: {FileUploadChip},
  props: {
    tips: {
      type: String,
    },
    maxProcessing:{
      type: Number,
      default: ()=>{
        return 2
      }
    },
  },
  data: ()=>{
    const status = Object.freeze({
      "uploading":0,
      "queuing":1,
      "error":2,
      "finish":3,
      "stop": 4,
    });
    const statusColor = Object.freeze(["primary","warning","error","success","secondary"]);
    return {
      "statusColor": statusColor,
      "status": status,
      "show": false,
      "title": null,
      "files": [],
      "firstProcessingFile": null,
      "processing": 0,
      "notDownloaded": 0,
      "completed": 0,
    }
  },
  methods:{
    open: function (title,files?:FileList|DataTransferItemList){
      if(!this.show){
        this.show = true
      }
      if(files){
        if(files instanceof DataTransferItemList){
          for (let i = 0; i < files.length; i++) {
            this.fileRecursion(files[i].webkitGetAsEntry())
          }
        }else{
          for (let i = 0; i < files.length; i++) {
            this.addFile(files[i])
          }
        }
        lodash.delay(()=>{this.schedule(false)},100)
      }
      this.title = title
    },
    schedule: function (restartStop=true){
      const processing = this.processing
      if(processing < this.maxProcessing){
        let diff = this.maxProcessing - processing
        for (let i = 0; i < this.files.length; i++) {
          const file = this.files[i]
          if(diff > 0){
            if(file.status === this.status.queuing || (file.status === this.status.stop && restartStop)){
              file.status = this.status.uploading
              this.start(file)
              diff -= 1
            }
          }
        }
      }
    },
    clear: function (){
      const newFiles = []
      for (let i = 0; i < this.files.length; i++) {
        let file = this.files[i]
        if(file.status === this.status.uploading || file.status === this.status.stop){
          newFiles.push(file)
        }
      }
      this.files = newFiles
      this.updateProcessing()
    },
    allPause: function (){
      for (let i = 0; i < this.files.length; i++) {
        let file = this.files[i]
        if(file.status === this.status.uploading){
          this.pause(file)
        }
      }
    },
    pause: function (file){
      file.status = this.status.stop
      this.updateProcessing(false)
      this.$emit("pause",file)
    },
    restart: function (file){
      if(file.status !== this.status.stop){
        file.current = 0
      }
      file.current = 0
      file._finalCurrent = file.current
      this.start(file,true)
    },
    start: function (file,force=false){
      file.status = this.status.uploading
      this.updateProcessing()
      this.$emit("start",file,force,this.updateCurrent,this.onError,this.onCompleted)
    },
    removeFile: function (idx){
      const file = this.files.splice(idx,1)
      this.$emit("remove",file[0])
    },
    onError: function (file,msg){
      file.status = this.status.error
      file.message = msg
      this.updateProcessing()
    },
    onCompleted: function (file){
      file.status = this.status.finish
      file._finalCurrent = file.size
      file.current = file.size
      this.updateProcessing()
    },
    updateProcessing: lodash.throttle(function (schedule = true){
      let uploading = 0
      let notDownloaded = 0
      let completed = 0
      for (let i = 0; i < this.files.length; i++) {
        let file = this.files[i]
        if(file.status === this.status.uploading){
          uploading+=1
          if(!this.firstProcessingFile){
            this.firstProcessingFile = file
          }
        }else if(file.status === this.status.queuing || file.status === this.status.stop){
          notDownloaded+=1
          if(this.firstProcessingFile === file){
            this.firstProcessingFile = null
          }
        }else if(file.status === this.status.finish || file.status === this.status.error){
          completed+=1
          if(this.firstProcessingFile === file){
            this.firstProcessingFile = null
          }
        }
      }
      this.notDownloaded = notDownloaded
      this.completed = completed
      this.processing = uploading
      if(schedule && uploading < this.maxProcessing){
        this.schedule(false)
      }
    },50,{trailing:true,leading:false}),
    updateCurrent: lodash.throttle(function () {
      const now = new Date().getTime()
      this.files.forEach((file)=>{
        if(file.status === this.status.uploading) {
          if(!this.firstProcessingFile){
            this.firstProcessingFile = file
          }
          if(file.current === file._finalCurrent){
            return
          }
          //计算每秒下载速度,并平滑显示网速
          file.speed = Math.round((file.current - file._finalCurrent) / ((now - file._updatedTime) / 1000))
          file._finalCurrent = file.current
          file._updatedTime = now
        }
      })
    }, 1000,{trailing:true,leading:false}),
    onFileDropCallback: function (e:DragEvent){
      e.stopPropagation();
      e.preventDefault();
      const files = e.dataTransfer.items;
      if(files){
        for (let i = 0; i < files.length; i++) {
          const file = files[0]
          this.fileRecursion(file.webkitGetAsEntry())
        }
        lodash.delay(()=>{this.schedule(false)},100)
      }
    },
    onFileSelected: function (e){
      const files = e.target.files
      for (let i = 0; i < files.length; i++) {
        this.addFile(files[i])
      }
      e.target.value = ""
      lodash.delay(()=>{this.schedule(false)},100)
    },
    doClose: function (){
      this.show = false
    },
    close: function (){
      this.doClose()
      this.files = []
      this.processing = 0
      this.notDownloaded = 0
      this.completed = 0
      this.$emit("onClose")
    },
    fold: function (){
      this.doClose()
      this.$refs.chip.open(this.title)
    },
    sure: function (){

    },
    addFile: function (file,path=undefined){
      //文件
      this.files.push({
        "_updatedTime": 0,
        "_finalCurrent": 0,
        "updatedTime": file.lastModified,
        "status": this.status.queuing,
        "speed": 0,
        "size": file.size,
        "current": 0,
        "message": null,
        "file": file,
        "name": file.name,
        "path": path??(file.webkitRelativePath?file.webkitRelativePath.replaceAll("\\","/"):file.name)
      })
    },
    fileRecursion: function (file){
      if(file.isDirectory) {
        let dirReader = file.createReader();
        // console.log(dirReader)
        //文件夹
        dirReader.readEntries(
          entries => {
            for (let i = 0; i < entries.length; i++) {
              this.fileRecursion(entries[i])
            }
          },
           (e)=>{
            this.$error(this.$t('file.read-file-err'))
            console.log(e)
          }
        );
      }else{
        file.file(blobFile => {
          this.addFile(blobFile,lodash.trimStart(file.fullPath,"/"))
        });
      }
    },

  }
}
</script>

<style lang="scss">
  .upload-container{
    .tips{
      text-align: center;
      padding-bottom: 5px;
      font-size: 12px;
    }
    .btns-container{
      display: flex;
      justify-content: space-between;
      margin: 10px 28px;
    }
    .upload-area{
      cursor: pointer;
      width: 135px;
      height: 135px;
      margin: 10px auto;
      border: #9e9e9e dashed 1px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .upload-files{
      justify-content: flex-start;
      margin-top: 15px;
      display: flex;
      flex-grow: 0;
      flex-shrink: 0;
      flex-wrap: wrap;
      overflow-y: auto;
      padding: 0 25px;
      height: 210px;

      .file-card{
        width: 32%;
        height: 145px;
        margin: 0 2% 15px 0;
        position: relative;
        &:nth-child(3n){
          margin-right: 0;
        }
        .v-card-actions{
          padding: 2px;
          min-height: 35px;
          height: 35px;
        }
        .status{
          cursor: default;
          user-select: none;
          font-weight: bold;
          font-size: 14px;
          text-align: center;
          padding-top: 5px;
        }
        .upload-info{
          .error-tips{
            padding-top: 5px;
            cursor: pointer;
            width: 180px;
            font-size: 10px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            display: -moz-box;
            -moz-line-clamp: 2;
            -moz-box-orient: vertical;
            word-wrap: break-word;
            word-break: break-all;
            white-space: normal;
          }
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          font-size: 8px;
          line-height: 17px;
          height: 40px;
        }
        .upload-file-name{
          cursor: pointer;
          text-align: center;
          padding: 5px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
      }
    }
  }
</style>
