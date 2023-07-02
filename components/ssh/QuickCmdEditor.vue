<template>
  <v-dialog
    v-model="data.show"
    max-width="350">
    <v-card v-drag="'.v-overlay__content'">
      <v-card-title>快捷命令编辑</v-card-title>
      <v-card-text>
        <div>
          <v-text-field
              v-on:keydown.enter="sure"
              label="快捷命令名称"
              variant="outlined"
              density="compact"
              clearable
              ref="nameRef"
              v-model="data.name">
          </v-text-field>
          <v-textarea
              variant="outlined"
              density="compact"
              label="快捷命令"
              class="prompt-textarea"
              ref="cmdRef"
              v-model="data.cmd">
          </v-textarea>
          <v-checkbox
              :disabled="!data.sshId"
              variant="outlined"
              density="compact"
              class="prompt-textarea"
              ref="bindSshRef"
              label="仅作用于当前连接"
              v-model="data.bindSsh">
          </v-checkbox>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="warning"
          text
          @click="cancel"
        >
          {{$t('common.cancel')}}
        </v-btn>

        <v-btn
          color="primary"
          text
          :disabled="!data.name || !data.cmd "
          @click="sure"
        >
          {{$t('common.sure')}}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {reactive, ref} from "vue";
import {VSwitch, VTextarea, VTextField} from "vuetify/components";
import lodash from "lodash";
import AssetConfigService from "~/db/service/asset-config-service";
import {AssetConfData, AssetType} from "~/db/model/asset-conf-model";

export default {
  name: "QuickCmdEditor",
  props:{},
  setup(props,ctx){
    let service = AssetConfigService.getInstance();
    let promiseExecutor = null
    const data = reactive(new (class {
      id: string = null;
      show:boolean=false;
      name:string="";
      cmd:string="";
      sshId:string=null;
      bindSsh:boolean=false;
    }))

    const nameRef = ref<InstanceType<typeof VTextField>>();
    const cmdRef = ref<InstanceType<typeof VTextarea>>();
    const bindSshRef = ref<InstanceType<typeof VSwitch>>();

    const focus = ()=>{
      if(nameRef.value){
        (<HTMLElement>nameRef.value.$el).querySelector("input")?.focus()
      }
    }
    const openCreator= (sshId:string):Promise<void>=>{
      if(promiseExecutor != null){
        promiseExecutor.reject(new Error("cancel"))
        promiseExecutor = null
      }
      const promise = new Promise<void>((resolve, reject)=>{
        promiseExecutor = {
          resolve,reject
        }
      })
      data.id = null
      data.sshId = sshId;
      data.show = true
      lodash.delay(()=>{
        focus()
      },350);
      return promise
    };
    const openEditor= async (sshId: string, id: string): Promise<void> => {
      if (promiseExecutor != null) {
        promiseExecutor.reject(new Error("cancel"))
        promiseExecutor = null
      }
      const promise = new Promise<void>((resolve, reject) => {
        promiseExecutor = {
          resolve, reject
        }
      })
      const item = await service.find(id);
      data.id = id
      data.sshId = sshId;
      data.show = true
      data.cmd = item.description
      data.name = item.name
      data.bindSsh = !!item.dirPath
      lodash.delay(() => {
        focus()
      }, 350);
      return promise
    };
    const cancel= ()=>{
      data.show = false
      if(promiseExecutor != null){
        promiseExecutor.reject(new Error("cancel"))
        promiseExecutor = null
      }
    };
    const sure= ()=>{
      data.show = false
      const form = <AssetConfData>{
        name: data.name,
        description: data.cmd,
      }
      let promise = data.id ? service.update(data.id,form) : service.add(AssetType.QuickCmd, form,data.bindSsh?data.sshId:"");
      promise.then(result=>{
        if(promiseExecutor != null){
          promiseExecutor.resolve(null);
          promiseExecutor = null
        }
      }).catch(e=>{
        if(promiseExecutor != null){
          promiseExecutor.reject(e)
          promiseExecutor = null
        }
      });

    };

    return {data,nameRef,cmdRef,bindSshRef,openEditor,openCreator,cancel,sure,focus}
  }
}

</script>

<style lang="scss">
.prompt-textarea{
  textarea{
    padding: 5px;
    white-space: pre;
    overflow-wrap: normal;
    overflow-x: scroll;
    font-size: 12px;
  }
}
</style>
