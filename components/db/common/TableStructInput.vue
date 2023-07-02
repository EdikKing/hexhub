<template>
  <div :class="disabled?'data-input-container disabled':'data-input-container'" v-on:mousedown="(evt:MouseEvent)=>{if(!evt.shiftKey && !evt.metaKey && !evt.ctrlKey){evt.preventDefault()}}">
    <template v-if="InputType.Checkbox === type">
      <small-checkbox
          :color="antiHighlight?null:'primary'"
          :disabled="disabled"
          tabindex="-1"
          :model-value="modelValue"></small-checkbox>
    </template>

    <template v-else-if="InputType.MulKey === type">
      <v-btn
          variant="text"
          tabindex="-1"
          :color="value?'orange':'grey'"
          :prepend-icon="value?'mdi-key-variant':null"
          :size="value?'x-small':'small'"
          :density="value?'default':'comfortable'"
          v-on:click="updateValue(value?null:mulKeySequence+1)"
          v-on:keydown.enter.stop.prevent="updateValue(value?null:mulKeySequence+1)"
      >
        <span v-if="value">
          {{value}}
        </span>
        <v-icon v-else icon="mdi-key-variant" size="small" density="compact"></v-icon>
      </v-btn>
    </template>

    <div class="input-wrapper" v-else-if="show" v-on:mousedown.stop v-on:dragstart.stop.prevent>

      <template v-if="InputType.Char === type">
        <simple-input ref="input" :model-value="value" @update:modelValue="updateValue"></simple-input>
      </template>

      <template v-else-if="InputType.Text === type">
        <simple-input ref="input" :model-value="value" @update:modelValue="updateValue"></simple-input>
        <div class="icon-btn">
          <v-dropdown
              placement="bottom"
              :triggers="[]"
              :hideTriggers="[]"
              :popperTriggers="[]"
              :shown="show"
              :handleResize="false"
              :theme="theme.global.name.value"
              :overflowPadding="50"
              @update.shown="updateShow"
          >
            <v-icon icon="mdi-dots-horizontal" v-ripple></v-icon>
            <template #popper>
              <div class="popper-container" v-on:mousedown.stop>
                <code-editor style="width: 65vw;height: 300px" :model-value="value" @update:modelValue="updateValue"></code-editor>
              </div>
            </template>
          </v-dropdown>
        </div>
      </template>

      <template v-else-if="InputType.Sql === type">
        <simple-input ref="input" :model-value="value" @update:modelValue="updateValue"></simple-input>
        <div class="icon-btn">
          <v-dropdown
              placement="bottom"
              :triggers="[]"
              :hideTriggers="[]"
              :popperTriggers="[]"
              :shown="show"
              :handleResize="false"
              :theme="theme.global.name.value"
              :overflowPadding="50"
              @update.shown="updateShow"
          >
            <v-icon icon="mdi-dots-horizontal" v-ripple></v-icon>
            <template #popper>
              <div class="popper-container" v-on:mousedown.stop>
                <sql-real-editor style="width: 65vw;height: 300px" :language="language" :schemas="options" :default-schema="schema" pure-edit-mode :model-value="value" @update:modelValue="updateValue"></sql-real-editor>
              </div>
            </template>
          </v-dropdown>
        </div>
      </template>

      <template v-else-if="InputType.Int === type">
        <simple-input ref="input" type="number" :model-value="value"  onkeyup="this.value=this.value.replace(/\D|^0/g,'')" @update:modelValue="updateValue"></simple-input>
      </template>

      <template v-else-if="InputType.Decimal === type">
        <simple-input ref="input" type="number" :model-value="value" @update:modelValue="updateValue"></simple-input>
      </template>

      <template v-else-if="InputType.AutoComplete === type">
        <select-popup
            :triggers="[]"
            :hideTriggers="[]"
            :popperTriggers="[]"
            :shown="show"
            :title="title"
            style="width: 200px"
            :filter="autoCompleteFilter"
            :items="options"
            :model-value="value"
            @update:modelValue="updateValue">
          <simple-input ref="input" autofocus="true" v-on:keyup.stop :model-value="value" @update:modelValue="updateValue"></simple-input>
          <div class="icon-tag">
            <v-icon icon="mdi-chevron-down"></v-icon>
          </div>
        </select-popup>
      </template>

      <template v-else-if="InputType.MulSelect === type">
        <select-popup
            :triggers="[]"
            :hideTriggers="[]"
            :popperTriggers="[]"
            :shown="show"
            :title="title"
            multiple
            style="width: 200px"
            :items="options"
            :model-value="value"
            @update:modelValue="updateValue">
          <span class="text">{{formatFunc?formatFunc(item,idx):modelValue}}</span>
          <div class="icon-tag">
            <v-icon icon="mdi-chevron-down"></v-icon>
          </div>
        </select-popup>
      </template>

      <template v-else-if="InputType.CustomPopup === type">
        <div class="text">{{formatFunc?formatFunc(item,idx):modelValue}}</div>
        <div class="icon-btn">
          <v-dropdown
              placement="bottom"
              :triggers="[]"
              :hideTriggers="[]"
              :popperTriggers="[]"
              :shown="show"
              :handleResize="false"
              :theme="theme.global.name.value"
              :overflowPadding="50"
              @update.shown="updateShow"
          >
            <v-icon icon="mdi-dots-horizontal" v-ripple></v-icon>
            <template #popper>
              <div class="popper-container" v-on:mousedown.stop>
                <slot name="customPopup"></slot>
              </div>
            </template>
          </v-dropdown>
        </div>
      </template>
    </div>

    <v-btn
        v-else-if="InputType.SortBtn === type"
        style="cursor: move"
        prepend-icon="mdi-cursor-move"
        variant="text"
        size="small"
        density="compact"
        v-on:mousedown="(evt:MouseEvent)=>{if(!evt.shiftKey && !evt.metaKey && !evt.ctrlKey){evt.stopPropagation()}}">
      {{modelValue}}
    </v-btn>

    <slot name="custom" v-else-if="InputType.Custom === type"></slot>

    <div v-else class="text" v-on:click="onClick" v-on:mousedown="(evt:MouseEvent)=>{if(!evt.shiftKey && !evt.metaKey && !evt.ctrlKey){evt.preventDefault()}}">
      {{formatFunc?formatFunc(item,idx):modelValue}}
    </div>
  </div>
