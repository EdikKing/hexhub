<template>
  <v-chip size="x-small" :color="color" class="chip" :style="{'maxWidth':maxWidth===null?'unset':maxWidth}" v-tooltip="modelValue">
    <v-icon icon="mdi-content-copy" class="pa-2 ml-1" size="x-small" v-if="copyable" :color="color" @click="copy" v-ripple>

    </v-icon>
    {{modelValue}}
  </v-chip>
</template>

<script>
import * as clipboard from "clipboard-polyfill";

export default {
  name: "LongTextChip",
  props: {
    copyable: {
      type: Boolean,
      default: true
    },
    color: {
      type: String
    },
    modelValue: {
      type: String,
      default: ""
    },
    maxWidth: {
      type: String,
      default: null
    }
  },
  data: ()=>{
    return {}
  },
  methods: {
    copy: function (){
      if(this.copyable){
        clipboard.writeText(this.value).then(()=>{
          this.$success(this.$t('common.copy-success'))
        }).catch(err=>{
          console.log(err)
          this.$error(this.$t('common.copy-failed'))
        });
      }
    }
  }
}
</script>

<style scoped lang="scss">
  .chip{
    padding: 10px 8px 10px 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
