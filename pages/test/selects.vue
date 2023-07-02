<template>
  <div style="width: 50vw;margin-left: 10vw;margin-top: 10vh">
    <SelectPopup selector=".v-btn" :items="items"  v-model="v1" :value-key="(item)=>item.value" icon-key="icon" :label-key="item => item.label" :children-key="item => item.items" :disabled-key="item => item.disabled">
      <template #default="{value}">
        <span>{{v1}}-{{value}}</span>
        <div>
          <v-btn icon="mdi-plus"></v-btn>
        </div>
      </template>
    </SelectPopup>

    <SelectPopup selector=".v-btn" :multiple="true" :items="items"  v-model="v2" :value-key="(item)=>item.value" icon-key="icon" :label-key="item => item.label" :children-key="item => item.items" :disabled-key="item => item.disabled">
      <template #default="{value}">
        <span>{{v2}}-{{value}}</span>
        <div>
          <v-btn icon="mdi-plus"></v-btn>
        </div>
      </template>
    </SelectPopup>

    <SelectPopup selector=".v-btn" :items="item2"  v-model="v3">
      <template #default="{value}">
        <span>{{v3}}-{{value}}</span>
        <div>
          <v-btn icon="mdi-plus"></v-btn>
        </div>
      </template>
    </SelectPopup>

    <SelectPopup selector=".v-btn" :multiple="true" :items="item2"  v-model="v4">
      <template #default="{value}">
        <span>{{v4}}-{{value}}</span>
        <div>
          <v-btn icon="mdi-plus"></v-btn>
        </div>
      </template>
    </SelectPopup>
  </div>
</template>

<script lang="ts">
import {ref} from "vue";
import SelectPopup from "../../components/common/SelectPopup.vue";

export default {
  name: "selects",
  components: {SelectPopup},
  setup(){
    const items = ref([        {label:"算法简化发",icon:"mdi-airplane-plus",value:0},
      {label:"但是跟发几个",icon:"mdi-airplane-plus",value:1,disabled:true},
      {label:"欧欧飞",icon:"mdi-airplane-plus",value:2},
      {
        label: "test",
        expandable: true,
        items: [
          {label:"aaaa",icon:"mdi-alarm-plus",value:3},
          {label:"bbbb",icon:"mdi-airplane-plus",value:4,disabled:true},
          {label:"cccc",icon:"mdi-airplane-plus",value:5},
          {label:"dddd",icon:"mdi-airplane-plus",value:6},
        ]
      },
      {
        label: "test",
        items: [
          {label:"aaaa",icon:"mdi-alarm-plus",value:7,disabled:true},
          {label:"bbbb",icon:"mdi-airplane-plus",value:8},
          {label:"cccc",icon:"mdi-airplane-plus",value:9},
          {label:"dddd",icon:"mdi-airplane-plus",value:10},
        ]
      },])

    const item2 = ref(['a','b','c','d','e','f','g'])

    const v1 = ref(0)
    const v2 = ref([0,1])
    const v3 = ref('g')
    const v4 = ref(['a','g'])

    return {items,item2,v1,v2,v3,v4}
  }
}
</script>

<style scoped>

</style>