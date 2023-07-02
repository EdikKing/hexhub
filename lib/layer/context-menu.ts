import {render, h, App, AppContext} from "vue";
import ContextMenu from "~/components/common/ContextMenu.vue";
import {MenuItem} from "~/components/common/ContextMenu.vue";


let mInstance = null
let appCtx:AppContext = null;

const init = (app:App)=>{
    appCtx = app._context
}

const open = (evt:MouseEvent,menu:Array<MenuItem>,width:number):Promise<MenuItem>=>{
    if(mInstance == null) {
        const contextMenuNode = h(ContextMenu,{
                observer: (instance=>{
                    mInstance = instance
                }),
            }
        )
        contextMenuNode.appContext = appCtx
        const topLayer = document.getElementById("top-layer")
        const container = document.createElement('div')
        render(contextMenuNode, container)
        topLayer.append(container)
    }
    return mInstance.showContextMenu(evt,menu,width);
}

export default {
    init,
    open,
}