<template>
  <div class="term-wrapper">
    <v-progress-linear
        v-if="loading"
        height="3"
        indeterminate
        style="z-index: 7"
    ></v-progress-linear>

    <search ref="search" v-model:show="searchOpt.show" v-model:case-sensitive="searchOpt.caseSensitive" v-model:regex="searchOpt.regex" v-model:whole-word="searchOpt.wholeWord" @close="closeSearch" @findPrevious="findPrevious" @findNext="findNext" @search="findNext">
      <div
          v-on:drop.prevent="onFileDropCallback"
          v-on:dragover.prevent
          ref="terminalDiv"
          class="fill-height"
          v-context-menu="{width:150,menu:initMenu,close:focus}"></div>
    </search>

    <scp :rpc="rpc" ref="scp"></scp>
    <host-key-confirm ref="hostKeyConfirm"></host-key-confirm>
  </div>
</template>

<script lang="ts">
import ByteBuffer from 'bytebuffer'
import Rpc from "~/lib/rpc"
import lodash from 'lodash'
import * as clipboard from "clipboard-polyfill"
import Common from "~/lib/util/common"
import { useTheme } from 'vuetify'


import "xterm/css/xterm.css";
import {Terminal, ITerminalOptions, ITheme} from "xterm";
import {WebLinksAddon} from "xterm-addon-web-links"
import {FitAddon} from "xterm-addon-fit"
import {SearchAddon} from "xterm-addon-search"
import Scp from "~/components/ssh/Scp.vue";
import HostKeyConfirm from "~/components/ssh/HostKeyConfirm.vue";
import ContextMenu from "../common/ContextMenu.vue";
import Search from "../common/Search.vue";
import {api, genApiUrl} from "~/apis/client/base";
import Packet from '~~/lib/rpc/packet'
import {Prompt, Toast} from "~/lib/layer";
import {AuthType, SshConfModel, TunnelType} from "~/db/model/ssh-conf-model";
import {getCurrentInstance, nextTick, onMounted, onUnmounted, ref, shallowRef, watch} from "vue";
import ChooseFile from "~/lib/layer/choose-file";
import AssetConfigService from '~~/db/service/asset-config-service'

const TypeInit = "init"
const TypeError = "error"
const TypeInitialized = "initialized"
const TypeCmd = "cmd"
const TypeShell = "shell"
const TypeHostKeyConfirm = "hostKeyConfirm"
const TypeInteractive = "interactive"
const TypeChangeSize = "changeSize"
const TypeZModemReceive = "zmodemReceive"
const TypeZModemSend = "zmodemSend"
const TypeZModemUploadFile = "zmodemUploadFile"
const TypeZModemSkip = "zmodemSkip"

interface SshAuth{
  type: AuthType,
  password?: string
  privateKey?: string
}

interface SshConf{
  host: string,
  port: number,
  user: string,
  timeout: number,
  charset: string,
  language?: string,
  enableZModem?: boolean
  enableJumpServer?: boolean,
  jumpServer?: {
    host: string,
    port: number,
    user: string,
    auths: SshAuth[],
  },
  envs?: {
    name: string,
    value: string
  }[],
  tunnels?: {
    type: TunnelType
    bindIp:string
    bindPort:number
    srcIp:string
    srcPort:number
  }[],
  auths: SshAuth[],
  width?: number,
  height?: number,
}

interface KeyboardInteractiveReq {
  name:string
  instruction:string
  questions:string[]
  echos:boolean[]
}

interface KeyboardInteractiveResponse {
  cancel: boolean
  answers: string[]
}

interface ZModemReceiveEvent {
  setSaveDir: (dir:string)=>void
}

interface ZModemFile {
  filename: string
  Size:     number
  modTime:  number
  fileMode: number
  no:       number
  remFiles: number
  remSize : number
}

export {
  SshConf,SshAuth, KeyboardInteractiveReq, KeyboardInteractiveResponse,ZModemReceiveEvent, TypeInit,TypeInitialized,TypeInteractive,TypeHostKeyConfirm,TypeCmd,TypeShell,TypeZModemReceive
}

