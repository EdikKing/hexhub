<template>
  <v-app>
    <v-main>
      <slot />
    </v-main>
    <div id="top-layer"></div>
  </v-app>
</template>

<script lang="ts">

export default {
  name: "default",
}
</script>

<style scoped>

</style>