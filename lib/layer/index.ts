import Toast from "~/lib/layer/toast";
import Prompt from "~/lib/layer/prompt";
import Confirm from "~/lib/layer/confirm";
import FileCoverConfirm from "~/lib/layer/file-cover-confirm";
import ContextMenu from "~/lib/layer/context-menu";
import ChooseFile from "~/lib/layer/choose-file";

import {App} from "vue";

const init = (app:App)=>{
    Toast.init(app)
    Prompt.init(app)
    Confirm.init(app)
    FileCoverConfirm.init(app)
    ContextMenu.init(app)
    ChooseFile.init(app)
}

export {init,Toast,Prompt,Confirm,FileCoverConfirm,ContextMenu,ChooseFile}
