<template>
  <v-dialog
    :model-value="data.length > 0"
    persistent
    v-on:keydown.esc.stop="cancel"
    max-width="350">
    <v-card v-if="data.length > 0" v-drag="'.v-overlay__content'">
      <v-card-title class="headline">{{data[0].title}}</v-card-title>
      <v-card-text style="cursor: auto">
        {{data[0].body}}
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          ref="cancelBtn"
          color="warning"
          text
          @click="cancel"
        >
          {{$t('common.cancel')}}
        </v-btn>

        <v-btn
          color="primary"
          text
          @click="sure"
        >
          {{$t('common.sure')}}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import lodash from "lodash";
import {getCurrentInstance, reactive, ref} from "vue";

export default {
  name: "Prompt",
  props: {
    observer: {
      type: Function,
    },
  },
  setup(props) {
    const cancelBtn = ref()
    const data = ref<Array<{
      title:string,
      body:string,
      promiseExecutor:{resolve:(any)=>void, reject:(any)=>void}
    }>>([])

    const open = (title: string, body?:string):Promise<void> => {
      const promise = new Promise<void>((resolve, reject) => {
        data.value.push({
          title,
          body,
          promiseExecutor: {resolve,reject}
        })

      })
      lodash.delay(()=>{
        cancelBtn.value.$el.focus()
      },350)
      return promise
    }

    const cancel = () => {
      const shift = data.value.shift()
      if(shift){
        shift.promiseExecutor.reject("cancel")
      }
    }

    const sure = () => {
      const shift = data.value.shift()
      if(shift){
        shift.promiseExecutor.resolve("")
      }
    }

    const result = {open,cancel,sure,data,cancelBtn}
    props?.observer(result)
    return result
  }
}

</script>

<style lang="scss">


</style>
