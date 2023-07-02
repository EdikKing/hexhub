import {render, h, App, AppContext} from "vue";
import Prompt from "~/components/common/Prompt.vue";

let mInstance = null
let appCtx:AppContext = null;

const init = (app:App)=>{
    appCtx = app._context
}

const open = (title:string,value:string|number,multiline=false):Promise<string>=>{
    if(mInstance == null) {
        const promptNode = h(Prompt,{
                observer: (instance=>{
                    mInstance = instance
                }),
            }
        )
        promptNode.appContext = appCtx
        const topLayer = document.getElementById("top-layer")
        const container = document.createElement('div')
        render(promptNode, container)
        topLayer.append(container)
    }
    return mInstance.open(title,value,multiline);
}

export default {
    init,
    open,
}