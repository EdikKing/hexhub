<template>
  <div class="index-field-container">
    <draggable
        class="top-area"
        v-model="value"
        tag="div"
        handle=".movable-btn"
        :animation="200"
        :component-data="{
              tag: 'div',
              type: 'transition-group',
              name: 'fade'
            }"
        :item-key="key => key"
        @end="onDragend">
      <template #item="{ element: item }">
        <div class="field-tag">
          <v-btn class="movable-btn ml-1" icon="mdi-cursor-move" variant="text" size="x-small" density="comfortable"></v-btn>

          <small-auto-complete class="ml-1" v-model="item.name" :items="getItems(item.name)"></small-auto-complete>

          <v-btn class="order-type-btn" v-on:click="swiftOrderType(item)" variant="text" size="small" density="compact" :color="item.orderType === 'ASC' ?'info':'warning'">
            {{item.orderType?item.orderType:'NONE'}}
          </v-btn>

          <v-btn color="error" v-on:click="del(item)" size="small" variant="text" density="compact" icon="mdi-close"></v-btn>
        </div>
      </template>
      <template #footer>
        <div class="empty" v-if="value.length === 0" >
          <dark-cloud-ani font-size="20px" style="transform: scale(0.6) translateY(-30px);" model-value="暂无数据"></dark-cloud-ani>
        </div>
      </template>
    </draggable>
    <div class="bottom-area">
      <v-btn
          prepend-icon="mdi-plus-thick"
          size="small"
          density="comfortable"
          variant="text"
          :disabled="value.length >= fields.length"
          v-on:click="add"
      >{{ $t("common.add") }}</v-btn>
      <v-btn
          prepend-icon="mdi-check-bold"
          size="small"
          density="comfortable"
          variant="text"
          :disabled="!hasChange"
          v-on:click="apply"
      >{{ $t("common.apply") }}</v-btn>
    </div>
  </div>
</template>

<script lang="ts">
import draggable from "vuedraggable";
import {PropType} from "#app/compat/capi";
import {nextTick, onMounted, onUnmounted, reactive, ref, shallowRef, toRefs, watch} from "vue";
import DarkCloudAni from "~/components/animation/DarkCloudAni.vue";
import SelectPopup from "~/components/common/SelectPopup.vue";
import SimpleInput from "~/components/common/SimpleInput.vue";
import SmallAutoComplete from "~/components/common/SmallAutoComplete.vue";
import {TableIndexField} from "~/components/db/mysql/MysqlTableStructEditor.vue";
import {TableField} from "~/components/db/mysql/MysqlDataTable.vue";
import lodash from "lodash";


interface Field {
  name: string
}

interface FieldSort {
  orderType:string
  name:string
}

export {Field,FieldSort}

export default {
  name: "MysqlTableIndexFieldEditor",
  props:{
    fields: {
      type: Array as PropType<TableField[]>,
      default: [],
    },
    modelValue: {
      type: Array as PropType<TableIndexField[]>,
      default: []
    },
  },
  components:{SmallAutoComplete, SimpleInput, SelectPopup, DarkCloudAni, draggable},
  emits: ["update:modelValue"],
  setup(props,ctx) {
    const value = ref(lodash.clone(props.modelValue))
    const fields = ref(props.fields)
    const hasChange = ref(false)

    watch(()=>props.fields,()=>{
      fields.value = props.fields
    })
    const apply = ()=>{
      ctx.emit("update:modelValue",value.value)
      hasChange.value = false
    }

    const getItems = (name)=>{
      return fields.value.filter((field)=>{
        return field.name === name || !value.value.some((item)=>item.name === field.name)
      }).map((filed)=>filed.name)
    }

    const onDragend = ()=>{
      hasChange.value = true
    }

    const swiftOrderType = (item:FieldSort)=>{
      if(!item.orderType){
        item.orderType = "ASC"
      }else if(item.orderType === "ASC"){
        item.orderType = "DESC"
      }else{
        item.orderType = null
      }
      hasChange.value = true
    }

    const del = (item:FieldSort)=>{
      const idx = value.value.indexOf(item)
      if(idx!==-1){
        value.value.splice(idx,1)
        hasChange.value = true
      }
    }

    const add = ()=>{
      //查询首个未被添加的字段进去
      const firstCanAddItem = fields.value.find((field)=>{
        return !value.value.some((item)=>item.name === field.name)
      })
      if(firstCanAddItem!=null){
        value.value.push({
          name: firstCanAddItem.name,
          orderType: "ASC"
        })
        hasChange.value = true
      }
    }

    return {value,fields,hasChange,getItems,swiftOrderType,del,apply,add,onDragend}
  }
}
</script>

<style lang="scss">
.index-field-container{
  margin: 10px;
  display: flex;
  flex-direction: column;
  width: 220px;
  .top-area{
    overflow-y: auto;
    height: 250px;
    .empty{
      display: flex;
      height: 100%;
      width: 100%;
      justify-content: center;
      align-items: center;
      user-select: none;
    }
    .field-tag{
      height: 30px;
      flex: 0 0;
      margin-bottom: 5px;
      border: 0.5px solid #cdcdcd;
      border-radius: 4px;
      display: flex;
      align-items: center;
      input{
        font-size: 12px;
        width: 105px;
      }
      .movable-btn{
        cursor: move;
      }
      .order-type-btn{
        padding: 0 3px;
        margin: 0;
        min-width: 40px;
      }
    }
  }
  .bottom-area{
    border-top: 0.5px solid #cdcdcd;
    flex: 0 0 30px;
    padding: 5px 0;
    display: flex;
  }
}
</style>