
let tempEl:HTMLDivElement

export const htmlEncode = (text:string):string=>{
    if(!text){
        return text
    }
    if(!tempEl){
        tempEl = document.createElement("div");
    }
    tempEl.innerHTML = text;
    return tempEl.innerText || tempEl.textContent;
}
