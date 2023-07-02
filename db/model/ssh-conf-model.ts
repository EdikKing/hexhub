import {AuthTypePrivateKey} from "~/components/ftp/Ftp.vue";
import {SshConf} from "~/components/ssh/SshTerminal.vue";

type AuthType = 0 | 1 | 2 | 3 | 4;
const AuthTypes = Object.freeze({
    Password: <AuthType>0,
    PrivateKey: <AuthType>1,
    Interactive: <AuthType>2,
    ServerPrivateKey: <AuthType>3,
    None: <AuthType>4,
})

type TunnelType = 0x000 | 0x110 | 0x200 | 0x210;
const TunnelTypes = Object.freeze({
    TcpLocal: <TunnelType>0x000,
    TcpRemote: <TunnelType>0x110,
    Socks5Local: <TunnelType>0x200,
    Socks5Remote: <TunnelType>0x210,
})

class SshConfBaseModel{
    public host: string = ""
    public port: number = 22
    public user: string = "root"
    public authType: AuthType = AuthTypes.Password
    public password?: string
    public privateKey?: SshPrivateKeyKeyModel
}

class SshConfModel extends SshConfBaseModel{
    name: string
    charset?: string = "UTF-8"
    language?: string
    enableSftp: boolean = true
    enableZModem: boolean = true
    enableJumpServer: boolean = false
    timeout?: number = 5
    description?: string
    jumpServer?: SshConfBaseModel = {host: "",port: 22, user: "root" ,authType: AuthTypes.Password}
    envs: SshEnvModel[]
    tunnels?: SshTunnelModel[] = []
    toSshConf(){
        let password = this.password
        let jumpServerPassword = this.jumpServer.password
        if(this.authType === AuthTypePrivateKey){
            password = this.privateKey.password
        }
        if(this.jumpServer.authType === AuthTypePrivateKey){
            jumpServerPassword = this.jumpServer.privateKey.password
        }
        password =  password?String(password):null
        jumpServerPassword =  jumpServerPassword?String(jumpServerPassword):null

        return <SshConf>{
            host: String(this.host),
            port: Number(this.port),
            user: String(this.user),
            envs: this.envs,
            tunnels: this.tunnels.map((item)=>{
                return {
                    type: item.type,
                    bindIp:item.bindIp,
                    bindPort:Number(item.bindPort),
                    srcIp:item.srcIp,
                    srcPort:Number(item.srcPort)
                }
            }),
            charset: String(this.charset),
            timeout: Number(this.timeout),
            language: String(this.language),
            enableZModem: this.enableZModem,
            enableJumpServer: this.enableJumpServer,
            auths: [
                {
                    type: this.authType,
                    privateKey: this?.privateKey?.privateKey,
                    password: password
                }
            ],
            jumpServer: {
                host: String(this.jumpServer?.host),
                port: Number(this.jumpServer?.port),
                user: String(this.jumpServer?.user),
                auths: [
                    {
                        type: this.jumpServer?.authType,
                        privateKey: this.jumpServer?.privateKey?.privateKey,
                        password: jumpServerPassword
                    }
                ]

            }
        }
    }
}
class SshTunnelModel {
    name: string
    type: TunnelType = TunnelTypes.TcpLocal
    bindIp:string = "127.0.0.1"
    bindPort:number
    srcIp:string = "127.0.0.1"
    srcPort:number
}
class SshEnvModel {
    name: string
    value:string
    constructor(name:string,value:string = "") {
        this.name = name
        this.value = value
    }
}
class SshPrivateKeyKeyModel {
    name: string
    filename: string
    type: string
    privateKey: string
    password: string
}

export {
    SshTunnelModel,SshConfBaseModel,SshEnvModel,SshConfModel,SshPrivateKeyKeyModel,
    AuthType,AuthTypes,
    TunnelType,TunnelTypes,
}