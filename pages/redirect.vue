<template>

</template>

<script>
import {useRoute} from "vue-router";

export default {
  name: "redirect",
  setup(){
    if(process.client){
        window.resizeTo(1200,800)
        window.location.href = "/ssh"
    }
  }
}
</script>

<style scoped>

</style>