const DarkTermTheme = <ITheme>{
  /** The default foreground color */
  foreground: "#ffffff",
  /** The default background color */
  background: "#141414",
  /** The cursor color */
  cursor: "#919292",
  /** The accent color of the cursor (fg color for a block cursor) */
  cursorAccent: "#ffffff",
  /** The selection background color (can be transparent) */
  selectionBackground: "#6297e0",
  /** The selection foreground color */
  selectionForeground: null,
  selectionInactiveBackground: "#7e7e7e",
  /** ANSI black (eg. `\x1b[30m`) */
  black: "#000000",
  /** ANSI red (eg. `\x1b[31m`) */
  red: "#8c1a10",
  /** ANSI green (eg. `\x1b[32m`) */
  green: "#4aa22f",
  /** ANSI yellow (eg. `\x1b[33m`) */
  yellow: "#99972f",
  /** ANSI blue (eg. `\x1b[34m`) */
  blue: "#0018ab",
  /** ANSI magenta (eg. `\x1b[35m`) */
  magenta: "#a42aad",
  /** ANSI cyan (eg. `\x1b[36m`) */
  cyan: "#48a3b0",
  /** ANSI white (eg. `\x1b[37m`) */
  white: "#c0bfbf",
  /** ANSI bright black (eg. `\x1b[1;30m`) */
  brightBlack: "#666566",
  /** ANSI bright red (eg. `\x1b[1;31m`) */
  brightRed: "#d32d1f",
  /** ANSI bright green (eg. `\x1b[1;32m`) */
  brightGreen: "#63d33f",
  /** ANSI bright yellow (eg. `\x1b[1;33m`) */
  brightYellow: "#e6e34b",
  /** ANSI bright blue (eg. `\x1b[1;34m`) */
  brightBlue: "#0025f5",
  /** ANSI bright magenta (eg. `\x1b[1;35m`) */
  brightMagenta: "#d239de",
  /** ANSI bright cyan (eg. `\x1b[1;36m`) */
  brightCyan: "#67e2e3",
  /** ANSI bright white (eg. `\x1b[1;37m`) */
  brightWhite: "#e6e5e6",
}

const LightTermTheme = <ITheme>{
  /** The default foreground color */
  foreground: "#000000",
  /** The default background color */
  background: "#ffffff",
  /** The cursor color */
  cursor: "#929291",
  /** The accent color of the cursor (fg color for a block cursor) */
  cursorAccent: "#ffffff",
  /** The selection background color (can be transparent) */
  selectionBackground: "#6297e0",
  /** The selection foreground color */
  selectionForeground: null,
  selectionInactiveBackground: "#9f9f9f",
  /** ANSI black (eg. `\x1b[30m`) */
  black: "#000000",
  /** ANSI red (eg. `\x1b[31m`) */
  red: "#8c1a10",
  /** ANSI green (eg. `\x1b[32m`) */
  green: "#4aa22f",
  /** ANSI yellow (eg. `\x1b[33m`) */
  yellow: "#99972f",
  /** ANSI blue (eg. `\x1b[34m`) */
  blue: "#0018ab",
  /** ANSI magenta (eg. `\x1b[35m`) */
  magenta: "#a42aad",
  /** ANSI cyan (eg. `\x1b[36m`) */
  cyan: "#48a3b0",
  /** ANSI white (eg. `\x1b[37m`) */
  white: "#c0bfbf",
  /** ANSI bright black (eg. `\x1b[1;30m`) */
  brightBlack: "#666566",
  /** ANSI bright red (eg. `\x1b[1;31m`) */
  brightRed: "#d32d1f",
  /** ANSI bright green (eg. `\x1b[1;32m`) */
  brightGreen: "#63d33f",
  /** ANSI bright yellow (eg. `\x1b[1;33m`) */
  brightYellow: "#e6e34b",
  /** ANSI bright blue (eg. `\x1b[1;34m`) */
  brightBlue: "#0025f5",
  /** ANSI bright magenta (eg. `\x1b[1;35m`) */
  brightMagenta: "#d239de",
  /** ANSI bright cyan (eg. `\x1b[1;36m`) */
  brightCyan: "#67e2e3",
  /** ANSI bright white (eg. `\x1b[1;37m`) */
  brightWhite: "#e6e5e6",
}


