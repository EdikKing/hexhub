import { v4 as uuidv4 } from 'uuid';

let pageId: string

/**
 * 获取页面id，每次页面刷新将变化
 */
export const getPageId = ()=>{
    if(!pageId){
        pageId = uuidv4()
    }
    return pageId
}

export const init = () => {
}