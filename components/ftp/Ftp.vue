<template>
    <div class="fill-height">
      <movable-dividers
          ref="dividers"
          :show-single="showSingle"
          @end="onMoveEnd"
          :min-size="35"
          :divider-size="1"
          :vertical="false">
        <template v-slot:first>
          <file-browser
              id="local"
              group="ftp"
              v-model:path="localPath"
              ref="local"
              @contextMenuItem="(evt,items)=>onContextMenuItem(evt,items,false)"
              @copy="onCopy($event,false)"
              @cut="onCut($event,false)"
              @paste="onPaste($event,false)"
              @delete="onDelete($event,false)"
              :dense="dense"
              @init="init"
              :roots="rootData.localRoots"
              :get-files-callback="localGetFilesCallback"
              :separator="rootData.localSeparator"
              :title="$t('ftp.local.title')"
              @receiveData="receiveData"
              @openFile="onOpenFile($event,false)"
          >
          </file-browser>
        </template>
        <template v-slot:last>
          <file-browser
              id="remote"
              group="ftp"
              v-model:path="remotePath"
              ref="remote"
              @contextMenuItem="(evt,items)=>onContextMenuItem(evt,items,true)"
              @copy="onCopy($event,true)"
              @cut="onCut($event,true)"
              @paste="onPaste($event,true)"
              @delete="onDelete($event,true)"
              :dense="dense" @init="init" :roots="rootData.remoteRoots"
              :get-files-callback="remoteGetFilesCallback"
              :separator="rootData.remoteSeparator"
              :title="$t('ftp.remote.title')"
              @receiveData="receiveData"
              @receiveFile="receiveFile"
              @openFile="onOpenFile($event,true)"
          >
            <template #menu>
              <v-list-item :title="$t('file.upload')" v-ripple v-on:click="remoteUpload.open(remotePath)">
                <template v-slot:prepend>
                  <v-icon icon="mdi-tray-arrow-up" class="mr-4 ml-1"></v-icon>
                </template>
              </v-list-item>
            </template>
          </file-browser>
        </template>
      </movable-dividers>
      <host-key-confirm ref="hostKeyConfirm"></host-key-confirm>
      <file-chmod ref="chmodComp"></file-chmod>
      <file-del-confirm ref="delConfirm"></file-del-confirm>
      <v-overlay persistent :model-value="handleProcess.show">
        <div style="width: 100vw;height: 100vh;display: flex;justify-content: center;align-items: center">
          <v-card width="400px" max-width="50vw">
            <v-card-title class="pb-0">
              {{handleProcess.title}}
            </v-card-title>
            <v-card-subtitle style="white-space: break-spaces;word-break: break-all;">
              {{handleProcess.text}}
            </v-card-subtitle>
            <v-card-actions v-if="handleProcess.cancelFunc != null">
              <v-spacer></v-spacer>
              <v-btn color="error" variant="text" @click="handleProcess.cancelFunc()">{{$t('common.cancel')}}</v-btn>
            </v-card-actions>
          </v-card>
        </div>
      </v-overlay>
      <ftp-upload ref="remoteUpload" :rpc="mRpc" @onClose="remote.refresh()"></ftp-upload>
    </div>
</template>

<script lang="ts">
import FileBrowser, {FileItem, RootItem} from "~/components/file/FileBrowser.vue";
import MovableDividers from "~/components/common/MovableDividers.vue";
import HostKeyConfirm from "~/components/ssh/HostKeyConfirm.vue";
import FileDelConfirm from "~/components/file/FileDelConfirm.vue";
import {open as openEditor} from "~/pages/editor.vue";
import FileChmod,{ChmodResult} from "~/components/file/FileChmod.vue";

import Rpc from "~/lib/rpc";
import lodash from 'lodash'
import Packet from "~~/lib/rpc/packet";
import {ContextMenu} from "~/lib/layer";
import * as clipboard from "clipboard-polyfill";
import {ref, onUnmounted, getCurrentInstance, shallowRef, watch, nextTick} from "vue";
import common, {genNotExistPath, getFileExt, pathEqual, pathJoin} from "~/lib/util/common";
import Prompt from "~/lib/layer/prompt";
import Toast from "~/lib/layer/toast";

import Channel from "~/lib/rpc/channel";
import FileCoverConfirm from "~/lib/layer/file-cover-confirm";
import { genApiUrl } from "~~/apis/client/base";
import {PropType} from "#app/compat/capi";
import FtpUpload from "~/components/ftp/FtpUpload.vue";
import {bool} from "yup";

