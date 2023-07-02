import lodash from "lodash";

export const escapeParam = (data:string):string=>{
    if(!data){
        return "NULL"
    }
    data = data.trim()
    return data??"NULL"
}

export const escapeString = (data:string,lang?:"mysql"|"mariadb"|"postgresql"|"sqlserver"|"sqlite"):string=>{
    data = lodash.replace(data,/["\\\b\n\r\t\f\v]/g,(str,args)=>{
        switch (str){
            case "\b":
                return "\\b"
            case "\f":
                return "\\f"
            case "\v":
                return "\\v"
            case "\t":
                return "\\t"
            case "\n":
                return "\\n"
            case "\r":
                return "\\r"
            case "\\":
                return "\\"+str
        }
    })
    return "\""+data+"\""
}

export default {
    escapeString,
    escapeParam
}