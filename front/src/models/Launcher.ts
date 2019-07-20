export interface Launcher {
    host: string,
    platform: string,
    identifier : string,
    type: string,
    userInfo: any,
    ip : string,
    isMe? : boolean
}