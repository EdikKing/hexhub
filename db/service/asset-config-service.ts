import Dexie, {Table} from "dexie";
import {SshConfModel, SshPrivateKeyKeyModel,} from "~/db/model/ssh-conf-model";
import {DexieService} from "~/db/service/base";
import lodash from "lodash";
import {v4 as uuidv4} from 'uuid';
import {AssetConfData, AssetConfModel, AssetExportManifest, AssetType} from "~/db/model/asset-conf-model";
import {genNotExistPath} from "~/lib/util/common";


export default class AssetConfigService extends DexieService {
    protected static instance:AssetConfigService = null

    public assets!: Table<AssetConfModel<AssetConfData|string>, string>;

    public constructor() {
        super("asset-config");
        this.version(1).stores({
            assets: "id,type,dirPath,name,host,user,delFlag"
        });
    }

    getVersion(): number {
        return 1;
    }

    public static getInstance(){
        if(AssetConfigService.instance === null){
            AssetConfigService.instance = new AssetConfigService()
        }
        return AssetConfigService.instance
    }

    private async checkModel(model:AssetConfModel<any>,type?: AssetType){
        if(!model.name){
            throw new Error("名称不能为空");
        }
        if(!type){
            type = model.type
        }
        const name = model.name
        if(/[/\\ ]/.test(name)){
            throw new Error("名称不允许出现/\\空格等特殊符号");
        }else if(name.startsWith(".")){
            throw new Error("名称不能以.开头");
        }
        if(await this.assets.where("dirPath").equals(model.dirPath).and((item)=>{
            if(item.id === model.id){
                return false;
            }
            return (item.type === AssetType.Dir || item.type === type) && item.name === name;
        }).count() > 0){
            throw new Error("名称不允许重复");
        }
    }

    public async mkdir(dirPath: string, name: string, type: AssetType, throwExistsErr=true) {
        name = name.trim()
        dirPath = this.tidyPath(dirPath)
        const dirData = await this.assets.where("dirPath").equals(dirPath).and((f) => {
            return f.name === name && f.type === AssetType.Dir
        }).first()
        const now = new Date()
        if (dirData) {
            if(dirData.delFlag && dirData.delFlag.includes(`[${type}=1]`)){
                //如果是软删除那么直接恢复即可
                dirData.delFlag = dirData.delFlag.replace(`[${type}=1]`,"")
                dirData.updated = now
                const confData = this.deserializeData(AssetType.Dir, <string>dirData.data);
                confData.name = name;
                dirData.data = this.serializeData(type,confData);
                return this.assets.update(dirData.id,dirData)
            }else{
                //文件夹已存在，不能重复创建
                if(throwExistsErr){
                    throw new Error("目录已存在")
                }
            }
        }else{
            const confData = new AssetConfData()
            confData.name = name;
            let model = <AssetConfModel<any>>{
                id: uuidv4(),
                type: AssetType.Dir,
                dirPath,
                name,
                data: this.serializeData(type,confData),
                created: now,
                accessed: now,
                updated: now,
            }
            await this.checkModel(model,type);
            return this.assets.add(model)
        }
    }

    public async del(id: string[],type: AssetType) {
        await this.transaction("rw",[this.assets],async () => {
            const list = await this.assets.where("id").anyOf(id).toArray()
            const now = new Date()
            const flag = `[${type}=1]`
            for (const item of list) {
                this.assets.where("dirPath").equals(item.id).delete()
                if(item.type === AssetType.Dir){
                    const path = this.joinPath([item.dirPath,item.name])
                    await this.assets.where("dirPath")
                        .startsWith(path)
                        .filter((f)=>{
                            return f.type === type
                        }).delete()

                    //收集包括当前目录在内的所有子目录，并按照层级结构降序排序(层级越深越靠前)
                    const dirs = (await this.assets.where("dirPath")
                        .startsWith(path)
                        .filter((f)=>{
                            return f.type === AssetType.Dir
                        }).toArray())
                        .sort((a,b)=>b.dirPath.split("/").length-a.dirPath.split("/").length)
                    dirs.push(item);
                    for (const dir of dirs) {
                        //判断该目录下是否有其他类型的数据，如果有就仅针对当前类型进行软删除，没有就直接删除目录
                        const count = await this.assets.where("dirPath")
                            .startsWith(this.joinPath([dir.dirPath,dir.name]))
                            .count()
                        if(count > 0){
                            if(dir.delFlag){
                                if(!dir.delFlag.includes(flag)){
                                    dir.delFlag = item.delFlag+flag
                                }
                            }else{
                                dir.delFlag = flag
                            }
                            dir.updated = now
                            await this.assets.update(dir.id, dir)
                        }else{
                            await this.assets.delete(dir.id)
                        }

                    }
                }else{
                    await this.assets.delete(item.id)
                }
            }
        })
    }

