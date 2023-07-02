<template>
  <v-card class="field-editor">
    <v-text-field
        label="字段"
        density="compact"
        hide-details
        class="mb-3"
        v-model="modelValue.name">
    </v-text-field>
    <div v-if="modelValue.isVirtual">
    </div>

    <div v-else-if="FieldTypeMapping.String.has(modelValue.dbDataType)">
      <div style="display: flex;justify-content: space-around;" class="mb-3">
        <v-autocomplete
            label="字符集"
            v-model="modelValue.charset"
            item-value="charset"
            item-title="charset"
            density="compact"
            hide-details
            :items="tableStructure.charsets"
        ></v-autocomplete>
        <v-autocomplete
            class="pl-3"
            label="校对规则"
            v-model="modelValue.collation"
            density="compact"
            hide-details
            :items="tableStructure.charsets.find((item)=>item.charset === modelValue.charset)?.collations"
        ></v-autocomplete>
      </div>
      <v-radio-group
          inline
          label="默认值"
          hide-details
          density="compact"
          class="mb-3">
        <v-radio label="NULL" density="compact" value="1"></v-radio>
        <v-radio label="自定义值" density="compact" value="2"></v-radio>
        <v-text-field
            label="默认值"
            class="ml-10"
            density="compact"
            hide-details>
        </v-text-field>
      </v-radio-group>
    </div>

    <div v-else-if="FieldTypeMapping.Int.has(modelValue.dbDataType) || FieldTypeMapping.Decimal.has(modelValue.dbDataType)">
      <v-radio-group
          inline
          label="默认值"
          hide-details
          density="compact"
          class="mb-3">
        <v-radio label="NULL" density="compact" value="1"></v-radio>
        <v-radio label="自定义值" density="compact" value="2"></v-radio>
        <v-text-field
            label="默认值"
            class="ml-10"
            density="compact"
            hide-details>
        </v-text-field>
      </v-radio-group>

      <div style="display: flex;justify-content: space-around;" class="mb-3">
        <v-checkbox v-if="FieldTypeMapping.Int.has(modelValue.dbDataType)" label="自动递增" inline hide-details density="compact" v-model="modelValue.autoIncrement"></v-checkbox>
        <v-checkbox label="无符号" inline hide-details density="compact" v-model="modelValue.unsigned"></v-checkbox>
        <v-checkbox label="填充零" inline hide-details density="compact" v-model="modelValue.zeroFile"></v-checkbox>
      </div>
    </div>

    <div v-else-if="FieldTypeMapping.Date.has(modelValue.dbDataType)">
      <v-radio-group
          inline
          label="默认值"
          hide-details
          density="compact"
          class="mb-3">
        <v-radio label="NULL" density="compact" value="1"></v-radio>
        <v-radio label="自动更新" density="compact" value="1"></v-radio>
        <v-radio label="自定义值" density="compact" value="2"></v-radio>
        <v-text-field
            label="默认值"
            class="ml-10"
            density="compact"
            hide-details>
        </v-text-field>
      </v-radio-group>
    </div>

    <div v-else-if="FieldTypeMapping.Enum.has(modelValue.dbDataType)">
      <v-text-field
          label="选项"
          density="compact"
          hide-details
          class="mb-3"
          v-model="modelValue.name">
      </v-text-field>
      <div style="display: flex;justify-content: space-around;" class="mb-3">
        <v-autocomplete
            label="字符集"
            v-model="modelValue.charset"
            item-value="charset"
            item-title="charset"
            density="compact"
            hide-details
            :items="tableStructure.charsets"
        ></v-autocomplete>
        <v-autocomplete
            class="pl-3"
            label="校对规则"
            v-model="modelValue.collation"
            density="compact"
            hide-details
            :items="tableStructure.charsets.find((item)=>item.charset === modelValue.charset)?.collations"
        ></v-autocomplete>
      </div>
      <v-radio-group
          inline
          label="默认值"
          hide-details
          density="compact"
          class="mb-3">
        <v-radio label="NULL" density="compact" value="1"></v-radio>
        <v-radio label="自定义值" density="compact" value="2"></v-radio>
        <v-text-field
            label="默认值"
            class="ml-10"
            density="compact"
            hide-details>
        </v-text-field>
      </v-radio-group>
    </div>

  </v-card>
</template>

<script lang="ts">
  import {PropType} from "#app/compat/capi";
  import {TableField} from "~/components/db/mysql/MysqlDataTable.vue";
  import {FieldTypeMapping, TableStructure} from "~/components/db/mysql/MysqlTableStructEditor.vue";

  export default {
    name: "MysqlFieldEditor",
    props: {
      modelValue: {
        type: Object as PropType<TableField>
      },
      tableStructure: {
        type: Object as PropType<TableStructure>
      }
    },
    setup: function (props, ctx) {
      return {FieldTypeMapping}
    }
  }
</script>

<style scoped lang="scss">
.field-editor{
  padding: 20px min(80px,10%);
  margin: 15px auto;
  width: 600px;
  max-width: 90%;
  .v-radio-group{
    .v-selection-control-group{
      margin-top: 0!important;
    }
  }
}
</style>