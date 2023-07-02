<template>
  <div style="width: 80vw;height: 80vh;margin-top: 7%;margin-left: 10%">
    <client-only>
      <data-table></data-table>
    </client-only>
  </div>
</template>

<script lang="ts">
import ContextMenu from "../../components/common/ContextMenu.vue";
import TablesView from "../../components/db/common/TablesView.vue";
import aa from "./aa"
import DataTable from "~/components/db/common/DataTable.vue";

export default {
  name: "dt",
  components: {DataTable, TablesView, ContextMenu},
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