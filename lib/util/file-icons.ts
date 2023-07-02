import common from "~/lib/util/common";

const FileTypeIcons = Object.freeze({
    "exe": "#icon-kezhihangwenjian-exe",
    "apk": "#icon-kezhihangwenjian-exe",
    "msi": "#icon-kezhihangwenjian-exe",
    "pkg": "#icon-kezhihangwenjian-exe",
    "dmg": "#icon-kezhihangwenjian-exe",
    "deb": "#icon-kezhihangwenjian-exe",
    "rpm": "#icon-kezhihangwenjian-exe",
    "cmd": "#icon-kezhihangwenjian-exe",
    "sh": "#icon-kezhihangwenjian-exe",
    "bat": "#icon-kezhihangwenjian-exe",

    "dll": "#icon-jingxiangwenjian-iso",
    "so": "#icon-jingxiangwenjian-iso",
    "lib": "#icon-jingxiangwenjian-iso",
    "o": "#icon-jingxiangwenjian-iso",
    "iso": "#icon-jingxiangwenjian-iso",

    "png":"#icon-tupian",
    "gif":"#icon-tupian",
    "jpg":"#icon-tupian",
    "jpeg":"#icon-tupian",
    "bmp":"#icon-tupian",
    "svg":"#icon-tupian",
    "psd":"#icon-tupian",
    "ico":"#icon-tupian",
    "logo":"#icon-tupian",
    "tiff":"#icon-tupian",
    "raw":"#icon-tupian",

    "pdf":"#icon-Pdf",

    "lnk":"#icon-lianjiewenjian",
    "link":"#icon-lianjiewenjian",
    "url":"#icon-lianjiewenjian",

    "db":"#icon-shujuku",
    "sql":"#icon-shujuku",

    "pl":"#icon-chengxu",
    "rb":"#icon-chengxu",
    "go":"#icon-chengxu",
    "java":"#icon-chengxu",
    "lua":"#icon-chengxu",
    "js":"#icon-chengxu",
    "ts":"#icon-chengxu",
    "php":"#icon-chengxu",
    "c":"#icon-chengxu",
    "h":"#icon-chengxu",
    "hpp":"#icon-chengxu",
    "cpp":"#icon-chengxu",
    "py":"#icon-chengxu",
    "css":"#icon-chengxu",
    "less":"#icon-chengxu",
    "scss":"#icon-chengxu",
    "html":"#icon-chengxu",
    "vue":"#icon-chengxu",

    "ini": "#icon-txt",
    "conf": "#icon-txt",
    "gitconfig": "#icon-txt",
    "config": "#icon-txt",
    "yaml": "#icon-txt",
    "yam": "#icon-txt",
    "xml": "#icon-txt",
    "json": "#icon-txt",
    "gitignore": "#icon-txt",
    "properties": "#icon-txt",
    "toml": "#icon-txt",
    "tml": "#icon-txt",
    "txt": "#icon-txt",
    "text": "#icon-txt",
    "md": "#icon-txt",
    "log": "#icon-txt",
    "dockerfile": "#icon-txt",
    "cmake": "#icon-txt",
    "bashrc": "#icon-txt",
    "profile": "#icon-txt",


    "mp4": "#icon-shipin",
    "3gp": "#icon-shipin",
    "wmv": "#icon-shipin",
    "avi": "#icon-shipin",
    "mov": "#icon-shipin",

    "gz":"#icon-yasuobao",
    "zip":"#icon-yasuobao",
    "rar":"#icon-yasuobao",
    "7z":"#icon-yasuobao",
    "tar":"#icon-yasuobao",
    "gzip":"#icon-yasuobao",
    "tgz":"#icon-yasuobao",

    "mp3":"#icon-music",
    "ogg":"#icon-music",
    "wav":"#icon-music",
    "wma":"#icon-music",
    "acc":"#icon-music",

    "doc":"#icon-Word",
    "docx":"#icon-Word",
    "rtf":"#icon-Word",

    "xls": "#icon-Excel",
    "xlsx": "#icon-Excel",
    "csv": "#icon-Excel",

    "ppt": "#icon-PPT",
    "pptx": "#icon-PPT",
})

export const getFileIconByName = (name:string):string=>{
    let ext = common.getFileExt(name).toLowerCase()
    return getFileByExt(ext)
}

export const getFileByExt = (ext:string):string=>{
    return FileTypeIcons[ext]??null
}

export default {
    getFileIconByName,
    getFileByExt
}