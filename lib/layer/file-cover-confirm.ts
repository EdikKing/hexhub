import {render, h, App, AppContext} from "vue";
import fileCoverConfirm from "~/components/file/FileCoverConfirm.vue";

let mInstance = null
let appCtx:AppContext = null;

const init = (app:App)=>{
    appCtx = app._context
}

const open = (file: string):Promise<{allApply:boolean,file:string}>=>{
    if(mInstance == null) {
        const fileCoverConfirmNode = h(fileCoverConfirm,{
                observer: (instance=>{
                    mInstance = instance
                }),
            }
        )
        fileCoverConfirmNode.appContext = appCtx
        const topLayer = document.getElementById("top-layer")
        const container = document.createElement('div')
        render(fileCoverConfirmNode, container)
        topLayer.append(container)
    }
    return mInstance.open(file);
}

export default {
    init,
    open,
}