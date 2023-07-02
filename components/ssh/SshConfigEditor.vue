<template>
  <div>
    <ssh-tunnel-editor ref="tunnelEditor"></ssh-tunnel-editor>
    <ssh-private-key-choice ref="privateKeyChoice"></ssh-private-key-choice>
    <v-dialog v-model="show" persistent width="510px">
      <v-card class="pa-3" v-drag="'.v-overlay__content'">
        <v-card-title >SSH配置编辑</v-card-title>
        <v-row justify="center" no-gutters>
          <v-btn-toggle
              style="height: 25px"
              mandatory
              color="primary"
              v-model="tab"
          >
            <v-btn density="compact" :value="0" size="small">标准</v-btn>
            <v-btn density="compact" :value="1" size="small" v-if="model.enableJumpServer">跳板机</v-btn>
            <v-btn density="compact" :value="2" size="small">隧道</v-btn>
            <v-btn density="compact" :value="3" size="small">环境变量</v-btn>
            <v-btn density="compact" :value="4" size="small">高级</v-btn>
          </v-btn-toggle>
        </v-row>
        <v-window v-model="tab">
          <v-window-item
              :value="0"
              class="pa-3 pb-0"
          >
            <v-row>
              <v-col>
                <v-text-field v-model="model.name" :error-messages="validResult.name" persistent-placeholder density="compact" label="名称" variant="underlined"></v-text-field>
              </v-col>
              <v-col>
                <v-text-field v-model="model.host" :error-messages="validResult.host" persistent-placeholder density="compact" label="Host" variant="underlined"></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <v-text-field v-model="model.user" :error-messages="validResult.user" persistent-placeholder density="compact" label="User" variant="underlined"></v-text-field>
              </v-col>
              <v-col>
                <v-text-field v-model="model.port" :error-messages="validResult.port" type="number" persistent-placeholder density="compact" label="端口" variant="underlined"></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col align-self="center">
                <v-switch
                    style="transform: scale(.8) translateX(-10%);"
                    inset
                    v-model="model.enableJumpServer"
                    color="primary"
                    density="compact"
                    label="开启跳板机"
                    hide-details
                >
                </v-switch>
                <v-chip-group
                    class="pa-0 pl-1 pr-1"
                    selected-class="text-primary"
                    column
                    mandatory
                    v-model="model.authType"
                >
                  <v-chip size="small" :value="AuthTypes.ServerPrivateKey" v-if="model.enableJumpServer">
                    跳板机私钥
                  </v-chip>
                  <v-chip size="small" :value="AuthTypes.Password">
                    密码
                  </v-chip>
                  <v-chip size="small" :value="AuthTypes.PrivateKey">
                    私钥
                  </v-chip>
                  <v-chip size="small" :value="AuthTypes.Interactive">
                    交互式验证
                  </v-chip>
                  <v-chip size="small" :value="AuthTypes.None">
                    不验证
                  </v-chip>
                </v-chip-group>
              </v-col>
              <v-col>
                <v-text-field
                    v-if="model.authType === AuthTypes.ServerPrivateKey || model.authType === AuthTypes.Password || model.authType === AuthTypes.Interactive"
                    :model-value="editingId && !changedPassword.normal ? '' : model.password"
                    :placeholder="editingId && !changedPassword.normal ? '*'.repeat((model.password+'').length) : ''"
                    @update:modelValue="model.password = $event;changedPassword.normal=true"
                    :error-messages="validResult.password"
                    type="password"
                    persistent-placeholder
                    density="compact"
                    :label="model.authType === AuthTypes.ServerPrivateKey ? '私钥密码' : '密码'"
                    variant="underlined">
                </v-text-field>
                <v-text-field
                    :error-messages="validResult.privateKey"
                    v-if="model.authType === AuthTypes.PrivateKey"
                    :model-value="model.privateKey?.name"
                    persistent-placeholder
                    readonly
                    label="私钥"
                    density="compact"
                    variant="underlined"
                    append-inner-icon="mdi-crosshairs-gps"
                    @click:appendInner="doChoicePrivateKey"
                    v-on:click="doChoicePrivateKey"
                    v-on:keydown.enter="doChoicePrivateKey"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-window-item>
          <v-window-item
              v-if="model.enableJumpServer"
              :value="1"
              class="pa-3 pb-0"
          >
            <v-card-subtitle class="pl-0 mb-3">Tips: 客户端会先连接跳板机,再通过跳板机连接SSH服务器</v-card-subtitle>
            <v-row>
              <v-col>
                <v-text-field v-model="model.jumpServer.host" :error-messages="validResult['jumpServer.host']" :disabled="!model.enableJumpServer" persistent-placeholder density="compact" label="Host" variant="underlined"></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <v-text-field v-model="model.jumpServer.user" :error-messages="validResult['jumpServer.user']" :disabled="!model.enableJumpServer" persistent-placeholder density="compact" label="User" variant="underlined"></v-text-field>
              </v-col>
              <v-col>
                <v-text-field v-model="model.jumpServer.port" :error-messages="validResult['jumpServer.port']" :disabled="!model.enableJumpServer" persistent-placeholder density="compact" label="端口" variant="underlined"></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <v-chip-group
                    selected-class="text-primary"
                    column
                    mandatory
                    v-model="model.jumpServer.authType"
                    :disabled="!model.enableJumpServer"
                >
                  <v-chip size="small" :value="AuthTypes.Password">
                    密码
                  </v-chip>
                  <v-chip size="small" :value="AuthTypes.PrivateKey">
                    私钥
                  </v-chip>
                  <v-chip size="small" :value="AuthTypes.Interactive">
                    交互式验证
                  </v-chip>
                  <v-chip size="small" :value="AuthTypes.None">
                    不验证
                  </v-chip>
                </v-chip-group>
              </v-col>
              <v-col>
                <v-text-field
                    v-if="model.jumpServer.authType === AuthTypes.Password"
                    :disabled="!model.enableJumpServer"
                    :model-value="editingId && !changedPassword.jumpServer ? '' : model.jumpServer.password"
                    :placeholder="editingId && !changedPassword.jumpServer ? '*'.repeat((model.jumpServer.password+'')?.length) : ''"
                    @update:modelValue="model.jumpServer.password = $event;changedPassword.jumpServer=true"
                    :error-messages="validResult['jumpServer.password']"
                    type="password"
                    density="compact"
                    persistent-placeholder
                    label="密码"
                    variant="underlined">
                </v-text-field>
                <v-text-field
                    v-if="model.jumpServer.authType === AuthTypes.PrivateKey"
                    :model-value="model.jumpServer.privateKey?.name"
                    :disabled="!model.enableJumpServer"
                    :error-messages="validResult['jumpServer.privateKey']"
                    persistent-placeholder
                    readonly
                    label="私钥"
                    density="compact"
                    variant="underlined"
                    append-inner-icon="mdi-crosshairs-gps"
                    @click:appendInner="doChoiceJumpServerPrivateKey"
                    v-on:click="doChoiceJumpServerPrivateKey"
                    v-on:keydown.enter="doChoiceJumpServerPrivateKey"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-window-item>
          <v-window-item
              :value="2"
              style="height: 240px"
          >
            <v-divider class="mt-1"></v-divider>
            <div style="height: 230px">
              <advanced-table
                  :headers="tunnelHeaders"
                  :items="model.tunnels"
                  :search-provider="(idx,item)=>item.name"
                  @clickItem="doOpenTunnelEditor"
                  @delete="doDelTunnel"
                  @contextMenuItem="onTunnelContextMenuItem">
              </advanced-table>
            </div>
            <v-divider></v-divider>
          </v-window-item>
          <v-window-item
              :value="3"
              style="height: 240px"
          >
            <v-divider class="mt-1"></v-divider>
            <div style="height: 230px">
              <advanced-table
                  :headers="envHeaders"
                  :items="model.envs"
                  :search-provider="(idx,item)=>item.name"
                  @delete="doDelEnv"
                  @contextMenuItem="onEnvContextMenuItem">
                <template  #td="{item,key,colIdx,idx,header}">
                  <td>
                    <simple-input
                        v-on:keydown.stop
                        v-on:mousedown.stop
                        style="color: inherit;width: 100%;padding: 2px 4px;"
                        v-model="item[key]">
                    </simple-input>
                  </td>
                </template>
                <template #th="{header}">
                  <span>{{header.title}}</span>
                  <v-icon
                      v-if="header.key === 'name'"
                      class="ml-1"
                      size="x-small"
                      variant="tonal"
                      density="density"
                      icon="mdi-help-circle-outline"
                      v-tooltip="{
                        content: `<ul style='font-size: 12px;padding: 5px 10px'>
                        <li>环境变量设置需要服务器允许,OpenSSH默认不允许修改环境变量,请自行修改sshd配置</li>
                        <li>环境变量支持变量注入,例如要添加PATH环境变量可设置为: /xxx/xxx:\${PATH}</li>
                        </ul>`,
                        html:true
                      }"
                  ></v-icon>
                </template>
              </advanced-table>
            </div>
            <v-divider></v-divider>
          </v-window-item>
          <v-window-item
              :value="4"
              class="pa-3 pb-0"
              style="height: 240px;"
          >
            <v-row>
              <v-col>
                <v-checkbox v-model="model.enableSftp" label="启用SFTP面板" hide-details density="compact" color="primary"></v-checkbox>
              </v-col>
              <v-col>
                <v-checkbox v-model="model.enableZModem" label="启用ZModem协议" hide-details density="compact" color="primary"></v-checkbox>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <v-autocomplete
                    v-model="model.charset"
                    persistent-hint
                    hide-details
                    label="编码"
                    placeholder="自动"
                    density="compact"
                    variant="underlined"
                    :items="CharsetList"
                ></v-autocomplete>
              </v-col>
              <v-col>
                <v-text-field v-model="model.language" persistent-placeholder density="compact" label="语言" variant="underlined"></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col>
                <v-text-field v-model="model.description" persistent-placeholder density="compact" label="备注" variant="underlined"></v-text-field>
              </v-col>
              <v-col>
                <v-text-field v-model="model.timeout"  :error-messages="validResult.timeout" persistent-placeholder type="number" density="compact" label="连接超时(秒)" variant="underlined"></v-text-field>
              </v-col>
            </v-row>
          </v-window-item>
        </v-window>

        <v-card-actions style="min-height: 30px;padding-top: 20px;padding-bottom: 0">
          <v-spacer></v-spacer>
          <v-btn
              color="warning"
              density="comfortable"
              variant="text"
              v-on:click="close"
          >
            关闭
          </v-btn>
          <v-btn
              color="info"
              density="comfortable"
              variant="text"
              :disabled="hasError"
              :loading="loading"
              v-on:click="doTest"
          >
            测试连接
          </v-btn>
          <v-btn
              color="primary"
              density="comfortable"
              variant="text"
              :disabled="hasError"
              :loading="loading"
              v-on:click="doSave"
          >
            保存
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import {boolean, lazy, number, object, string, ValidationError} from 'yup';
import {getCurrentInstance, ref, shallowRef, watch} from "vue";
import DataTable from "~/components/db/common/DataTable.vue";
import AdvancedTable from "~/components/common/AdvancedTable.vue";
import {
  AuthTypes,
  SshConfModel,
  SshEnvModel,
  SshPrivateKeyKeyModel,
  SshTunnelModel,
  TunnelTypes
} from "~/db/model/ssh-conf-model";
import {Confirm, ContextMenu, Prompt, Toast} from "~/lib/layer";
import SshPrivateKeyChoice from "~/components/ssh/SshPrivateKeyChoice.vue";
import Rpc from "~/lib/rpc";
import {genApiUrl} from "~/apis/client/base";
import Packet from "~/lib/rpc/packet";
import {
  KeyboardInteractiveReq,
  KeyboardInteractiveResponse,
  TypeHostKeyConfirm,
  TypeInit,
  TypeInitialized,
  TypeInteractive
} from './SshTerminal.vue';
import SimpleInput from "~/components/common/SimpleInput.vue";
import AssetConfigService from '~~/db/service/asset-config-service';
import {AssetType} from "~/db/model/asset-conf-model";