</template>

<script lang="ts">
import {getCurrentInstance, nextTick, onUnmounted, ref, watch} from "vue";
import {useTheme} from "vuetify";
import JsonEditor from "~/components/editor/JsonEditor.vue";
import CodeEditor from "~/components/editor/CodeEditor.vue";
import SelectView from "~/components/common/SelectView.vue";
import SmallCheckbox from "~/components/common/SmallCheckbox.vue";
import SelectPopup from "~/components/common/SelectPopup.vue";
import SimpleInput from "~/components/common/SimpleInput.vue";
import lodash from "lodash";
import {PropType} from "#app/compat/capi";
import SqlRealEditor from "~/components/db/common/SqlRealEditor.vue";

enum InputType{
  SortBtn,
  Custom,
  CustomPopup,
  Char,
  Text,
  Sql,
  Int,
  Decimal,
  AutoComplete,
  Checkbox,
  MulKey,
  MulSelect,
  //:todo
  // Select,
}


export {InputType}

export default {
  name: "TableStructInput",
  components: {SqlRealEditor, SimpleInput, SelectPopup, SmallCheckbox, SelectView, CodeEditor, JsonEditor},
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    schema: String,
    table: String,
    language: {
      type: String,
      default: "mysql"
    },
    modelValue: {},
    item: {},
    idx: {
      type:Number
    },
    type: {
      type: Number,
      default: InputType.Text,
    },
    antiHighlight: {
      type: Boolean,
      default: false
    },
    mulKeySequence: {
      type: Number,
      default: 0,
    },
    disabled: {
      type: Boolean,
      default: false
    },
    options: {
      type: [Array,Function]
    },
    title: {
      type: String
    },
    formatFunc: {
      type: Function as PropType<(item:any,idx:number)=>string>,
    }
  },
  emits: ["update:show","update:modelValue","changed"],
  setup(props, ctx) {
    const instance = getCurrentInstance()
    const antiHighlight = ref(props.antiHighlight)
    const value = ref(props.modelValue)
    const show = ref(props.show)
    const input = ref<HTMLInputElement>()
    const type = ref(props.type)

    let change = false

    const theme = useTheme()

    const updateShow = (status)=>{
      if(status !== show.value){
        ctx.emit("update:show",status)
        //当隐藏后如果数据发生变化，则推送changed事件
        if(!show.value && change){
          change = false
          ctx.emit("changed",value.value)
        }
      }
    }

    const onInputChange = (evt:Event)=>{
      const input = <HTMLInputElement>evt.target
      const v = input.value
      updateValue(v)
    }

    const autoCompleteFilter = (item:string)=>{
      const valueStr = value.value
      if(valueStr){
        if(props.options.indexOf(valueStr) !== -1){
          return true
        }
        return item.includes(valueStr)
      }else{
        return true
      }
    }

    const updateValue = (v)=>{
      if(v !== value.value){
        change = true
        ctx.emit("update:modelValue",v)
      }
    }

    const onClick = (evt:MouseEvent)=>{
      if(!evt.shiftKey && !evt.metaKey && !evt.ctrlKey){
        updateShow(true)
      }
    }

    const focus = ()=>{
      nextTick(()=>{
        (<HTMLElement>instance.proxy.$el).querySelector<HTMLElement>("input,textarea,button,[contenteditable=true],[tabindex]")?.focus();
      })
    }

    //点击外部，隐藏输入框
    const mousedownExternal = ()=>{
      lodash.delay(()=>{
        updateShow(false)
      },250)
    }

    watch(()=>props.show,(s)=>{
      show.value = s
    })

    watch(()=>props.modelValue,(v)=>{
      value.value = props.modelValue
    })

    watch(()=>props.type,(v)=>{
      type.value = v
    })

    watch(()=>show.value,(f)=>{
      show.value = f
      if(f){
        nextTick(()=>{
          focus()
        })
        document.addEventListener("mousedown",mousedownExternal)
      }else{
        document.removeEventListener("mousedown",mousedownExternal)
      }
    })

    watch(()=>props.antiHighlight,(v)=>{
      antiHighlight.value = v
    })

    onUnmounted(()=>{
      updateShow(false)
    })

    return {
      InputType,
      theme,
      antiHighlight,
      input,
      show,
      value,
      type,
      focus,
      updateShow,
      updateValue,
      onInputChange,
      onClick,
      autoCompleteFilter
    }
  },
}
</script>

