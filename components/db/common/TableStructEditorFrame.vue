<template>
  <div class="table-struct-editor">
    <div class="tooltip-area">
      <v-btn variant="text" size="small" density="comfortable" prepend-icon="mdi-content-save-check-outline" color="primary">{{$t('common.apply')}}</v-btn>
      <v-divider length="25" vertical inset class="ml-1 mr-1"></v-divider>
      <slot name="tooltip"></slot>
    </div>
    <div class="tabs-area">
      <v-btn-toggle color="primary" v-model="tabIdx" density="compact" mandatory>
        <v-btn variant="text" size="x-small" v-for="tab in tabs">{{tab}}</v-btn>
      </v-btn-toggle>
    </div>
    <div class="content-area">
      <slot name="content" :tabIdx="tabIdx"></slot>
    </div>
    <div class="tips-area">
      {{tips}}
    </div>

  </div>
</template>

<script lang="ts">
import {PropType} from "nuxt/dist/app/compat/capi";
import {ref, nextTick,shallowRef, watch, getCurrentInstance} from "vue";
import TableStructFieldEditor from "~/components/db/common/TableStructFieldEditor.vue";


export default {
  name: "TableStructEditorFrame",
  components: {TableStructFieldEditor},
  props: {
    tabs: {
      type: Array as PropType<String[]>,
      default: []
      // default: ["字段","索引","外键","触发器","高级","Sql预览"]
    },
    tips: {
      type: String,
    }
  },
  emits: [],
  setup(props, ctx) {
    const tabIdx = ref(0)
    const tips = ref(props.tips)
    watch(()=>props.tips,(t)=>{
      tips.value = t
    })
    return {tabIdx,tips}
  }
}
</script>

<style lang="scss" scoped>
  .table-struct-editor{
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    .tooltip-area{
      flex: 0 0 30px;
      padding: 0 15px;
      display: flex;
      align-items: center;
    }
    .tabs-area{
      //border-bottom: #e0e0e0 solid 0.5px;
      border-top: #e0e0e0 solid 0.5px;
      flex: 0 0 30px;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      .v-btn-group{
        height: 22px;
      }
    }
    .content-area{
      flex: 1 1;
    }
    .tips-area{
      border-top: #e0e0e0 solid 0.5px;
      width: 100%;
      text-align: center;
      flex: 0 0 20px;
      line-height: 20px;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
</style>