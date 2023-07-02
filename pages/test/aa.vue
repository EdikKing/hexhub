<template>
  <div>
    <search>
      <div style="height: 100px; background: #fcebaa;margin-top: 300px" v-context-menu="{width:200,menu:()=>aaa}">
        <input style="width: 1000px;height: 30px"/>
      </div>
    </search>
  </div>

</template>

<script>
import ContextMenu from "../../components/common/ContextMenu";
import Search from "../../components/common/Search";
export default {
  name: "aa",
  components: {Search, ContextMenu},
  data: ()=>{
    return {
      aaa: []
    }
  },
  mounted() {
    this.aaa = [
      {
        type: "title",
        title: this.$t('common.operate'),
      },
      {
        type: "item",
        title: this.$t('common.copy'),
        icon: "mdi-content-copy",
        disabled: false,
      },
      {
        type: "item",
        title: this.$t('common.paste'),
        icon: "mdi-content-paste",
      },
      {type: "line"},
      {
        type: "item",
        title: this.$t('ssh.new-window'),
        icon: 'mdi-shape-square-rounded-plus',
      },
      {
        type: "item",
        title: this.$t('common.reconnect'),
        icon: "mdi-repeat",
      },
      {
        type: "item",
        title: this.$t('ssh.clear-screen'),
        icon: "mdi-trash-can-outline",
      }]
  }
}

</script>

<style scoped>

</style>