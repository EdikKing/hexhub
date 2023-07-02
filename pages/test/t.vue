<template>
  <div>
    <div style="width: 500px;height: 300px;left: 200px;top: 50px;position: absolute">
      <advanced-table id="one" v-model:headers="header" v-model:items="oneData"  group="aa"></advanced-table>
    </div>
    <div style="width: 500px;height: 300px;left: 200px;top: 400px;position: absolute">
      <advanced-table id="two" v-model:headers="header" v-model:items="twoData" group="aa"></advanced-table>
    </div>

  </div>


</template>

<script>
import ContextMenu from "../../components/common/ContextMenu";
import Search from "../../components/common/Search";
import AdvancedTable from "../../components/common/AdvancedTable";
export default {
  name: "t",
  components: {AdvancedTable, Search, ContextMenu},
  data: ()=>{
    return {
      aaa: [],
      sortKey: "",
      sortAsc: false,
      header: [
        {title:"aa",key:"aa",minWidth:null,sortable: true},
        {title:"bb",key:"bb",minWidth:100,sortable: true},
        {title:"cc",key:"cc",minWidth: null,sortable: true},
        {title:"dd",key:"dd",minWidth: null,sortable: false},
        {title:"ee",key:"ee",minWidth: null,sortable: false},
        {title:"ff",key:"ff",minWidth: null,sortable: false},
        {title:"gg",key:"gg",minWidth: null,sortable: false},
      ],
      oneData: [
        {aa:"aa0",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa1",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa2",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa3",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa4",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa5",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa6",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa7",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa8",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa9",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa10",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa11",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa12",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa13",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa14",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa15",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa16",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa17",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa18",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa19",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa20",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa21",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa22",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa23",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"aa24",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
      ],
      twoData: [
        {aa:"a0",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a1",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a2",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a3",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a4",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a5",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a6",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a7",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a8",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a9",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a10",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a11",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a12",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a13",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a14",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a15",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a16",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a17",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a18",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a19",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a20",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a21",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a22",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a23",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
        {aa:"a24",bb:"b1",cc:"c1",dd:"d1",ee:"e1",ff:"f1",gg:"g1"},
      ]
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