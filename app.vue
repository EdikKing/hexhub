<template>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
</template>

<script lang="ts">
import {onMounted, onUnmounted} from 'vue'
import {useCurrentTheme} from "~/store/global";
import {useTheme} from "vuetify";
import lodash from "lodash";

export default {
  setup(props,ctx){
    const currentTheme = useCurrentTheme()
    const theme = useTheme()

    const onUpdateTheme = lodash.throttle(()=>{
      let themeMode = currentTheme.mode
      if(themeMode === "auto"){
        themeMode = window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'
      }
      theme.global.name.value = themeMode
    },50)

    onMounted(()=>{
      if(process.client){
        //监听系统主题发生变化
        window.matchMedia('(prefers-color-scheme: dark)')
            .addEventListener('change', event => {
              onUpdateTheme()
            })
        onUpdateTheme()
        currentTheme.$subscribe(onUpdateTheme)
      }
    })

    onUnmounted(()=>{
    })
  }
}

</script>

<style></style>