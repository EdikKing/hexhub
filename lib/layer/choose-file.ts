import {render, h, App, AppContext} from "vue";
import ChooseFile from "~/components/common/ChooseFile.vue";

let mInstance = null
let appCtx:AppContext = null;

const init = (app:App)=>{
    appCtx = app._context
}

const open = (title: string):Promise<File>=>{
    if(mInstance == null) {
        const confirmNode = h(ChooseFile,{
                observer: (instance=>{
                    mInstance = instance
                }),
            }
        )
        confirmNode.appContext = appCtx
        const topLayer = document.getElementById("top-layer")
        const container = document.createElement('div')
        render(confirmNode, container)
        topLayer.append(container)
    }
    return mInstance.open(title);
}

export default {
    init,
    open,
}