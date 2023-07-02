<template>
  <v-dialog v-model="show" persistent width="500px">
    <v-card class="pa-5" v-drag="'.v-overlay__content'">
      <v-card-title>SSH隧道编辑</v-card-title>

      <div style="max-height: 70vh;padding: 5px;overflow-y: auto;overflow-x: hidden">
        <v-row justify="center" no-gutters>
          <v-btn-toggle
              style="height: 25px"
              mandatory
              color="primary"
              v-model="model.type"
          >
            <v-btn density="compact" :value="TunnelTypes.TcpLocal" size="small">本地</v-btn>
            <v-btn density="compact" :value="TunnelTypes.TcpRemote" size="small">远程</v-btn>
            <v-btn density="compact" :value="TunnelTypes.Socks5Local" size="small">本地SOCKS5</v-btn>
            <v-btn density="compact" :value="TunnelTypes.Socks5Remote" size="small">远程SOCKS5</v-btn>
          </v-btn-toggle>
        </v-row>

        <v-divider class="mt-2 mb-2"></v-divider>

        <v-timeline direction="horizontal" density="comfortable" truncate-line="end" side="start">
          <v-timeline-item dot-color="success" icon="mdi-earth-arrow-right" icon-color="background">
            <template v-slot:opposite>
              <template v-if="model.type === TunnelTypes.TcpLocal || model.type === TunnelTypes.TcpRemote">
                单个TCP端口流量
              </template>
              <template v-else-if="model.type === TunnelTypes.Socks5Local || model.type === TunnelTypes.Socks5Remote">
                所有TCP端口流量
              </template>
            </template>
          </v-timeline-item>
          <v-timeline-item dot-color="warning" icon="mdi-share-outline" icon-color="background">
            <template v-slot:opposite>
              <template v-if="model.type === TunnelTypes.TcpLocal || model.type === TunnelTypes.Socks5Local">
                本地(绑定)TCP端口
              </template>
              <template v-else-if="model.type === TunnelTypes.TcpRemote || model.type === TunnelTypes.Socks5Remote">
                远程TCP端口
              </template>
            </template>
          </v-timeline-item>
          <v-timeline-item dot-color="primary" icon="mdi-desktop-classic" icon-color="background">
            <template v-slot:opposite>
              <template v-if="model.type === TunnelTypes.TcpLocal || model.type === TunnelTypes.Socks5Local">
                远程TCP端口
              </template>
              <template v-else-if="model.type === TunnelTypes.TcpRemote || model.type === TunnelTypes.Socks5Remote">
                本地(绑定)TCP端口
              </template>
            </template>
          </v-timeline-item>
        </v-timeline>

        <v-divider class="mt-3 mb-3"></v-divider>

        <div class="socks5-wrapper" v-if="model.type === TunnelTypes.Socks5Local || model.type === TunnelTypes.Socks5Remote">
          <div class="header">
            <span class="title">
              SOCKS5-代理使用帮助
            </span>
            <div class="links">
              <a href="https://microsoftedge.microsoft.com/addons/detail/proxy-switchyomega/fdbloeknjpnloaggplaobopplkdhnikc">Edge-SOCKS5插件</a>
              <a href="https://chrome.google.com/webstore/detail/proxy-switchyomega/padekgcemlokbadohgkifijomclgjgif">Chrome-SOCKS5插件</a>
            </div>
          </div>

          <v-expansion-panels>
            <v-expansion-panel
                title="SOCKS5快捷命令"
            >
              <v-expansion-panel-text class="cmd">
                <p class="highlight">Windows CMD:</p>
                <p>set http_proxy=socks5://{{model.bindIp}}:{{model.bindPort}}</p>
                <p>set https_proxy=socks5://{{model.bindIp}}:{{model.bindPort}}</p>
                <p class="highlight">Mac & Liunx Shell:</p>
                <p>export http_proxy="socks5://{{model.bindIp}}:{{model.bindPort}}"</p>
                <p>export https_proxy="socks5://{{model.bindIp}}:{{model.bindPort}}"</p>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <v-divider class="mt-3 mb-5"></v-divider>
        </div>

        <v-text-field class="mb-3" v-model="model.name" :error-messages="validResult.name" persistent-placeholder density="compact" label="名称" variant="filled"></v-text-field>

        <v-row>
          <v-col class="pt-0 pb-0">
            <v-text-field v-model="model.bindIp" :error-messages="validResult.bindIp" persistent-placeholder density="compact" label="绑定IP" variant="filled"></v-text-field>
          </v-col>
          <v-col class="pt-0 pb-0">
            <v-text-field v-model="model.bindPort" :error-messages="validResult.bindPort" persistent-placeholder density="compact" label="绑定端口" variant="filled"></v-text-field>
          </v-col>
        </v-row>

        <v-row v-if="model.type === TunnelTypes.TcpLocal || model.type === TunnelTypes.TcpRemote">
          <v-col class="pt-0 pb-0">
            <v-text-field v-model="model.srcIp" :error-messages="validResult.srcIp" persistent-placeholder density="compact" label="目标IP" variant="filled"></v-text-field>
          </v-col>
          <v-col class="pt-0 pb-0">
            <v-text-field v-model="model.srcPort" :error-messages="validResult.srcPort" persistent-placeholder density="compact" label="目标端口" variant="filled"></v-text-field>
          </v-col>
        </v-row>
      </div>

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
            color="primary"
            density="comfortable"
            variant="text"
            :disabled="hasError"
            v-on:click="submit"
        >
          保存
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {getCurrentInstance, ref, watch} from "vue";
import LongTextChip from "~/components/common/LongTextChip.vue";
import {SshTunnelModel, TunnelTypes} from "~/db/model/ssh-conf-model";
import {boolean, lazy, number, object, string, ValidationError} from "yup";
import lodash from "lodash";