type AuthType = 0 | 1;
const AuthTypePassword = <AuthType>0
const AuthTypePrivateKey = <AuthType>1

type ConfigType = 0 | 1;
const ConfigTypeSftp = <ConfigType>0
const ConfigTypeFtp = <ConfigType>1

const TypeHostKeyConfirm = "hostKeyConfirm"
const TypeInit = "init"
const TypeError = "error"
const TypeReadDir = "readDir"
const TypeDownload = "download"
const TypeUpload = "upload"
const TypeDelete = "delete"
const TypeChmod = "chmod"
const TypeRename = "rename"
const TypeMkdir = "mkdir"
const TypeBrowserDownload = "browserDownload"
const TypeCopy = "copy"
const TypeNewFile = "newFile"
const TypeCoverConfirm = "coverConfirm"
const TypeMove = "move"
const TypeOpenFie = "openFile"
const TypeEdit = "edit"

//能够直接在线编辑的文件
const CanOnlineEditExt = new Set([
  "txt","conf","sh","bat","cmd","shell","sql","java","php","html","css","scss","less","sass","go","lua","js","ts",
  "c","h","md","vue","py","ini","yaml","yml","xml","toml","gitconfig","gitignore","properties","log","dockerfile",
  "bashrc","profile","cmake","make","hpp","config","text","json","rb","pl"
])

interface FtpAuth{
  type: number,
  password?: string
  privateKey?: string
}

interface FtpConf{
  sshConnId: string,
  type: number,
  host: string,
  port: number,
  user: string,
  auths: FtpAuth[]
}

interface FtpInitResponse{
  localRoots:Array<RootItem>
  localSeparator: string
  localRootDir: string
  remoteRoots:Array<RootItem>
  remoteSeparator: string
  remoteRootDir: string
}

export {
  ConfigType,AuthType,
  ConfigTypeSftp,ConfigTypeFtp,AuthTypePrivateKey,AuthTypePassword,
  TypeHostKeyConfirm,TypeInit,TypeError,TypeReadDir,TypeDownload,TypeUpload,TypeDelete,TypeChmod,TypeRename,TypeMkdir,
  FtpAuth,FtpConf
}