    public async save<T extends AssetConfData>(model: AssetConfModel<AssetConfData>) {
        if(model.id){
            return await this.update(model.id,model.data)
        }else{
            return await this.add(model.type,model.data,model.dirPath)
        }
    }

    public async add<T extends AssetConfData>(type: AssetType, data: AssetConfData,dirPath="") {
        dirPath = this.tidyPath(dirPath)
        data.name = data.name.trim()
        data = this.cloneAndTidyModel(data)
        const model = new AssetConfModel()
        model.id = uuidv4()
        model.updated = new Date()
        model.created = model.updated
        model.accessed = model.updated
        model.dirPath = dirPath
        model.type = type
        model.name = data.name
        model.description = data.description
        model.host = data.host
        model.user = data.user

        await this.checkModel(model)

        model.data = this.serializeData(type,data)
        await this.assets.add(model);
        return (<AssetConfModel<T>>await model)
    }

    public async update<T extends AssetConfData>(id: string, data: T) {
        const model = await this.assets.get(id)
        if(!model){
            throw new Error("Data does not exist")
        }
        data.name = data.name.trim()
        data = this.cloneAndTidyModel(data)
        model.updated = new Date()
        model.name = data.name
        model.description = data.description
        model.host = data.host
        model.user = data.user
        model.data = this.serializeData(model.type,data)

        await this.checkModel(model)

        await this.assets.update(id,model)
        return (<AssetConfModel<T>>await model)
    }

    public async copy(id: string[], dirPath:string,assetType:AssetType) {
        dirPath = this.tidyPath(dirPath)
        const isExistFunc = async (name: string) => {
            if(await this.assets.where("dirPath").equals(dirPath).and((f) => {
                return (f.type === assetType || f.type === AssetType.Dir) && f.name === name && (!f.delFlag || !f.delFlag.includes(`[${assetType}=1]`))
            }).count() > 0){
                return Promise.reject()
            }else{
                return Promise.resolve()
            }
        }
        await this.transaction("rw", [this.assets], async () => {
            const list = await this.list(id)
            try {
                for (const item of list) {
                    //Dexie不允许外部Promise,需要包一层(此操作将会堵塞这个表的事务处理)
                    const newName = await Dexie.waitFor(genNotExistPath(item.name, isExistFunc))
                    item.name = newName
                    item.data.name = newName
                    if (item.type === AssetType.Dir) {
                        //目录下子文件复制
                        const newPath = this.joinPath([dirPath,item.name])
                        const oldPath = this.joinPath([item.dirPath,item.name])
                        const subList = await this.subList(assetType,this.joinPath([item.dirPath,item.name]))
                        console.log("fff",subList)
                        for (const subItem of subList) {
                            await this.add(subItem.type, subItem.data, newPath+lodash.trimStart(subItem.dirPath,oldPath))
                        }

                        await this.mkdir(dirPath, item.name, assetType, false)
                    } else {
                        await this.add(item.type, item.data, dirPath)
                    }
                }
            }catch (e){
                throw e
            }
        })
    }

    public async move(id: string[], dirPath:string) {
        dirPath = this.tidyPath(dirPath)
        await this.transaction("rw", [this.assets], async () => {
            const list = await this.list(id)
            for (const item of list) {
                if(await this.assets.where("dirPath").equals(dirPath).and(f=>{
                    return f.type === item.type && f.name == item.name
                }).count() > 0){
                    throw new Error("存在同名资产")
                }
                await this.assets.update(item.id,{updated:new Date(),dirPath: dirPath})

                if(item.type === AssetType.Dir){
                    //目录下子文件移动
                    const newPath = this.joinPath([dirPath,item.name])
                    const oldPath = this.joinPath([item.dirPath,item.name])
                    const subList = await this.assets.where("dirPath").startsWith(oldPath).toArray()
                    for (const subItem of subList) {
                        await this.assets.update(subItem.id,{updated:new Date(),dirPath: newPath + lodash.trimStart(subItem.dirPath, oldPath)})
                    }
                }
            }
        })
    }

