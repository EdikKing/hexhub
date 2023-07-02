<template>
  <v-dialog
    v-model="data.show"
    persistent
    @click:outside="focus"
    max-width="350">
    <v-card v-drag="'.v-overlay__content'">
      <v-card-title>{{data.title}}</v-card-title>
      <v-card-text>
        <div>
          <v-textarea
              v-if="data.multiline"
              variant="outlined"
              density="compact"
              class="prompt-textarea"
              ref="promptTextarea"
              v-model="data.input">
          </v-textarea>
          <v-text-field
              v-else
              v-on:keydown.enter="sure"
              :autofocus="true"
              variant="outlined"
              density="compact"
              clearable
              ref="promptInput"
              v-model="data.input">
          </v-text-field>
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
          :disabled="data.input ==='' || data.input == null"
          @click="sure"
        >
          {{$t('common.sure')}}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {reactive,ref} from "vue";
import {VTextField} from "vuetify/components";
import {VTextarea} from "vuetify/components";
import lodash from "lodash";

export default {
  name: "Prompt",
  props:{
    observer: {
      type: Function,
    },
  },
  setup(props){
    let promiseExecutor = null
    const data = reactive(new (class {
      multiline: boolean = false;
      show: boolean = false;
      input:number|string= "";
      title:string="";
    }))

    const promptInput = ref<InstanceType<typeof VTextField>>();
    const promptTextarea = ref<InstanceType<typeof VTextarea>>();

    const focus = ()=>{
      if(promptInput.value){
        (<HTMLElement>promptInput.value.$el).querySelector("input")?.focus()
      }else if(promptTextarea.value){
        (<HTMLElement>promptTextarea.value.$el).querySelector("textarea")?.focus()
      }
    }

    const open= (title:string,value:string|number,multiline=false):Promise<number|string>=>{
      if(promiseExecutor != null){
        promiseExecutor.reject(new Error("cancel"))
        promiseExecutor = null
      }
      const promise = new Promise<number|string>((resolve, reject)=>{
        promiseExecutor = {
          resolve,reject
        }
      })
      data.multiline = multiline
      data.title = title
      data.input = value
      data.show = true
      lodash.delay(focus,250)
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
      if(!data.input){
        return
      }
      data.show = false
      if(promiseExecutor != null){
        promiseExecutor.resolve(data.input)
        promiseExecutor = null
        data.input = ""
      }
    };

    const result = {data,promptInput,promptTextarea,open,cancel,sure,focus}
    props?.observer(result)
    return result
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
