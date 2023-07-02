<template>
  <div>
    <v-dialog
        :model-value="data.length > 0"
        persistent
        max-width="350">
      <v-card v-if="data.length > 0" v-drag="'.v-overlay__content'">
        <v-card-title class="headline" style="cursor: text">{{data[0].title}}</v-card-title>
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
              @click="fileInput.click()"
          >
            {{$t('common.choose')}}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <input type="file" ref="fileInput" @input="onFileSelected">
  </div>

</template>

<script lang="ts">
import lodash from "lodash";
import {getCurrentInstance, reactive, ref} from "vue";

export default {
  name: "ChooseFile",
  props: {
    observer: {
      type: Function,
    },
  },
  setup(props) {
    const fileInput = ref<HTMLInputElement>()
    const cancelBtn = ref()
    const data = ref<Array<{
      title:string,
      promiseExecutor:{resolve:(File)=>void, reject:(any)=>void}
    }>>([])

    const open = (title: string):Promise<File> => {
      const promise = new Promise<File>((resolve, reject) => {
        data.value.push({
          title,
          promiseExecutor: {resolve,reject}
        })
      })
      fileInput.value.click()
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

    const onFileSelected = (e)=>{
      const files = e.target.files
      if(files.length > 0){
        const shift = data.value.shift()
        if(shift){
          shift.promiseExecutor.resolve(files[0])
        }
      }
      e.target.value = ""
    }

    const result = {open,cancel,onFileSelected,data,fileInput,cancelBtn}
    props?.observer(result)
    return result
  }
}

</script>

<style lang="scss">


</style>
