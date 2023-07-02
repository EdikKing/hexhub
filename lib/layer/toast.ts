import {render, h, AppContext, App} from "vue";
import Toast from "~/components/common/Toast.vue";

let mInstance = null
let appCtx:AppContext = null;

const init = (app:App)=>{
    appCtx = app._context
}

const show = (msg,type,icon,timeout)=>{
    if(mInstance == null) {
        const toastNode = h(Toast,{
            observer: (instance=>{
                mInstance = instance
            }),
            }
        )
        toastNode.appContext = appCtx
        const topLayer = document.getElementById("top-layer")
        const container = document.createElement('div')
        render(toastNode, container)
        topLayer.append(container)
    }
    mInstance.open(msg, type,icon,timeout);
}

export default {
    init,
    show,
    info:(msg,timeout=1500)=>{
        show(msg,"info","mdi-information",timeout)
    },
    success:(msg,timeout=1000)=>{
        show(msg,"success","mdi-information",timeout)
    },
    error:(msg,timeout=3500)=>{
        show(msg,"error",'mdi-alert',timeout)
    },
    warn:(msg,timeout=2500)=>{
        show(msg,"warning",'mdi-alert',timeout)
    },
}