    public async query<T extends AssetConfData>(type: AssetType,dirPath?: string,filterDir=false):Promise<AssetConfModel<T>[]> {
        dirPath = this.tidyPath(dirPath)
        const list = await this.assets.where("dirPath").equals(dirPath).filter((f) => {
            if(filterDir){
                return f.type === type && (!f.delFlag || !f.delFlag.includes(`[${type}=1]`))
            }else{
                return (f.type === type || f.type === AssetType.Dir) && (!f.delFlag || !f.delFlag.includes(`[${type}=1]`))
            }
        }).toArray()
        return <AssetConfModel<T>[]>list.map((item)=> {
            item.data = this.deserializeData(item.type,<string>item.data)
            return item
        })
    }

    public async list<T extends AssetConfData>(id:string[]):Promise<AssetConfModel<T>[]> {
        const list = await this.assets.where("id").anyOf(id).toArray()
        return <AssetConfModel<T>[]>list.map((item)=>{
            item.data = this.deserializeData(item.type,<string>item.data)
            return item
        })
    }

    public async find<T extends AssetConfData>(id: string):Promise<AssetConfModel<T>> {
        const item = await this.assets.where("id").equals(id).first()
        if(item){
            item.data = this.deserializeData(item.type,<string>item.data)
        }
        return <AssetConfModel<T>>item
    }

    public async findByName<T extends AssetConfData>(dirPath: string,name:string,assetType:AssetType):Promise<AssetConfModel<T>> {
        const item = await this.assets.where("dirPath").equals(dirPath).filter((item)=>{
            return item.name === name && assetType === assetType
        }).first()
        if(item){
            item.data = this.deserializeData(item.type,<string>item.data)
        }
        return <AssetConfModel<T>>item
    }

    public async findData<T extends AssetConfData>(id: string):Promise<T> {
        const item = await this.find<T>(id)
        if(item){
            return item.data
        }else{
           return null
        }
    }

    public async rootOrSubList<T extends AssetConfData>(type: AssetType,dirPath?:string):Promise<AssetConfModel<T>[]> {
        dirPath = this.tidyPath(dirPath)
        const list = await this.assets.where("type").equals(type).filter((f) => {
            return f.dirPath === "/" || f.dirPath.startsWith(dirPath)
        }).toArray()
        return <AssetConfModel<T>[]>list.map((item)=>{
            item.data = this.deserializeData(item.type,<string>item.data)
            return item
        })
    }

    public async subList<T extends AssetConfData>(type: AssetType,dirPath?: string):Promise<AssetConfModel<T>[]> {
        dirPath = this.tidyPath(dirPath)
        const list = await this.assets.where("dirPath").startsWith(dirPath).filter((f) => {
            return (f.type === type || f.type === AssetType.Dir) && (!f.delFlag || !f.delFlag.includes(`[${type}=1]`))
        }).toArray()
        return <AssetConfModel<T>[]>list.map((item)=>{
            item.data = this.deserializeData(item.type,<string>item.data)
            return item
        })
    }

    public async listAndSub<T extends AssetConfData>(assetType: AssetType,id:string[]):Promise<AssetConfModel<T>[]> {
        let list = await this.list<T>(id);
        let result = []
        for (const item of list) {
            result.push(item)
            if(item.type === AssetType.Dir){
                let subList = await this.subList(assetType, this.joinPath([item.dirPath,item.name]))
                result.push(...subList)
            }
        }
        return result
    }

    public async updateAccessed(id: string) {
        const now = new Date()
        await this.assets.update(id, {accessed: now, updated: now})
        return now
    }

    public async rename(id: string, name: string) {
        return this.transaction("rw", [this.assets], async () => {
            const item = await this.find(id)
            if (item) {
                const oldPath = this.joinPath([item.dirPath,item.name])
                const newPath = this.joinPath([item.dirPath,name])

                item.data.name = name
                await this.update(item.id,item.data)

                if(item.type === AssetType.Dir) {
                    const list = await this.assets.where("dirPath").startsWith(oldPath).toArray()
                    for (const assert of list) {
                        await this.assets.update(assert.id, {
                            updated: new Date(),
                            dirPath: newPath + lodash.trimStart(assert.dirPath, oldPath)
                        })
                    }
                }
            }else{
                throw new Error("Data does not exist")
            }
        })

    }

