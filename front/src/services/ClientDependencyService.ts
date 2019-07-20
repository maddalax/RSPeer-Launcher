import {FileService} from "./FileService";
import {ApiService} from "./ApiService";
import {Electron} from "../util/Electron";
const path = Electron.require('path');
const fs = Electron.require('fs-extra');

export class ClientDependencyService {
    
    private readonly file : FileService;
    private readonly api : ApiService;
    
    constructor(file: FileService, api: ApiService) {
        this.file = file;
        this.api = api;
    }
    
    async saveApiJar() {
        if(!await this.hasLatestJar()) {
            throw new Error('Can not save API jar, latest jar not downloaded.');
        }
        const jar = await this.getLatestJarPath();
        const folder = await this.file.getRsPeerFolder();
        await fs.copy(jar, path.join(folder, 'rspeer.jar'));
    }
    
    async hasApiJar() {
        const folder = await this.file.getRsPeerFolder();
        return this.file.exists(path.join(folder, 'rspeer.jar'));
    }
    
    async getLatestJarPath() {
        const folder = await this.file.getHiddenRsPeerFolder();
        const latest = await this.api.get('bot/currentVersion');
        const version = latest.version.toFixed(2);
        const dest = path.join(folder, `${version}.jar`);
        return dest;
    }
    
    async hasLatestJar() {
        const path = await this.getLatestJarPath();
        const exists = await this.file.exists(path);
        if(!exists) {
            return false;
        }
        const stat = await fs.stat(path);
        return stat.size > 1000;
    }
    
    async downloadLatest(onData : (data : any) => any) {
        if(await this.hasLatestJar()) {
            return;
        }
        await this.api.download('bot/currentJar', await this.getLatestJarPath(), onData)
    }
}