export default {
  name: "SshTerminal",
  components: {Search, ContextMenu, HostKeyConfirm, Scp},
  props: {
    showServerInfo: {
      type: Boolean,
      default: ()=>{
        return false
      }
    },
    listenPath: {
      type: Boolean,
      default: ()=>{
        return true
      }
    },
    bell: {
      type: Boolean,
      default: false,
    },

  },
  emits: ["update:rpc","onZModemReceive","onNewTerminal","onChangePath","onDisconnect","onConnected","onClose","closeWindow"],
  setup(props, ctx) {
    const vuetifyTheme = useTheme()
    const proxy = <any>getCurrentInstance().proxy

    const scp = ref()
    const hostKeyConfirm = ref()
    const search = ref()
    const terminalDiv = ref<HTMLDivElement>()

    const rpc = shallowRef<Rpc>(null)
    const loading = ref(false)
    const searchOpt = ref({
      show: false,
      regex: false,
      wholeWord: false,
      caseSensitive: false,
      incremental: false,
      noScroll: false,
      decorations: {
        matchBackground: "#BBDEFB",
        matchBorder: "none",
        matchOverviewRuler: null,
        activeMatchBackground: "rgb(112,162,255)",
        activeMatchBorder: "none",
        activeMatchColorOverviewRuler: null,
      }
    });

    let sshConfig = <SshConf>null;
    let rows = 40;
    let cols = 80;
    let terminal = <Terminal>null;
    let searchAddon = <SearchAddon>null;
    let fitAddon = <FitAddon>null;
    let currentPath = "";
    let changedPath = false;
    let readPwdBuffer = "";
    let closed = true;

    const getTermTheme = () => {
      if (vuetifyTheme.current.value.dark) {
        return DarkTermTheme
      } else {
        return LightTermTheme
      }
    };
    const updateTermTheme = () => {
      if (terminal != null) {
        terminal.options.theme = getTermTheme()
      }
    };
    const initMenu = () => {
      const copyStr = terminal.getSelection()
      return [
        {
          type: "title",
          title: proxy.$t('common.operate'),
        },
        {
          type: "item",
          title: proxy.$t('common.copy'),
          icon: "mdi-content-copy",
          disabled: !copyStr,
          click: () => doCopy(copyStr)
        },
        {
          type: "item",
          title: proxy.$t('common.paste'),
          icon: "mdi-content-paste",
          click: () => paste()
        },
        {type: "line"},
        {
          type: "item",
          title: proxy.$t('ssh.new-window'),
          icon: 'mdi-shape-square-rounded-plus',
          click: () => {
            ctx.emit('onNewTerminal')
          }
        },
        {
          type: "item",
          title: proxy.$t('common.reconnect'),
          icon: "mdi-repeat",
          click: () => reconnection()
        },
        {
          type: "item",
          title: proxy.$t('ssh.clear-screen'),
          icon: "mdi-trash-can-outline",
          click: () => clear()
        },
        {
          type: "item",
          title: proxy.$t('common.close'),
          icon: "mdi-close-box-outline",
          click: () => ctx.emit("closeWindow")
        }
      ]
    };
    const openScpUpload = () => {
      if (rpc.value != null) {
        scp.value.openUpload(currentPath)
      }
    };
    const openScpDownload = () => {
      if (rpc.value != null) {
        scp.value.openDownload(Common.pathJoin("/", [currentPath, "filename"]))
      }
    };
    const close = () => {
      closed = true
      if (rpc.value !== null) {
        rpc.value.close(1000, "destroy")
        rpc.value = null
      }
      if (terminal !== null) {
        terminal.dispose()
        terminal = null
      }
    };
    const cmd = (cmd: string) => {
      return new Promise<string>((resolve, reject) => {
        if (closed) {
          reject(new Error("ssh is closed"))
        } else {
          rpc.value.sendWaitReply(TypeCmd, cmd).then((p) => {
            resolve(p.string())
          }).catch((err) => {
            reject(err)
          })
        }
      });
    };
    const reconnection = () => {
      if (rpc.value && !closed) {
        rpc.value.close(1000, '')
      }
      lodash.delay(() => {
        open(sshConfig)
      }, 250)
    };
    const open = async (conf: SshConf) => {
      //复制一份
      conf = lodash.cloneDeepWith(conf)
      if (!conf.language) {
        conf.language = navigator.language.replaceAll("-", "_")
      }
      sshConfig = conf
      await initTerm()
      await initRpc(sshConfig)
    };
    const openByConfId = async (id: string) => {
      const service = AssetConfigService.getInstance()
      const model = await service.find<SshConfModel>(id)
      if (model) {
        await service.updateAccessed(id)
        await open(model.data.toSshConf())
      } else {
        throw new Error("The ssh conf does not exist")
      }
    };
    const initTerm = async () => {
      //ssr无法在server层渲染xterm，所以改为动态加载
      const {Terminal} = await import("xterm")
      const {WebLinksAddon} = await import("xterm-addon-web-links")
      const {FitAddon} = await import("xterm-addon-fit")
      const {SearchAddon} = await import("xterm-addon-search")
      const {CanvasAddon} = await import("xterm-addon-canvas")

      changedPath = false
      readPwdBuffer = ""
      if (!terminal) {
        const terminalConf = <ITerminalOptions>{
          allowProposedApi: true,
          allowTransparency: true,
          altClickMovesCursor: true,
          convertEol: true, //启用时，光标将设置为下一行的开头
          disableStdin: false, //是否应禁用输入。
          cursorStyle: 'block', //光标样式
          cursorBlink: true, //光标闪烁
          letterSpacing: 0,
          rightClickSelectsWord: true,
          fontWeight: 400,
          fontWeightBold: 600,
          scrollSensitivity: 2,
          fontSize: 12,
          fontFamily: "JetBrainsMono",
          windowOptions: {
            refreshWin: false,
            pushTitle: false
          },
          theme: getTermTheme()
        }

        terminal = new Terminal(terminalConf);

        terminal.loadAddon(new CanvasAddon());
        terminal.loadAddon(new WebLinksAddon());
        fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        searchAddon = new SearchAddon();
        terminal.loadAddon(searchAddon);
        terminal.open(terminalDiv.value);
        terminalFit();

        terminal.onBell(()=>{
          if(props.bell){
            let player = new Audio("/audio/bell.mp3");
            player.play()
          }
        })


        terminal.onKey((event) => {
          const key = event.domEvent
          if (key.key === "Enter" && props.listenPath) {
            //监听cd后path变化
            const command = terminal.buffer.normal
                .getLine(terminal.buffer.normal.cursorY + terminal.buffer.normal.viewportY)
                .translateToString()
            const cdIdx = command.indexOf(" cd ")
            if (cdIdx !== -1) {
              let cdEndIdx = command.indexOf(" ",cdIdx+6)
              if(cdEndIdx === -1){
                cdEndIdx = command.length;
              }
              const path = command.substring(cdIdx + 4,  cdEndIdx).trim()
              const hasGetPwd = command.includes(" && pwd")
              if (path) {
                if(path.startsWith("/")){
                  //绝对路径不用通过pwd获取当前路径
                  ctx.emit("onChangePath", path)
                }else{
                  changedPath = true
                  if(!hasGetPwd){
                    writeStr(" && pwd")
                  }
                }

              }
            }
          } else if (key.ctrlKey || key.metaKey) {
            // const copyStr = terminal.getSelection()
            switch (key.key.toLowerCase()){
              // case "c":
              //   if(copyStr){
              //     doCopy(copyStr)
              //   }
              //   break
              case "v":
                // paste()
                break
              case "f":
                showSearch()
                break
            }
          }
        })

        terminal.onData((str) => {
          // console.log("data：",str)
          writeStr(str)
        })
      }
      focus()
    };
    const initRpc = async (sshConfig: SshConf) => {
      // console.log("fff",zmodem)
      if (rpc.value === null) {
        const mRpc = new Rpc(genApiUrl("ws", "remote-control", "ssh"), 10000)
        rpc.value = mRpc
        loading.value = true
        ctx.emit("update:rpc", mRpc)
        mRpc.on(TypeShell, (p) => {
          if (loading.value) {
            loading.value = false
          }
          const str = p.string()
          // console.log(str)
          if (changedPath && props.listenPath) {
            //取出cd 后pwd路径变化信息
            readPwdBuffer += str
            readPwdBuffer = readPwdBuffer.replaceAll("\r\n","\n").replaceAll("\r","\n")
            let pwdIdx = readPwdBuffer.indexOf("\n/")
            if(pwdIdx >= 0){
              let pwdEndIdx = readPwdBuffer.indexOf("\n",pwdIdx+1)
              if(pwdEndIdx >= 0){
                let pwd = readPwdBuffer.substring(pwdIdx+1,pwdEndIdx)
                const temp = readPwdBuffer.substring(0,pwdIdx)+readPwdBuffer.substring(pwdEndIdx,readPwdBuffer.length)
                changedPath = false
                terminal.write(temp)
                readPwdBuffer = ""
                ctx.emit("onChangePath", pwd)
                return
              }
            }

            if(readPwdBuffer.split("\n").length > 3){
              changedPath = false
              readPwdBuffer = ""
              return;
            }

          }else{
            terminal.write(str)
          }
        })
        //ZModem下载文件
        mRpc.on(TypeZModemReceive, (p: Packet) => {
          let evt = <ZModemReceiveEvent>{
            setSaveDir: (dir:string)=>{
              if (dir){
                mRpc.reply(TypeZModemReceive, dir, p)
              }else{
                mRpc.reply(TypeError, "", p)
              }
            }
          }
          ctx.emit("onZModemReceive",evt)
        })
        //ZModem上传文件
        mRpc.on(TypeZModemSend, async (p: Packet) => {
          ChooseFile.open("请选择上传文件").then((file)=>{
            mRpc.sendWaitReply(TypeZModemUploadFile,{fileSize:file.size,filename:file.name},-1,p).then((p:Packet)=>{
              const url = p.string()
              const form = new FormData()
              form.set("file",file)
              api.post(url,form,{baseURL: null})
            })
          }).catch(()=>{
            mRpc.reply(TypeZModemSkip,"",p)
          })
        })
        //ZModem上传文件被忽略
        mRpc.on(TypeZModemSkip, async (p: Packet) => {
          const file = p.json<ZModemFile>()
          Toast.error(`文件 ${file.filename} 已存在上传请求被忽略,请添加强制覆盖参数`)
        })
        mRpc.onclose = (event) => {
          ctx.emit("onDisconnect")
          console.log("closeEvt", event)
          if (loading.value) {
            loading.value = false
          }
          // console.log(event)
          closed = true
          if (terminal != null) {
            const dividingLine = '\r\n' + ('-'.repeat(cols))
            const disconnectMsg = proxy.$t("ssh.disconnect-msg", {
              "reason": event.code === 1006 ? proxy.$t("ssh.not-start-plugin") : event.reason
            })
            terminal.writeln(dividingLine + "\r\n\x1B[31m" + disconnectMsg + "\x1B[0m" + dividingLine)
            ctx.emit("onClose", event)
          }
        }
        mRpc.onopen = async () => {
          terminal.clear()
          //发送服务器配置，并等待回应
          await mRpc.sendWaitReply(TypeInit, sshConfig, 0)
        }

        //需要等待服务器发送Host Key确认信号
        mRpc.on(TypeHostKeyConfirm, async (p: Packet) => {
          const res = p.json<{ wantConfirm: boolean }>()
          // console.log("rrr", res)
          //如果需要确认
          if (res.wantConfirm) {
            try {
              //选择同意，并获取是否保存本次选择
              const persist = await hostKeyConfirm.value.open(res)
              mRpc.reply(TypeHostKeyConfirm, {
                allow: true,
                persist: persist,
              }, p)
            } catch (e) {
              //选择拒绝
              mRpc.reply(TypeHostKeyConfirm, {
                allow: false,
                persist: false,
              }, p)
            }
          }
        })
        //处理键盘输入框请求
        mRpc.on(TypeInteractive, async (p: Packet) => {
          const req = p.json<KeyboardInteractiveReq>()
          const response = <KeyboardInteractiveResponse>{
            answers: new Array(req.echos.length),
            cancel: false
          }
          try {
            for (let i = 0; i < req.echos.length; i++) {
              const echo = req.echos[i]
              const question = req.questions[i]
              response.answers[i] = await Prompt.open(question, "")
              if (echo) {
                //需要回显到终端
                terminal.writeln(question + response.answers[i])
              }
            }
          } catch (e) {
            response.cancel = true
          }
          mRpc.reply(TypeInteractive, response, p)
        })
        //初始化完成
        mRpc.on(TypeInitialized, async (p: Packet) => {
          ctx.emit("onConnected", p.string())
          closed = false;
          focus()
          try {
            let path = await cmd("pwd")
            path = lodash.trimEnd(path, "\n")
            currentPath = path
            ctx.emit("onChangePath", path)
          } catch (err) {
            console.log(err)
          }
        })
      }
      rpc.value.open()
    };
    const focus = () => {
      terminal.focus()
    };
    const doCopy = (str:string) => {
      clipboard.writeText(str).then(() => {
        focus()
        terminal.clearSelection()
      }).catch(err => {
        Toast.error(err.message)
      });
    };
    const paste = () => {
      clipboard.readText().then((str) => {
        terminal.paste(str)
      }).catch(() => {
        Toast.error("粘贴失败，请打开浏览器粘贴板读取权限")
      }).finally(() => {
        focus()
      });
    };
    const clear = () => {
      terminal.clear()
      focus()
    };
    const writeStr = (str) => {
      rpc.value.send(TypeShell, str)
    };
    const showSearch = () => {
      search.value.switchShow()
    };
    const closeSearch = () => {
      searchAddon.clearDecorations()
      focus()
    };
    const findPrevious = (val) => {
      if (val) {
        if (!searchAddon.findPrevious(val, searchOpt.value)) {
          Toast.warn('无更多关于该关键字的内容！')
        }
      }
    };
    const findNext = (val) => {
      if (val) {
        if (!searchAddon.findNext(val, searchOpt.value)) {
          Toast.warn('无更多关于该关键字的内容！')
        }
      }
    };
    const terminalFit = () => {
      if(terminalDiv.value.offsetParent === null){
        //当前元素已隐藏不用重新计算大小了
        return
      }
      fitAddon.fit();
      const size = fitAddon.proposeDimensions()
      cols = size?.cols ?? 40;
      rows = size?.rows ?? 16;
      sshConfig.width = cols
      sshConfig.height = rows
    };
    const onResize = () => {
      if (terminal != null) {
        terminalFit()
        if (rpc.value != null && !closed) {
          const buf = new ByteBuffer()
          buf.writeUint32(cols)
          buf.writeUint32(rows)
          rpc.value.send(TypeChangeSize, buf)
        }
      }
    };
    const onFileDropCallback = (e: DragEvent) => {
      const files = e.dataTransfer.items;
      if(e.dataTransfer.files.length > 0){
        scp.value.openUpload(currentPath, files)
      }
    };

    onUnmounted(() => {
      close()
    })

    watch(() => vuetifyTheme.current.value.dark, (isDark) => {
      updateTermTheme()
    })

    return {
      terminalDiv, scp, hostKeyConfirm,
      search, rpc, loading, searchOpt,
      initMenu, onFileDropCallback, close, findPrevious, findNext, closeSearch,writeStr,
      open,reconnection, openByConfId, openScpUpload, openScpDownload, onResize,focus,
    }
  },
}
</script>

<style lang="scss">
.term-wrapper{
  background: #ffffff;
  height: 100%;
}
.v-theme--dark{
  .term-wrapper{
    background: #1e1e1e;
  }
}
</style>
