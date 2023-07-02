<template>
  <v-snackbar v-model="data.show" top :timeout="data.timeout">
    <v-icon :color="theme.current.value.colors[data.type]" class="pr-5 pl-2">{{data.icon}}</v-icon>
    <span :style="{color:theme.current.value.colors[data.type],fontSize:'16px'}">{{ data.msg }}</span>

    <template v-slot:actions>
      <v-btn
          color="error"
          variant="text"
          icon="mdi-close"
          @click="data.show = false">
      </v-btn>
    </template>
  </v-snackbar>

</template>

<script lang="ts">
import { useTheme } from 'vuetify'
import {reactive} from "vue";

export default {
  name: "Toast",
  props:{
    observer: {
      type: Function,
    },
  },
  setup(props){
    const theme = useTheme()

    const data = reactive({
      icon: "mdi-information",
      msg: "",
      type: "info",
      show: false,
      closeable: false,
      timeout: 0,
    })
    const open = (msg,type,icon,timeout)=>{
      data.msg = msg
      data.type = type
      data.icon = icon
      data.timeout = timeout
      data.show = true
    };

    const result = {theme,data,open}
    props?.observer(result)
    return result
  }
}
</script>

<style scoped>

</style>
