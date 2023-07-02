<template>
  <movable-dividers ref="aa"></movable-dividers>
</template>

<script>
import MovableDividers from "../../components/common/MovableDividers";
export default {
  name: "test",
  components: {MovableDividers},
  mounted() {
    console.log("ttt",this)
    console.log("aaaa",this.$refs.aa)

  }
}
</script>

<style scoped>

</style>