const CharsetList = Object.freeze([
    "UTF-8",
    "GBK",
    "GB2312",
    "GB18030",
    "ASCII",
    "US-ASCII",
    "EUC-JP",
    "EUC-KR",
    "ISO-2022-JP",
    "ISO-2022-JP-2",
    "CP1250",
    "CP1251",
    "CP1252",
    "CP1253",
    "CP1254",
    "CP1255",
    "CP1256",
    "UCS-1",
    "UCS-2",
    "UCS-3",
    "UCS-4",
    "BIG5",
    "UTF-16",
    "UTF-32",
    "Shift_JIS-2004",
    "EUC-JIS-2004",
    "ISO-2022-JP-2004",
    "ISO-2022-KR",
    "ISO-2022-JP",
    "ISO-8859-1",
    "ISO-8859-2",
    "ISO-8859-3",
    "ISO-8859-4",
    "ISO-8859-5",
    "ISO-8859-6",
    "ISO-8859-7",
    "ISO-8859-8",
    "ISO-8859-9",
    "ISO-8859-10",
    "ISO-8859-11",
    "ISO-8859-12",
    "ISO-8859-13",
    "ISO-8859-14",
    "ISO-8859-15",
    "ISO-8859-16",
    "Windows-1250",
    "Windows-1251",
    "Windows-1252",
    "Windows-1253",
    "Windows-1254",
    "Windows-1255",
    "Windows-1256",
    "Windows-1257",
    "Windows-1258",
])