export default {
  name: "Ftp",
  components: {
    FtpUpload, HostKeyConfirm, FileBrowser, MovableDividers,FileDelConfirm,FileChmod},
  props: {
    dense: {
      type: Boolean,
      default: false
    },
    showSingle: {
      type: String as PropType<"first"|"last"|null>,
      default: null
    }
  },
  emits:["update:rpc","onConnectPreCheck"],
  setup(props,ctx){
    const proxy = <any>getCurrentInstance().proxy

    const showSingle = ref(props.showSingle)
    const dividers = ref();
    const local = ref()
    const remote = ref()
    const remoteUpload = ref()
    const hostKeyConfirm = ref()
    const chmodComp = ref()
    const delConfirm =ref()
    const handleProcess = ref({text:"",show:false,title:"",cancelFunc: function (){}})

    let localPath = ref("")
    let remotePath = ref("")
    let mRpc = shallowRef<Rpc>(null);
    let mConf:FtpConf = null;
    let initialized = false;
    let copying = false;
    const rootData = shallowRef(<FtpInitResponse>{})
    let copySrc = <{isRemote:boolean,items:FileItem[],dir:string,isCut:boolean}>null

    const close = function (){
      if(mRpc.value!=null){
        mRpc.value.close(1000,"destroy")
      }
    };
    const open = function (conf:FtpConf){
      close()
      mConf = lodash.cloneDeep(conf)
      lodash.delay(()=>init(),500)
    };
    const openBySsh = function (sshConnId:string){
      open(<FtpConf>{
        sshConnId: sshConnId,
        type: ConfigTypeSftp,
      })
    };
    const init = function (){
      //如果rpc已经实例化并且打开则不用初始化，直接退出
      if(mRpc.value !== null && mRpc.value.isOpened()){
        return
      }

      return new Promise ((resolve, reject) => {
        if(mRpc.value === null){
          mRpc.value = new Rpc(genApiUrl("ws","remote-control","ftp"),5000)
          ctx.emit('update:rpc',mRpc.value)
          mRpc.value.onclose = (evt)=>{
            let reason = evt.code === 1006 ? proxy.$t("ftp.not-start-plugin") : evt.reason??''
            remote.value?.showError(reason)
            local.value?.showError(reason)
            reject(new Error(reason))
          }
          mRpc.value.onopen = async () => {
            local.value.showLoading()
            remote.value.showLoading()
            // try {
            mRpc.value.send(TypeInit,mConf);
            //等待初始化完成
            mRpc.value.on(TypeInit,async (p:Packet) => {
              mRpc.value.clearOn(TypeInit)
              const result:FtpInitResponse = p.json()
              rootData.value = Object.freeze(result)
              await local.value.cd(result.localRootDir, true)
              await remote.value.cd(result.remoteRootDir, true)
              resolve(mRpc.value)
              initialized = true
            })

            //如果是sftp则需要确认秘钥
            if(mConf.type === ConfigTypeSftp){
              //需要等待服务器发送Host Key确认信号
              mRpc.value.on(TypeHostKeyConfirm,async (p) => {
                mRpc.value.clearOn(TypeHostKeyConfirm)
                const res:any = p.json()
                //如果需要确认
                if (res.wantConfirm) {
                  try {
                    //选择同意，并获取是否保存本次选择
                    const persist = await hostKeyConfirm.value.open(res)
                    mRpc.value.reply(TypeHostKeyConfirm, {
                      allow: true,
                      persist: persist,
                    }, p)
                  } catch (e) {
                    //选择拒绝
                    mRpc.value.reply(TypeHostKeyConfirm, {
                      allow: false,
                      persist: false,
                    }, p)
                  }
                }
              })
            }
          }
        }else{
          //进行重新连接前置检查，如果被取消就不用执行下列方法了
          let cancelInit = false
          ctx.emit("onConnectPreCheck",()=>{cancelInit=true})
          if(cancelInit){
            return false
          }
          resolve(mRpc.value)
        }
        mRpc.value.open()
      });
    }
    const onCopy = function (items:FileItem[],isRemote:boolean){
      if(items.length > 0){
        copy(isRemote,items,false)
      }
    }
    const onCut = function (items:FileItem[],isRemote:boolean){
      if(items.length > 0){
        copy(isRemote,items,true)
      }
    }
    const onPaste = function (items:FileItem[],isRemote:boolean){
      if(canPaste(isRemote)){
        paste(isRemote)
      }
    }
    const onDelete = function (items:FileItem[],isRemote:boolean){
      if(items.length > 0){
        doDel(isRemote,items)
      }
    }
    const onContextMenuItem = function (evt:MouseEvent,items:FileItem[],isRemote:boolean){
      let dynamicItems = []
      //在远程表格右键显示下载，本地表格右键显示上传
      if(isRemote){
        dynamicItems.push(
          {
            type: "item",
            title: proxy.$t('common.download'),
            icon: "mdi-download-outline",
            disabled: items.length === 0,
            click: ()=>{
              doSync(true,remotePath.value,items,null)
            }
          },
          {
            type: "item",
            title: "下载至浏览器",
            icon: "mdi-download-network-outline",
            disabled: items.length === 0,
            click: ()=>{
              doDownloadToBrowser(items)
            }
          },
        )

      }else{
        dynamicItems.push({
          type: "item",
          title: proxy.$t('common.upload'),
          icon: "mdi-upload-outline",
          disabled: items.length === 0,
          click: ()=>{
            doSync(false,localPath.value,items,null)
          }
        })
      }
      ContextMenu.open(evt,[
        {
          type: "title",
          title: proxy.$t('common.operate'),
        },
        {type: "line"},
        {
          type: "item",
          title: proxy.$t('ftp.local-open'),
          icon: "mdi-file-eye-outline",
          click: ()=>{
            if(isRemote){
              if(items.length > 0){
                //远程需要下载到本地后才能打开
                doSync(true,remotePath.value,items,null,true)
              }
            }else{
              //本地直接打开，如果未选择文件则直接打开当前目录文件夹，否则打开选择的文件
              const paths = items.length === 0 ? [localPath.value]: items.map((item)=>{
                return pathJoin(rootData.value.localSeparator,[localPath.value,item.name])
              })
              mRpc.value.sendWaitReply(TypeOpenFie, {paths}).catch((err)=>{
                Toast.error(err.message)
              })
            }
          }
        },
        {
          type: "item",
          title: proxy.$t('ftp.online-edit'),
          icon: "mdi-file-code-outline",
          disabled: !items.some((item)=>!item.isDir),
          click: ()=>{
            items.forEach((item)=>{
              if(!item.isDir){
                doEditor(item,isRemote)
              }
            })
          }
        },
        {
          type: "item",
          title: proxy.$t('common.refresh'),
          icon: "mdi-repeat",
          click: () => refresh(isRemote),
        },
        ...dynamicItems,
        {
          type: "item",
          title: proxy.$t('common.rename'),
          icon: "mdi-file-document-edit-outline",
          disabled: items.length === 0,
          click: ()=>doRename(isRemote,items)
        },
        {
          type: "item",
          title: proxy.$t('common.delete'),
          icon: "mdi-file-remove-outline",
          disabled: items.length === 0,
          click: ()=>doDel(isRemote,items)
        },
        {
          type: "menu",
          title: proxy.$t('common.more'),
          icon: "mdi-chevron-down",
          menus: [
            {
              type: "item",
              title: proxy.$t('common.copy'),
              icon: "mdi-content-copy",
              click: () => {
                copy(isRemote,items,false)
              }
            },
            {
              type: "item",
              title: proxy.$t('common.cut'),
              icon: "mdi-content-cut",
              click: () => {
                copy(isRemote,items,true)
              }
            },
            {
              type: "item",
              title: proxy.$t('common.paste'),
              icon: "mdi-content-paste",
              disabled: !canPaste(isRemote),
              click: ()=>{
                paste(isRemote)
              }
            },
            {
              type: "item",
              title: proxy.$t('ftp.copy-path'),
              icon: 'mdi-file-powerpoint-outline',
              click: () => {
                let path;
                if(items.length == 0){
                  if(isRemote){
                    path = remotePath.value
                  }else{
                    path = localPath.value
                  }
                }else{
                  path = items.map((item)=>{
                    if(isRemote){
                      return common.pathJoin(rootData.value.remoteSeparator,[remotePath.value,item.name])
                    }else{
                      return common.pathJoin(rootData.value.localSeparator,[localPath.value,item.name])
                    }
                  }).join("\r\n");
                }
                clipboard.writeText(path).then(()=>{
                  Toast.success(proxy.$t('common.copy-success'))
                }).catch(err=>{
                  console.log(err)
                  Toast.error(proxy.$t('common.copy-failed'))
                });
              }
            },
            {
              type: "item",
              title: proxy.$t('ftp.new-folder'),
              icon: "mdi-folder-plus-outline",
              click: ()=>doNewFolder(isRemote)
            },
            {
              type: "item",
              title: proxy.$t('ftp.new-file'),
              icon: "mdi-file-document-plus-outline",
              click: ()=>doNewFile(isRemote)
            },
            {
              type: "item",
              title: proxy.$t('ftp.chmod'),
              icon: "mdi-archive-lock-open-outline",
              disabled: items.length === 0,
              click: () => doChmod(isRemote,items)
            },
          ]
        },

      ],160).catch((err)=>{});
    };
    const canPaste = (isRemote:boolean):boolean=>{
      //在复制中不能同时进行
      if(copying){
        return false
      }
      //未复制时不能粘贴
      if(copySrc === null){
        return false
      }
      //是否是同一个表格复制
      const cognate = isRemote === copySrc.isRemote
      //跨表格粘贴时（远程至本地 | 本地至远程），不能粘贴剪切的值
      if(!cognate && copySrc.isCut){
        return false
      }
      const srcSeparator = copySrc.isRemote?rootData.value.remoteSeparator:rootData.value.localSeparator
      const targetDir = isRemote?remotePath.value:localPath.value
      if(copySrc.isCut){
        //同表格剪切粘贴时，判断是否允许粘贴, 如果粘贴目标目录是粘贴源文件的同级或下级文件，则不允许粘贴
        if(lodash.trim(copySrc.dir,srcSeparator)===lodash.trim(targetDir,srcSeparator)){
          return false
        }
        return !(cognate && copySrc.items.some((item) => {
          //复制源路径
          const path = pathJoin(srcSeparator, [copySrc.dir, item.name])
          //如果复制源路径是粘贴目标路径下级则不允许复制
          return targetDir.startsWith(path)
        }));
      }else{
        //同表格复制粘贴时，判断是否允许粘贴, 如果粘贴目标目录是粘贴源文件的下级文件，则不允许粘贴
        return !(cognate && copySrc.items.some((item) => {
          //复制源路径
          const path = pathJoin(srcSeparator, [copySrc.dir, item.name])
          //如果复制源路径是粘贴目标路径下级则不允许复制
          return targetDir.startsWith(path)
        }));
      }
    }
    const copy = (isRemote:boolean,srcItems:FileItem[],isCut:boolean)=>{
      copySrc = {
        isRemote,
        items:srcItems,
        dir: isRemote?remotePath.value:localPath.value,
        isCut,
      }
      const names = srcItems.map((item)=>{
        return item.name
      }).join("\r\n")
      clipboard.writeText(names).then(()=>{
        Toast.success(proxy.$t('common.copy-success'))
      }).catch(err=>{
        Toast.error(proxy.$t('common.copy-failed'))
      });
    }
    const paste = async (isRemote: boolean) => {
      if (copySrc === null) {
        return
      }

      const separator = isRemote ? rootData.value.remoteSeparator : rootData.value.localSeparator

      if (copySrc.isRemote != isRemote) {
        //不同源，则说明是上传或者下载忽略剪切
        //如果当前粘贴的是远程表格，说明是上传,否则为下载
        doSync(!isRemote, copySrc.dir, copySrc.items)
      } else if (copySrc.isCut) {
        let srcPaths = copySrc.items.map((item) => {
          return pathJoin(separator, [copySrc.dir, item.name])
        })
        //剪切
        doMove(isRemote, srcPaths, isRemote ? remotePath.value : localPath.value)
      } else {
        let currentPath = isRemote ? remotePath.value : localPath.value
        const targetDir = isRemote ? remotePath.value : localPath.value
        let srcPaths = copySrc.items.map((item) => {
          return pathJoin(separator, [copySrc.dir, item.name])
        })
        let newPaths: string[]
        if (copySrc.isRemote === isRemote && pathEqual(currentPath, copySrc.dir)) {
          //同目录复制粘贴需要修改原文件名，例如xx.png改为xx-1.png
          const files = <FileItem[]>(isRemote ? remote.value.rawList : local.value.rawList)
          const fileSet = new Set<string>(files.map((f: FileItem) => f.name))
          const f = (name: string) => {
            if (fileSet.has(name)) {
              return Promise.reject()
            } else {
              return Promise.resolve();
            }
          }
          newPaths = []
          for (const item of copySrc.items) {
            newPaths.push(pathJoin(separator, [copySrc.dir, await genNotExistPath(item.name, f)]))
          }
        } else {
          newPaths = copySrc.items.map((item) => {
            return pathJoin(separator, [targetDir, item.name])
          })
        }
        //复制
        doCopy(isRemote, srcPaths, newPaths, targetDir)
      }
    }
    const onOpenFile =  (file:FileItem,isRemote:boolean)=>{
      const ext = getFileExt(file.name).toLowerCase()
      //根据文件大小(5KB)和文件扩展判断及.开头的文件如果能够在线编辑，则在线编辑否则本地打开
      if(file.size < 1024*5 || (ext && CanOnlineEditExt.has(ext)) || file.name.startsWith(".")){
        doEditor(file,isRemote)
      }else{
        if(isRemote){
          doSync(true,remotePath.value,[file],null,true)
        }else{
          //本地直接打开，如果未选择文件则直接打开当前目录文件夹，否则打开选择的文件
          const paths = [pathJoin(rootData.value.localSeparator,[localPath.value,file.name])]
          mRpc.value.sendWaitReply(TypeOpenFie, {paths}).catch((err)=>{
            Toast.error(err.message)
          })
        }
      }
    }
    const doEditor = (file:FileItem,isRemote:boolean)=>{
      const path = isRemote?pathJoin(rootData.value.remoteSeparator,[remotePath.value,file.name]):pathJoin(rootData.value.localSeparator,[localPath.value,file.name])
      mRpc.value.sendWaitReply(TypeEdit,{isRemote,path}).then((p)=>{
        openEditor(p.string(),file.name)
      }).catch((err)=>{
        Toast.error(err.message)
      })
    }
    const doNewFolder = (isRemote:boolean)=>{
      Prompt.open("请输入文件夹名称","").then((name:string)=>{
        const path = isRemote?common.pathJoin(rootData.value.remoteSeparator,[remotePath.value,name]):common.pathJoin(rootData.value.localSeparator,[localPath.value,name])
        showLoading(isRemote)
        mRpc.value.sendWaitReply(TypeMkdir,{
          path,isRemote
        }).catch((err)=>{
          Toast.error(err.message)
        }).finally(()=>{
          refresh(isRemote)
        })
      })
    }
    const doNewFile = (isRemote:boolean)=>{
      Prompt.open("请输入文件名称","").then((name:string)=>{
        const path = isRemote?common.pathJoin(rootData.value.remoteSeparator,[remotePath.value,name]):common.pathJoin(rootData.value.localSeparator,[localPath.value,name])
        showLoading(isRemote)
        mRpc.value.sendWaitReply(TypeNewFile,{
          path,isRemote
        }).catch((err)=>{
          Toast.error(err.message)
        }).finally(()=>{
          refresh(isRemote)
        })
      })
    }

    const doChmod = (isRemote:boolean,items:FileItem[])=>{
      let isDir = false
      //如果选中的项内有任一文件夹，则标注为文件夹操作（文件夹操作需选中是否同步更新文件夹内的文件权限）
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if(item.isDir){
          isDir = true
        }
      }
      //是否禁用快速操作（仅远程sftp支持快速操作）
      const disabledQuick = !isRemote || mConf.type !== ConfigTypeSftp
      chmodComp.value.open(items[0]._modeText,isDir,disabledQuick).then((result:ChmodResult)=>{
        handleProcess.value.title = "正在修改权限"
        handleProcess.value.cancelFunc = null
        handleProcess.value.show = true
        const paths = items.map((item,idx)=>{
          return isRemote?common.pathJoin(rootData.value.remoteSeparator,[remotePath.value,item.name]):common.pathJoin(rootData.value.localSeparator,[localPath.value,item.name])
        })
        handleProcess.value.text = paths[0]
        showLoading(isRemote)
        const channel = mRpc.value.openChannel(TypeChmod,{
          paths,isRemote,...result
        })
        //主动取消回调
        handleProcess.value.cancelFunc = function (){
          channel.close(Channel.CloseInterrupt,"cancel")
        }
        channel.onmessage = (p:Packet)=>{
          handleProcess.value.text = p.string()
        }
        channel.onclose = (code,reason)=>{
          refresh(isRemote)
          handleProcess.value.show = false
          if(code === Channel.CloseFailure){
            Toast.error(`更新失败：${reason}`)
          }
        }
      })
    }

    const doDel = (isRemote:boolean,items:FileItem[])=>{
      //是否禁用快速操作（仅本地和远程sftp支持快速操作）
      const disabledQuick = isRemote && mConf.type === ConfigTypeFtp
        delConfirm.value.open('请确认是否删除',`确定要删除所选择的 ${items.length} 个项目吗？`,disabledQuick).then((isQuick)=>{
          handleProcess.value.title = "正在删除"
          handleProcess.value.cancelFunc = null
          handleProcess.value.show = true
          const paths = items.map((item,idx)=>{
            return isRemote?common.pathJoin(rootData.value.remoteSeparator,[remotePath.value,item.name]):common.pathJoin(rootData.value.localSeparator,[localPath.value,item.name])
          })
          handleProcess.value.text = paths[0]
          showLoading(isRemote)
          const channel = mRpc.value.openChannel(TypeDelete,{
            paths,isRemote,isQuick
          })
          //主动取消回调
          handleProcess.value.cancelFunc = function (){
            channel.close(Channel.CloseInterrupt,"cancel")
          }
          channel.onmessage = (p:Packet)=>{
            handleProcess.value.text = p.string()
          }
          channel.onclose = (code,reason)=>{
            refresh(isRemote)
            handleProcess.value.show = false
            if(code === Channel.CloseFailure){
              Toast.error(`删除失败：${reason}`)
            }
          }
      })
    }

    const doRename = (isRemote:boolean,items:FileItem[])=>{
      let name = items.length === 0 ? items[0].name : items[0].name
      if(items.length > 1){
        name = name + "-{idx}"
      }
      Prompt.open("请输入重命名名称",name).then((name:string)=>{
        const targetPath = isRemote?common.pathJoin(rootData.value.remoteSeparator,[remotePath.value,name]):common.pathJoin(rootData.value.localSeparator,[localPath.value,name])
        const list = items.map((item,idx)=>{
          return {
            srcPath: isRemote?common.pathJoin(rootData.value.remoteSeparator,[remotePath.value,item.name]):common.pathJoin(rootData.value.localSeparator,[localPath.value,item.name]),
            targetPath: targetPath.replace("{idx}",(idx+1).toString())
          }
        })
        showLoading(isRemote)
        mRpc.value.sendWaitReply(TypeRename,{
          list,isRemote
        }).catch((err)=>{
          Toast.error(err.message)
        }).finally(()=>{
          refresh(isRemote)
        })
      })
    }

    const doCopy = function (isRemote:boolean,srcPaths:string[],newPaths:string[],targetDir:string){
      //如果在复制中不允许同时进行两个复制粘贴任务
      if(copying){
        return
      }
      handleProcess.value.title = "正在准备复制"
      handleProcess.value.cancelFunc = null
      handleProcess.value.show = true
      showLoading(isRemote)
      copying = true
      const channel = mRpc.value.openChannel( TypeCopy,{
        isRemote,
        srcPaths,
        newPaths,
        targetDir,
        isQuick:true
      })
      //主动取消回调
      handleProcess.value.cancelFunc = function (){
        channel.close(Channel.CloseInterrupt,"cancel")
      }
      channel.onmessage = (p:Packet)=>{
        let subPacket = p.subPacket()
        if(subPacket.method() === TypeError){
          Toast.error(subPacket.string())
        }else if(subPacket.method() === TypeMkdir){
          handleProcess.value.title = "正在创建文件夹"
          handleProcess.value.text = subPacket.string()
        }else if(subPacket.method() === TypeNewFile){
          handleProcess.value.title = "正在复制文件"
          handleProcess.value.text = subPacket.string()
        }else if(subPacket.method() === TypeCoverConfirm){
          let coverConfirmReq = <any>subPacket.json()
          FileCoverConfirm.open(coverConfirmReq.path).then((val)=>{
            channel.send({
              allApply: val.allApply,
              cover: true
            })
          }).catch((val:{allApply:boolean})=>{
            channel.send({
              allApply: val.allApply,
              cover: false
            })
          })
        }
      }
      channel.onclose = (code,reason)=>{
        refresh(isRemote)
        handleProcess.value.show = false
      }
    }

    const doMove = function (isRemote:boolean,srcPaths:string[],targetDir:string){
      handleProcess.value.title = "正在移动文件"
      handleProcess.value.cancelFunc = null
      handleProcess.value.show = true
      handleProcess.value.text = srcPaths[0]
      showLoading(isRemote)
      const channel = mRpc.value.openChannel(TypeMove,{
        isRemote,targetDir,srcPaths
      })
      //主动取消回调
      handleProcess.value.cancelFunc = function (){
        channel.close(Channel.CloseInterrupt,"cancel")
      }
      channel.onmessage = (p:Packet)=>{
        handleProcess.value.text = p.string()
      }
      channel.onclose = (code,reason)=>{
        refresh(isRemote)
        handleProcess.value.show = false
        if(code === Channel.CloseFailure){
          Toast.error(`移动失败：${reason}`)
        }
      }
    }

    const doSync = function (isDownload:boolean,srcDir:string,items:FileItem[],targetFolder?:FileItem,isOpen=false){
      handleProcess.value.cancelFunc = null
      handleProcess.value.show = true
      //目标路径如果是下载则目标路径是本地，如果是上传则目标路径是远程
      let targetDir = isDownload ? localPath.value : remotePath.value
      //如果拖拽的目标是一个文件夹，那么将下载路径设为文件夹
      if(targetFolder!=null){
        targetDir = common.pathJoin(isDownload ? rootData.value.localSeparator : rootData.value.remoteSeparator,[targetDir,targetFolder.name])
      }
      const srcPaths = items.map((item:FileItem,idx)=>{
        return common.pathJoin(isDownload ?rootData.value.remoteSeparator:rootData.value.localSeparator,[srcDir,item.name])
      })
      showLoading(!isDownload)
      const channel = isDownload ? mRpc.value.openChannel( TypeDownload,{
        localDir: targetDir,
        remotePaths: srcPaths,
        isOpen
      }) : mRpc.value.openChannel( TypeUpload,{
        RemoteDir: targetDir,
        LocalPaths: srcPaths,
      })
      //主动取消回调
      handleProcess.value.cancelFunc = function (){
        channel.close(Channel.CloseInterrupt,"cancel")
      }
      channel.onmessage = (p:Packet)=>{
        let subPacket = p.subPacket()
        if(subPacket.method() === TypeError){
          Toast.error(subPacket.string())
        }else if(subPacket.method() === TypeMkdir){
          handleProcess.value.title = "正在准备创建文件夹"
          handleProcess.value.text = subPacket.string()
        }else if(subPacket.method() === TypeOpenFie){
          handleProcess.value.title = "正在准备文件"
          handleProcess.value.text = subPacket.string()
        }else if(subPacket.method() === TypeCoverConfirm){
          let coverConfirmReq = <any>subPacket.json()
          FileCoverConfirm.open(coverConfirmReq.path).then((val)=>{
            channel.send({
              allApply: val.allApply,
              cover: true
            })
          }).catch((val:{allApply:boolean})=>{
            channel.send({
              allApply: val.allApply,
              cover: false
            })
          })
        }
      }
      channel.onclose = (code,reason)=>{
        refresh(!isDownload)
        handleProcess.value.show = false
      }
    }

    const doDownloadToBrowser = async function (items: FileItem[]) {
      try {
        const p = await mRpc.value.sendWaitReply(TypeBrowserDownload, {
          paths: items.map(item => pathJoin(rootData.value.remoteSeparator, [remotePath.value, item.name]))
        })
        const url = p.string()
        //触发下载弹窗
        window.open(url)
      }catch (e){
        Toast.error(e.message)
      }
    }

    const refresh = function (isRemote:boolean){
      copying = false
      if(isRemote){
        remote.value.refresh()
      }else{
        local.value.refresh()
      }
    }

    const showLoading = function (isRemote:boolean){
      if(isRemote){
        remote.value.showLoading()
      }else{
        local.value.showLoading()
      }
    }

    const hideLoading = function (isRemote:boolean){
      if(isRemote){
        remote.value.hideLoading()
      }else{
        local.value.hideLoading()
      }
    }

    const cdRemote = function (pwd:string){
      if(initialized){
        remote.value.cd(pwd)
      }
    };
    const localGetFilesCallback = async function(pwd:string): Promise<FileItem[]>{
      await init()
      const packet = await mRpc.value.sendWaitReply(TypeReadDir, {
        path: pwd,
        isRemote: false
      })
      return packet.json()
    };
    const remoteGetFilesCallback = async function (pwd:string): Promise<FileItem[]>{
      await init()
      const packet = await mRpc.value.sendWaitReply(TypeReadDir, {
        path: pwd,
        isRemote: true
      })
      return packet.json()
    };
    const receiveFile = function (evt){
      const targetItem = <FileItem>evt.targetItem
      if(targetItem && targetItem.isDir){
        remoteUpload.value.open(pathJoin(rootData.value.remoteSeparator,[remotePath.value,targetItem.name]),evt.items)
      }else{
        remoteUpload.value.open(remotePath.value,evt.items)
      }
    };
    const receiveData = function (data){
      //如果拖拽目标目录为root导航目录则不允许拖拽
      if(data.targetId === "remote" && !remotePath.value){
        return;
      }else if(data.targetId === "local" && !localPath.value){
        return;
      }
      //同一个表内格移动（文件移动）
      if(data.srcId === data.targetId){
        const isRemote = data.srcId === "remote"
        const targetDir = isRemote ?
            common.pathJoin(rootData.value.remoteSeparator,[remotePath.value,data.targetItem.name]) :
            common.pathJoin(rootData.value.localSeparator,[localPath.value,data.targetItem.name])
        const srcPaths = data.items.map((item:FileItem,idx)=>{
          return isRemote ?
              common.pathJoin(rootData.value.remoteSeparator,[remotePath.value,item.name]):
              common.pathJoin(rootData.value.localSeparator,[localPath.value,item.name])
        })
        doMove(isRemote,srcPaths,targetDir)
      }
      //跨表格移动（上传 or 下载）
      else{
        //remote to local 下载， local to remote 上传
        const isDownload = data.srcId === "remote"
        const items = data.items
        const targetFolder = data.targetItem
        doSync(isDownload,isDownload?remotePath.value:localPath.value,items,targetFolder)
      }
    };

    const onMoveEnd = ()=>{
      nextTick(()=>{
        local.value.resize()
        remote.value.resize()
      })
    }

    const onResize = function () {
      dividers.value.onResize()
    }

    watch(()=>props.showSingle,(n,o)=>{
      showSingle.value = n
    })

    onUnmounted(()=>{
      close()
    })

    return {
      showSingle,
      rootData,localPath,remotePath,handleProcess,mRpc,
      remoteUpload,dividers,local,remote,hostKeyConfirm,chmodComp,delConfirm,
      onContextMenuItem,onCopy,onDelete,onPaste,onCut,onOpenFile,refresh,
      onResize,onMoveEnd,init,close,open,openBySsh,cdRemote,
      localGetFilesCallback,remoteGetFilesCallback,receiveData,receiveFile,showLoading,hideLoading
    }
  },
}
</script>

<style scoped>

</style>