export default {
  name: "SshTunnelEditor",
  components: {LongTextChip},
  setup(props,ctx){
    const show = ref(false)
    const model = ref(new SshTunnelModel())
    const validResult = ref({})
    const hasError = ref(false)
    let promiseExecutor = <{resolve:(SshTunnelModel)=>void, reject:(any)=>void}>null;

    const validSchema = object({
      name: string().required(),
      bindIp: string().required().matches(/^((25[0-5]|2[0-4]\d|((1\d{2})|([1-9]?\d)))\.){3}(25[0-5]|2[0-4]\d|((1\d{2})|([1-9]?\d)))$/),
      bindPort: number().min(0).max(65535).required().integer(),
      srcIp: lazy(()=>{
        if(model.value.type === TunnelTypes.TcpRemote || model.value.type === TunnelTypes.TcpLocal){
          return string().required().matches(/^((25[0-5]|2[0-4]\d|((1\d{2})|([1-9]?\d)))\.){3}(25[0-5]|2[0-4]\d|((1\d{2})|([1-9]?\d)))$/)
        }
        return string()
      }),
      srcPort: lazy(()=>{
        if(model.value.type === TunnelTypes.TcpRemote || model.value.type === TunnelTypes.TcpLocal){
          return number().min(0).max(65535).required().integer()
        }
        return string()
      }),
    })

    watch(()=>model,()=>{
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
    },{deep:true,immediate:true})

    const close = ()=>{
      show.value = false
      if(promiseExecutor){
        promiseExecutor.reject("cancel")
        promiseExecutor = null
      }
    }

    const submit = ()=>{
      if(promiseExecutor){
        promiseExecutor.resolve(model.value)
        promiseExecutor = null
      }
      close()
    }


    const open = (tunnel?:SshTunnelModel):Promise<SshTunnelModel>=>{
      if(!tunnel){
        tunnel = new SshTunnelModel()
      }else{
        //编辑时点击保存才能生效，所以需要克隆一份对象，防止不点保存也修改了源数据
        tunnel = lodash.clone(tunnel)
      }
      model.value = tunnel
      show.value = true
      return new Promise<SshTunnelModel>((resolve, reject)=>{
        promiseExecutor = {resolve,reject}
      })
    }

    return {
      show,
      model,
      validResult,
      hasError,
      TunnelTypes,
      close,
      submit,
      open,
    }
  }
}
</script>

<style lang="scss" scoped>
  .socks5-wrapper{
    cursor: text;
    .header{
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      margin: 12px 0;
      .title{
        letter-spacing: 1px;
      }
      .links{
        a{
          text-decoration: none;
          &:first-child{
            margin-right: 5px;
          }
          &:last-child{
            margin-left: 5px;
          }
        }
      }
    }
    .cmd{
      margin: 0;
      padding: 5px;
      font-size: 12px;
      .highlight{
        letter-spacing: 1px;
        font-weight: bold;
      }
    }
  }
</style>