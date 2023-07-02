<template>
  <v-dialog v-model="show" persistent width="300px">
    <v-card v-drag="'.v-overlay__content'">
      <v-card-title>
        导入私钥
      </v-card-title>
      <v-card-subtitle>可直接将秘钥文件拖拽进此区域</v-card-subtitle>
      <div class="pa-5 pb-0" v-on:dragenter.stop.prevent v-on:dragover.prevent v-on:drop.stop.prevent="onDropFile">
        <v-text-field
            class="mt-1"
            v-model="model.name"
            :error-messages="validResult.name"
            persistent-placeholder
            density="compact"
            prepend-icon="mdi-card-bulleted-outline"
            label="名称"
            variant="underlined"
        ></v-text-field>

        <v-text-field
            class="mt-1"
            v-on:click="file.click()"
            v-on:keydown.enter="file.click()"
            :model-value="model.filename"
            persistent-placeholder
            density="compact"
            prepend-icon="mdi-attachment"
            readonly
            label="私钥文件"
            variant="underlined"
        ></v-text-field>

        <v-textarea
            class="private-key-textarea"
            :model-value="model.id && !changedPrivateKey ? '' : model.privateKey"
            :placeholder="model.id && !changedPrivateKey ? '*'.repeat(16) : ''"
            :error-messages="validResult.privateKey"
            @update:modelValue="model.privateKey = $event;changedPrivateKey=true"
            density="compact"
            label="秘钥内容"
            variant="underlined"
            prepend-icon="mdi-text-box-edit-outline"
            persistent-placeholder
        ></v-textarea>

        <v-text-field
            class="mt-1"
            :model-value="model.id && !changedPassword ? '' : model.password"
            :placeholder="model.id && !changedPassword ? '*'.repeat((model.password+'').length) : ''"
            :error-messages="saveErrMsg??validResult.password"
            @update:modelValue="model.password = $event;changedPassword=true"
            density="compact"
            prepend-icon="mdi-lock-outline"
            type="password"
            label="密码"
            variant="underlined"
            persistent-placeholder>
        </v-text-field>


      </div>

      <input type="file" ref="file" style="display: none" v-on:change="onChangeFile">

      <v-card-actions>
        <v-btn
            variant="tonal"
            size="small"
            v-if="localPrivateKey"
            v-on:click="importLocalPrivateKey"
        >
          导入本机默认秘钥
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
            color="warning"
            density="comfortable"
            variant="text"
            v-on:click="close"
        >
          取消
        </v-btn>
        <v-btn
            color="primary"
            density="comfortable"
            variant="text"
            :loading="loading"
            :disabled="hasError"
            v-on:click="doSave"
        >
          保存
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import AdvancedTable from "../common/AdvancedTable.vue";
import {SshPrivateKeyKeyModel} from "~/db/model/ssh-conf-model";
import {Toast} from "~/lib/layer";
import {ref, watch} from "vue";
import {object, string, ValidationError} from "yup";
import {ssh} from "~/apis/client/remote-control";
import AssetConfigService from "~/db/service/asset-config-service";
import {AssetType} from "~/db/model/asset-conf-model";

export default {
  name: "SshPrivateKeyEditor",
  components: {AdvancedTable},
  emits: ['refresh'],
  setup(props,ctx){
    const service = AssetConfigService.getInstance()

    const show = ref(false)
    const file = ref<HTMLInputElement>()
    const validResult = ref({})
    const hasError = ref(false)
    const loading = ref(false)
    const model = ref<SshPrivateKeyKeyModel>(null)
    const saveErrMsg = ref(null)
    const localPrivateKey = ref<{privateKey:string,filename:string}>(null)
    const changedPassword = ref(false)
    const changedPrivateKey = ref(false)
    const editingId = ref(null)


    const validSchema = object({
      name: string().required(),
      password: string(),
      privateKey: string().required(),
    })

    const close = ()=>{
      show.value = false
    }

    const onChangeFile = (evt:Event)=>{
      const files = file.value.files
      if(files.length > 0){
        const file = files[0]
        doSelectFile(file)
      }
    }

    const onDropFile = (evt:DragEvent)=>{
      const files = evt.dataTransfer.items
      if(files.length > 0){
        const file = files[0]
        doSelectFile(file.getAsFile())
      }
    }

    const doSelectFile = async (file: File) => {
      if (file.size >= 1024 * 64) {
        Toast.error("秘钥文件过大！")
        return
      }
      const val = model.value
      val.privateKey = await file.text()
      val.filename = file.name
    }

    const importLocalPrivateKey = ()=>{
      const privateKey = localPrivateKey.value
      const val = model.value
      if(privateKey){
        val.privateKey = privateKey.privateKey
        if(!val.name){
          val.name = "default"
        }
        val.filename = privateKey.filename
      }
    }

    const doSave = ()=>{
      loading.value = true
      ssh.checkPrivateKey(model.value.privateKey,model.value.password).then((data)=>{
        saveErrMsg.value = null
        model.value.type = data.type
        const mEditingId = editingId.value
        if(mEditingId){
          service.update(mEditingId,model.value).then(()=>{
            Toast.success("更新成功")
            ctx.emit("refresh")
            show.value = false
          }).catch((e)=>{
            show.value = false
            Toast.error(e.message)
          })
        }else{
          service.add(AssetType.SSHPrivateKey, model.value).then(()=>{
            Toast.success("创建成功")
            ctx.emit("refresh")
            show.value = false
          }).catch((e)=>{
            show.value = false
            Toast.error(e.message)
          })
        }

      }).catch(e=>{
        console.log("err",e)
        saveErrMsg.value = e.message
      }).finally(()=>loading.value = false)
    }

    const openEdit = async (id: string) => {
      editingId.value = id
      changedPassword.value = false
      changedPrivateKey.value = false
      model.value = await service.findData<SshPrivateKeyKeyModel>(id)
      show.value = true
    }

    const openCreate = ()=>{
      editingId.value = null
      changedPassword.value = false
      changedPrivateKey.value = false
      model.value = new SshPrivateKeyKeyModel()
      show.value = true
    }

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

    watch(()=>show.value,async (s) => {
      if (s) {
        localPrivateKey.value = await ssh.getLocalPrivateKey()
      }
    })

    return {
      changedPrivateKey,
      changedPassword,
      saveErrMsg,
      localPrivateKey,
      validResult,
      model,
      hasError,
      loading,
      show,
      file,
      editingId,
      doSave,
      close,
      onChangeFile,
      onDropFile,
      importLocalPrivateKey,
      openEdit,
      openCreate,
    }
  }
}
</script>

<style lang="scss">
  .private-key-textarea{
    textarea{
      white-space: pre;
      overflow-wrap: normal;
      overflow-x: scroll;
      font-size: 12px;
    }
  }
</style>