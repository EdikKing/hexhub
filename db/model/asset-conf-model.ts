
export enum AssetType {
    Dir = 0,
    SSHPrivateKey,
    SSH,
    FTP,
    DB,
    QuickCmd,
}

export class AssetExportManifest  <T extends AssetConfData> {
    name: "Hexhub-Asset-Config"
    assetType: AssetType
    version: number
    time: Date
    sign: string
    data: AssetConfModel<T>[]
}

export class AssetConfModel <T extends AssetConfData | string> {
    id: string
    type: AssetType
    dirPath: string = ""
    name: string
    host: string
    user: string
    description?: string
    data: T
    delFlag?: string
    accessed?: Date
    updated?: Date
    created: Date = new Date()
}

export class AssetConfData {
    name: string
    host?: string
    user?: string
    description?: string
}

