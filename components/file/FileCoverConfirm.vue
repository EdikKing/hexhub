<template>
  <div>
    <v-dialog
      :model-value="list.length > 0"
      max-width="400"
      :open-on-focus="false"
      persistent
    >
      <v-card v-if="list.length > 0" v-drag="'.v-overlay__content'">
        <v-card-title>
          {{$t('file.existed')}}
        </v-card-title>

        <v-card-text>
          {{$t('file.cover-tips',{file:list[0].file})}}

        </v-card-text>

        <v-card-actions>
          <v-switch class="ml-4" color="primary" v-model="list[0].allApply" density="compact" :label="$t('common.all-apply')"></v-switch>

          <v-spacer></v-spacer>

          <v-btn
            color="warning"
            text
            @click="skip"
          >
            {{$t("common.skip")}}
          </v-btn>

          <v-btn
            color="error"
            text
            @click="cover"
          >
            {{$t("common.cover")}}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import {ref} from "vue";

export default {
  name: "FileCoverConfirm",
  props: {
    observer: {
      type: Function,
    },
  },
  setup(props) {
    const list = ref([])

    const open = (file)=>{
      return new Promise((resolve,reject)=>{
        list.value.push({
          allApply: false,
          file: file,
          resolve: resolve,
          reject: reject
        })
      })
    }
    const cover = ()=>{
      const item = remove()
      item.resolve(item)
    };
    const skip =  ()=>{
      const item = remove()
      item.reject(item)
    };
    const remove = ()=>{
      return list.value.shift()
    }

    const result = {
      list,open,cover,skip,remove
    }
    props?.observer(result)
    return result
  }
}

</script>

<style lang="scss">
.v-label{
  font-size: 14px!important;
}
</style>