    public async exportJSON(assetType: AssetType,dirPath:string, id: string[]) {
        dirPath = this.tidyPath(dirPath)
        const conf = new AssetExportManifest()
        conf.version = this.getVersion()
        conf.assetType = assetType
        conf.time = new Date()
        conf.data = await this.listAndSub(assetType,id)
        conf.data.forEach((item)=>{
            item.dirPath = this.tidyPath(item.dirPath.replace(dirPath,""))
            this.encrypt(item)
        })
        conf.sign = this.sign(conf)
        return this.serialize(conf)
    }

    public async importJSON(json: string,dirPath:string, onConflict: (current: AssetConfModel<any>, your: AssetConfModel<any>) => Promise<any>) {
        const conf = this.deserialize<AssetExportManifest<any>>(json)
        if (conf.name !== "Hexhub-Asset-Config" && !conf.data) {
            throw new Error("导入配置格式不正确！")
        } else if (conf.version != this.getVersion()) {
            throw new Error("导入配置版本非最新版本！")
        }

        //检查签名
        const sign = conf.sign
        conf.sign = undefined
        if(sign != this.sign(conf)){
            throw new Error("配置文件发生篡改！")
        }

        const items = conf.data
        items.forEach((item)=>{
            item.data = this.decryptData(item.type,item.data)
        })

        dirPath = lodash.trimEnd(dirPath,"/")

        await this.transaction("rw", [this.assets], async () => {
            try {
                for (const item of items) {
                    item.dirPath = this.tidyPath(dirPath+item.dirPath)
                    if (item.type === AssetType.Dir) {
                        await this.mkdir(item.dirPath, item.name, conf.assetType, false)
                    } else {
                        const localItem = await this.findByName(item.dirPath, item.name, item.type)
                        if (localItem) {
                            let allowUpdate = false
                            try {
                                //Dexie不允许外部Promise,需要包一层(此操作将会堵塞这个表的事务处理)
                                await Dexie.waitFor(onConflict(localItem, item))
                                allowUpdate = true
                            } catch (e) {
                            }
                            if (allowUpdate) {
                                await this.assets.delete(localItem.id)
                                await this.add(item.type, item.data, item.dirPath)
                            }
                        } else {
                            await this.add(item.type, item.data, item.dirPath)
                        }
                    }
                }
            }catch (e) {
                console.error("333",e)
                throw e
            }
        })
    }


    private deserializeData<T extends AssetConfData>(assetType:AssetType,json:string){
        let model
        switch (assetType){
            case AssetType.SSHPrivateKey:
                model = new SshPrivateKeyKeyModel()
                break
            case AssetType.SSH:
                model = new SshConfModel()
                break
            default:
                model = new AssetConfData()
                break
        }
        Object.assign(model, this.deserialize(json))
        model = this.decryptData(assetType, model)
        return model;
    }

    private serializeData<T extends AssetConfData>(assetType:AssetType,data:AssetConfData){
        data = this.encryptData(assetType,data)
        return this.serialize(data);
    }

    private encrypt<T extends AssetConfData>(model:AssetConfModel<T>){
        if(!model.data){
            return model
        }
        model.data = this.encryptData(model.type,model.data)
        return model
    }

    private encryptData<T extends AssetConfData>(assetType:AssetType, data:T){
        switch (assetType){
            case AssetType.SSH:
                data = this.encryptFields(["password","privateKey","jumpServer.password","jumpServer.privateKey"],data)
                break
            case AssetType.SSHPrivateKey:
                data = this.encryptFields(["privateKey","password"],data)
                break
        }
        return data
    }

    private decrypt<T extends AssetConfData>(model:AssetConfModel<T>){
        if(!model.data){
            return model
        }
        model.data = this.decryptData(model.type,model.data)
        return model
    }

    private decryptData<T extends AssetConfData>(assetType:AssetType, data:T){
        switch (assetType){
            case AssetType.SSH:
                data = this.decryptFields(["password","privateKey","jumpServer.password","jumpServer.privateKey"],data)
                break
            case AssetType.SSHPrivateKey:
                data = this.decryptFields(["privateKey","password"],data)
                break
        }
        return data
    }

    public joinPath(arr:string[]){
        return this.tidyPath(lodash.join(arr.filter((node)=>node!==null).map(node=>lodash.trimEnd(node,"/")),"/"))
    }

    private tidyPath(path:string){
        if(!path || path === "/"){
            return "/"
        }
        //防止收尾出现连续多个/
        path = lodash.trim(path,"/")
        return "/"+path+"/"
    }

}