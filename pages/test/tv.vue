<template>
  <div style="width: 80vw;height: 80vh;margin-top: 7%;margin-left: 10%">
    <TablesView :model-value="aa"></TablesView>
  </div>
</template>

<script lang="ts">
import ContextMenu from "../../components/common/ContextMenu.vue";
import TablesView from "../../components/db/common/TablesView.vue";
import aa from "./aa"

export default {
  name: "aa",
  components: {TablesView, ContextMenu},
  data: ()=>{

    return {
      aa:aa.flatMap(item=>item.tables)
    }
  },
  mounted() {
  }
}

</script>

<style scoped>

</style>