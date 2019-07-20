import {Electron} from "../util/Electron";
import {guid} from "../util/Util";
import {Launcher} from "../models/Launcher";
const axios = Electron.require('axios');
const os = Electron.require('os');

export class LauncherInfoService {
    
    private identifier : string;
    private ip : string;
    
    constructor() {
        console.log('launcher info service constructor');
        this.ip = '';
        this.identifier =  this.identifier = `launcher_${guid()}`;
    }
    
    public isMe(launcher : Launcher) : boolean {
        return launcher.identifier === this.identifier;
    }

    public async get() : Promise<Launcher> {
        if(!this.ip) {
            this.ip = await this.tryGetIp();
        }
        return {
            host : os.hostname(),
            platform: os.platform(),
            identifier : this.identifier,
            type: os.type(),
            userInfo: os.userInfo(),
            ip : this.ip
        }
    }
    
    private async tryGetIp() {
        try {
            const {data} = await axios.get('https://checkip.amazonaws.com');
            return data != null ? data.toString().trim() : '';
        } catch (ignored) {
            return null;
        }
    }
    
}