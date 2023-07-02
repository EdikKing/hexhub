<template>
  <v-row class="ma-10 pa-10" >
    <v-btn icon="mdi-chevron-up" density="comfortable" size="x-small" variant="text" :style="{transform: data.a?'rotate(180deg)':''}" @click="data.a = !data.a"></v-btn>
    <v-btn icon="mdi-chevron-down" density="comfortable" size="x-small" variant="text" :style="{transform: data.b?'rotate(180deg)':''}" @click="data.b = !data.b"></v-btn>

    <v-btn density="comfortable" color="info" variant="text" :loading="data.c" @click="data.c = !data.c">TEXT</v-btn>

  </v-row>
</template>

<script lang="ts">

import {ref} from "vue"
export default {
  name: "cc",
  setup(props,ctx){
    const data = ref({a:false,b:false,c:false})
    return {data}
  }
}
</script>

<style scoped>

</style>