export default {
  name: "SshConfigEditor",
  components: {SimpleInput, SshPrivateKeyChoice, AdvancedTable, DataTable},
  emits: ["refresh"],
  setup(props,ctx){
    const proxy = <any>getCurrentInstance().proxy
    const tunnelEditor = ref()
    const privateKeyChoice = ref()
    const show = ref(false)
    const service = AssetConfigService.getInstance()
    const model = ref<SshConfModel>(null)
    const tab = ref(0)
    const changedPassword = ref({normal:false,jumpServer:false})
    let dirPath = ""
    let editingId = ref<string>(null)
    const envHeaders = [
      {title:"名称",key:"name",tdClass:'text-left pl-1',minWidth: 120, width: 200},
      {title:"值",key:"value",tdClass:'text-left pl-1'},
    ]
    const tunnelHeaders = [
      {title:"名称",key:"name",tdClass:'text-left pl-1',sortable: true,minWidth: 75, width: 75},
      {
        title:"类型",key:"type",tdClass:'text-left pl-1',sortable: true,minWidth: 55,width:55,
        formatFunc: (item:any,idx:number)=>{
          const type = item.type
          switch (type){
            case TunnelTypes.TcpLocal:
              return "本地"
            case TunnelTypes.TcpRemote:
              return "远程"
            case TunnelTypes.Socks5Local:
              return "本地SOCKS5"
            case TunnelTypes.Socks5Remote:
              return "远程SOCKS5"
          }
        }
      },
      {title:"绑定IP",key:"bindIp",tdClass:'text-left pl-1',sortable: true,minWidth: 75, width: 75},
      {title:"绑定端口",key:"bindPort",tdClass:'text-left pl-1',sortable: true,minWidth: 75,width: 75},
      {
        title:"目标IP",key:"srcIp",tdClass:'text-left pl-1',sortable: true,minWidth: 75, width: 75,
        formatFunc: (item:any,idx:number)=>{
          return item.srcIp??'-'
        }
      },
      {
        title:"目标端口",key:"srcPort",tdClass:'text-left pl-1',sortable: true,minWidth: 75, width: 75,
        formatFunc: (item:any,idx:number)=>{
          return item.srcPort??'-'
        }
      },
    ]
    const tunnels = []

    const validResult = shallowRef({})
    const hasError = ref(false)
    const loading = ref(false)

    const validSchema = object({
      name: string().required(),
      port: number().min(0).max(65535).required().integer(),
      user: string().required(),
      host: string().required(),
      password: lazy(()=>{
        const authType = model.value.authType
        if(authType === AuthTypes.Password){
          return string().required()
        }
        return string()
      }),
      authType: lazy(()=>{
        if(model.value.enableJumpServer){
          return number().oneOf([AuthTypes.Password,AuthTypes.Interactive,AuthTypes.PrivateKey,AuthTypes.ServerPrivateKey,AuthTypes.None])
        }else{
          return number().oneOf([AuthTypes.Password,AuthTypes.Interactive,AuthTypes.PrivateKey,AuthTypes.None])
        }
      }),
      privateKey: lazy(()=>{
        const authType = model.value.authType
        if(authType === AuthTypes.PrivateKey){
          return object().required()
        }
        return object()
      }),
      timeout: number().min(1).max(60).integer().optional(),
      enableJumpServer: boolean(),
      jumpServer: lazy(()=>{
        if(model.value.enableJumpServer){
          return object({
            port: number().min(0).max(65535).required().integer(),
            user: string().required(),
            host: string().required(),
            authType: number().oneOf([AuthTypes.Password,AuthTypes.Interactive,AuthTypes.PrivateKey,AuthTypes.None]),
            password: lazy(()=>{
              const authType = model.value.jumpServer.authType
              if(authType === AuthTypes.Password){
                return string().required()
              }
              return string()
            }),
            privateKey: lazy((v)=>{
              const authType = model.value.jumpServer.authType
              if(authType === AuthTypes.PrivateKey){
                return object().required()
              }
              return object()
            }),
          })
        }
        return object()
      }),
    })

    const close = ()=>{
      show.value = false
    }

    const doDelEnv = (items:SshEnvModel[])=>{
      Confirm.open("确认是否删除选择项").then(()=>{
        const modelValue = model.value
        //直接过滤掉已删除的item，实现删除功能
        modelValue.envs = modelValue.envs.filter((env)=>{
          return !items.includes(env)
        })
      })
    }

    const doDelTunnel = (tunnels:SshTunnelModel[])=>{
      Confirm.open("确认是否删除选择项").then(()=>{
        const set = new Set(tunnels)
        //排除选择删除的项
        model.value.tunnels = model.value.tunnels.filter((item)=>!set.has(item))
      })
    }

    const doRenameTunnel = (tunnel:SshTunnelModel)=>{
      Prompt.open("请输入重命名名称",tunnel.name).then(async (name:string) => {
        tunnel.name = name
      })
    }

    const doOpenTunnelEditor = (tunnel?:SshTunnelModel)=>{
      const tunnelIdx = model.value.tunnels.indexOf(tunnel)
      tunnelEditor.value.open(tunnel).then((v:SshTunnelModel)=>{
        if(tunnelIdx === -1){
          //新建
          model.value.tunnels.push(v)
        }else{
          //编辑
          model.value.tunnels[tunnelIdx] = v
        }
      })
    }

    const doSave=()=>{
      loading.value = true
      //过滤掉无效环境变量
      const modelVal = model.value
      if(modelVal.envs){
        modelVal.envs = modelVal.envs.filter((env)=>env.name || env.value)
      }
      const mEditingId = editingId.value
      if(mEditingId){
        service.update(mEditingId, modelVal).then(()=>{
          loading.value = false
          Toast.success("更新成功")
          ctx.emit("refresh")
          close()
        }).catch(e=>{
          loading.value = false
          console.log("err",e)
          Toast.error(e.message)
        })
      }else{
        service.add(AssetType.SSH, modelVal, dirPath).then(()=>{
          loading.value = false
          Toast.success("创建成功")
          ctx.emit("refresh")
          close()
        }).catch(e=>{
          loading.value = false
          console.log("err",e)
          Toast.error(e.message)
        })
      }
    }

    const doChoicePrivateKey=()=>{
      privateKeyChoice.value.open().then((key:SshPrivateKeyKeyModel)=>{
        model.value.privateKey = key
      })
    }

    const doChoiceJumpServerPrivateKey=()=>{
      privateKeyChoice.value.open().then((key:SshPrivateKeyKeyModel)=>{
        model.value.jumpServer.privateKey = key
      })
    }

    const doTest=()=>{
      const sshConfig = model.value.toSshConf()
      const rpc = new Rpc(genApiUrl("ws","remote-control","ssh"), 10000)
      loading.value = true
      rpc.onclose = (event) => {
        loading.value = false
        //非正常关闭
        const msg = proxy.$t("ssh.disconnect-msg", {
          "reason": event.code === 1006 ? proxy.$t("ssh.not-start-plugin") : event.reason
        })
        Toast.error(msg)

      }
      rpc.onopen = async () => {
        //发送服务器配置，并等待回应
        await rpc.sendWaitReply(TypeInit, sshConfig, 0)
      }

      //需要等待服务器发送Host Key确认信号
      rpc.on(TypeHostKeyConfirm, async (p:Packet) => {
        //首次连接服务器需要确认，直接自动同意
        rpc.reply(TypeHostKeyConfirm, {
          allow: true,
          persist: false,
        }, p)
      })

      //处理键盘输入框请求
      rpc.on(TypeInteractive, async (p:Packet) => {
        const req = p.json<KeyboardInteractiveReq>()
        const response = <KeyboardInteractiveResponse>{
          answers: new Array(req.echos.length),
          cancel: false
        }
        try{
          for (let i = 0; i < req.echos.length; i++) {
            const question = req.questions[i]
            response.answers[i] = await Prompt.open(question, "")
          }
        }catch (e){
          response.cancel = true
        }
        rpc.reply(TypeInteractive, response, p)
      })
      //初始化完成,连接成功
      rpc.on(TypeInitialized, async (p: Packet) => {
        Toast.success("连接成功")
        loading.value = false
        rpc.onclose = null
        rpc.close(1000,"end")
      })
      rpc.open()
    }

    const openEdit = async (id: string) => {
      editingId.value = id
      changedPassword.value = {normal: false,jumpServer: false}
      model.value = await service.findData<SshConfModel>(id)
      show.value = true
    }

    const openCreate = (mDirPath?:string)=>{
      editingId.value = null
      dirPath = mDirPath
      changedPassword.value = {normal: false,jumpServer: false}
      const confModel = new SshConfModel()
      confModel.language = navigator.language.replaceAll("-", "_")
      model.value = confModel
      show.value = true
    }

    const onEnvContextMenuItem = function (evt:MouseEvent,items:Array<SshEnvModel>){
      ContextMenu.open(evt,[
        {
          type: "title",
          title: proxy.$t('common.operate'),
        },
        {type: "line"},
        {
          type: "item",
          title: proxy.$t('common.new'),
          icon: "mdi-link-plus",
          click: ()=>{
            const modelValue = model.value
            if(modelValue.envs == null){
              modelValue.envs = [new SshEnvModel("env1")]
            }else{
              modelValue.envs.push(new SshEnvModel(`env${modelValue.envs.length+1}`))
            }
          }
        },
        {
          type: "item",
          title: '删除',
          icon: "mdi-close",
          disabled: items.length === 0,
          click: ()=>{
            doDelEnv(items)
          }
        },
      ],160).catch((err)=>{});
    }

    const onTunnelContextMenuItem = function (evt:MouseEvent,items:Array<SshTunnelModel>){
      ContextMenu.open(evt,[
        {
          type: "title",
          title: proxy.$t('common.operate'),
        },
        {type: "line"},
        {
          type: "item",
          title: proxy.$t('common.new'),
          icon: "mdi-link-plus",
          click: ()=>doOpenTunnelEditor()
        },
        {
          type: "item",
          title: proxy.$t('common.edit'),
          icon: "mdi-file-edit-outline",
          //只能同时编辑一个
          disabled: items.length !== 1,
          click: ()=>doOpenTunnelEditor(items[0])
        },
        {
          type: "item",
          title: proxy.$t('common.rename'),
          icon: "mdi-pencil-outline",
          disabled: items.length !== 1,
          click: ()=>doRenameTunnel(items[0])
        },
        {
          type: "item",
          title: '删除',
          icon: "mdi-close",
          disabled: items.length === 0,
          click: ()=>doDelTunnel(items)
        },
      ],160).catch((err)=>{});
    };


    watch(()=>model.value,()=>{
      validSchema.validate(model.value,{abortEarly:false}).catch((result:ValidationError)=>{
        const errors = <any>{}
        for (const err of result.inner) {
          errors[err.path] = err.message
        }
        validResult.value = errors
      }).then((v)=>{
        hasError.value = !v
        if(v){
          validResult.value = {}
        }
      })
    },{deep:true})

    return {
      privateKeyChoice,
      tunnelEditor,
      show,
      tab,
      editingId,
      validResult,
      hasError,
      tunnels,
      model,
      loading,
      envHeaders,
      tunnelHeaders,
      CharsetList,
      AuthTypes,
      changedPassword,
      doSave,
      doTest,
      close,
      openEdit,
      openCreate,
      doDelTunnel,
      doDelEnv,
      doOpenTunnelEditor,
      doChoicePrivateKey,
      doChoiceJumpServerPrivateKey,
      onTunnelContextMenuItem,
      onEnvContextMenuItem
    }
  }
}
</script>

<style scoped>

</style>