<style lang="scss">
.selects-view{
  border-radius: 0!important;
  border: none!important;
}
.v-popper__inner{
  .popper-container{
    overflow: hidden;
    display: flex;
    border: 0.5px solid #cdcdcd;
    border-radius: 4px;
    background-color: #ffffff;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.2);
    textarea{
      padding: 0 2px;
      height: 100px;
      width: 350px;
      resize: both;
      &:focus{
        outline: none;
      }
    }
    input{
      padding: 0 2px;
      height: 50px;
      width: 200px;
      &:focus{
        outline: none;
      }
    }
  }
}
.data-input-container{
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  &.disabled{
    cursor: not-allowed;
    & > *{
      pointer-events: none;
    }
  }
  .text{
    width: 100%;
    text-align: left;
    padding-left: 2px;
    height: 100%;
    display: flex;
    align-items: center;
  }
  .v-popper{
    width: 100%;
    height: 100%;
  }
  .input-wrapper{
    height: 100%;
    width: 100%;
    position: relative;
    .icon-btn,.icon-tag{
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      .v-icon{
        background: rgba(170, 170, 170);
        border-radius: 4px;
      }
    }
    .icon-tag {
      pointer-events: none;
      .v-icon {
        background: none;
      }
    }
    input{
      color: inherit;
      resize: none;
      height: 100%;
      max-height: 100%;
      width: 100%;
      text-align: left;
      background: #666666;
      padding: 0 2px;
      border:  1px dotted;
      box-sizing: border-box;
      &:focus{
        outline: none;
      }
      &::selection {
        background: rgb(var(--v-theme-info));
        color: rgb(var(--v-theme-background));
      }
    }
  }
}
</style>