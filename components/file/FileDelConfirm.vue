<template>
  <v-dialog
    v-model="data.show"
    persistent
    v-on:keydown.esc.stop="cancel"
    max-width="350">
    <v-card>
      <v-card-title class="headline">{{data.title}}</v-card-title>

      <v-card-text class="mb-3">
        <span>
          {{data.body}}
        </span>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions>
        <div style="transform: scale(0.9) translateX(7px);">
          <v-checkbox
              v-model="data.quick"
              :disabled="data.disabledQuick"
              density="compact"
              :label="$t('file.quick')"
              color="primary"
              hide-spin-buttons
              hide-details
          ></v-checkbox>
        </div>
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
          color="error"
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
import {reactive, ref} from "vue";
import lodash from "lodash";

export default {
  name: "Prompt",
  props: {

  },
  setup(props) {
    const cancelBtn = ref()
    let promiseExecutor = null
    const data = reactive({
      "show": false,
      "title": "",
      "body": "",
      "quick": false,
      "disabledQuick": false,
    })

    const open = (title: string, body?:string,disabledQuick=false):Promise<boolean> => {
      if (promiseExecutor != null) {
        promiseExecutor.resolve(null)
        promiseExecutor = null
      }
      const promise = new Promise<boolean>((resolve, reject) => {
        promiseExecutor = {
          resolve, reject
        }
      })
      lodash.delay(()=>{
        cancelBtn.value.$el.focus()
      },350)
      data.disabledQuick = disabledQuick
      data.quick = !disabledQuick
      data.title = title
      data.body = body
      data.show = true
      return promise
    }

    const cancel = () => {
      data.show = false
      promiseExecutor?.reject(new Error("cancel"))
      promiseExecutor = null
    }

    const sure = () => {
      data.show = false
      promiseExecutor?.resolve(data.quick)
      promiseExecutor = null
    }

    return {cancelBtn,open,cancel,sure,data}
  }
}

</script>

<style lang="scss">


</style>
