<template>
  <div class="sort-container" :style="{'height': height}">
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
        <div class="sort-tag">
          <v-btn class="movable-btn ml-1" icon="mdi-cursor-move" variant="text" size="x-small" density="comfortable"></v-btn>

          <small-checkbox color="primary" :model-value="item.check" @update:modelValue="swiftCheck(item)"></small-checkbox>

          <small-auto-complete class="ml-1" v-model="item.name" :items="getItems(item.name)"></small-auto-complete>

          <v-btn class="order-type-btn" v-on:click="swiftAsc(item)" variant="text" size="small" density="compact" :color="item.isAsc?'info':'warning'">
            {{item.isAsc?'ASC':'DESC'}}
          </v-btn>

          <v-btn class="mr-1" color="error" v-on:click="del(item)" icon="mdi-close" size="small" variant="text" density="compact"></v-btn>
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
import SmallCheckbox from "~/components/common/SmallCheckbox.vue";
import SelectPopup from "~/components/common/SelectPopup.vue";
import SimpleInput from "~/components/common/SimpleInput.vue";
import SmallAutoComplete from "~/components/common/SmallAutoComplete.vue";

interface Field {
  name: string
}

interface FieldSort {
  isAsc:boolean
  check:boolean
  name:string
}

export {Field,FieldSort}

export default {
  name: "TableSortBar",
  props:{
    height: {
      type: String,
      default: "100%"
    },
    sorts: {
      type: Object as PropType<Map<string,boolean>>,
      default: null,
    },
    modelValue: {
      type: Array as PropType<FieldSort[]>,
      default: [],
    },
    fields: {
      type: Array as PropType<Array<Field>>,
      default: []
    }
  },
  components:{SmallAutoComplete, SimpleInput, SelectPopup, SmallCheckbox, DarkCloudAni, draggable},
  emits: ["update:modelValue","apply"],
  setup(props,ctx) {
    const sorts = ref(props.sorts)
    const value = ref(props.modelValue)
    const fields = ref(props.fields)
    const hasChange = ref(false)

    watch(()=>props.fields,()=>{
      fields.value = props.fields
    })

    watch(()=>props.sorts,(sorts)=>{
      if(hasChange.value){
        hasChange.value = false
        return;
      }
      if(sorts===null || sorts.size === 0){
        return
      }
      //外部排序状态发生改变,更新内部排序状态,有则替换,无则增加,不删除未勾选的
      const copySorts = new Map(sorts)
      const newValue = value.value.filter((item)=>{
        const status = sorts.get(item.name)
        if(status!==undefined){
          copySorts.delete(item.name)
          item.isAsc = status
          item.check = true
          return true
        }else{
          return !item.check
        }
      })
      copySorts.forEach((v,k)=>{
        newValue.push({
          isAsc: v,
          name: k,
          check: true
        })
      })
      value.value = newValue
      ctx.emit("update:modelValue",value.value)
      ctx.emit("apply")
    }, {deep: true,immediate:true})

    const apply = ()=>{
      sorts.value.clear()
      value.value.forEach((item)=>{
        if(item.check){
          sorts.value.set(item.name,item.isAsc)
        }
      })
      ctx.emit("update:modelValue",value.value)
      ctx.emit("apply")
    }

    const getItems = (name)=>{
      return fields.value.filter((field)=>{
        return field.name === name || !value.value.some((item)=>item.name === field.name)
      }).map((filed)=>filed.name)
    }

    const onDragend = ()=>{
      hasChange.value = true
    }

    const swiftCheck = (item:FieldSort)=>{
      item.check = !item.check
      hasChange.value = true
    }

    const swiftAsc = (item:FieldSort)=>{
      item.isAsc = !item.isAsc
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
          check: true,
          isAsc: true
        })
        hasChange.value = true
      }
    }

    return {sorts,value,fields,hasChange,getItems,swiftAsc,swiftCheck,del,apply,add,onDragend}
  }
}
</script>

<style lang="scss">
.sort-container{
  padding: 10px 10px 0 10px;
  display: flex;
  flex-direction: column;
  .top-area{
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1 1;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-content: flex-start;
    cursor: move;
    .empty{
      display: flex;
      height: 100%;
      width: 100%;
      justify-content: center;
      align-items: center;
      user-select: none;
    }
    .sort-tag{
      flex: 0 0;
      margin-bottom: 5px;
      border: 0.5px solid #cdcdcd;
      border-radius: 4px;
      margin-right: 7px;
      display: flex;
      align-items: center;
      .movable-btn{
        cursor: move;
      }
      input{
        font-size: 12px;
        width: 75px;
      }
      .order-type-btn{
        padding: 0 3px;
        margin: 0;
        min-width: 35px;
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