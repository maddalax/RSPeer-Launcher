import {FileService} from "./FileService";
import {ApiService} from "./ApiService";
import {Electron} from "../util/Electron";
import {Game} from "../models/Game";

const path = Electron.require('path');
const fs = Electron.require('fs-extra');

export class ClientDependencyService {
    
    private readonly file : FileService;
    private readonly api : ApiService;
    
    constructor(file: FileService, api: ApiService) {
        this.file = file;
        this.api = api;
    }
    
    async saveApiJar(game : Game) {
        if(!await this.hasLatestJar(game)) {
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
    
    async getLatestJarPath(game : Game = Game.Osrs) {
        const folder = await this.file.getHiddenRsPeerFolder(game);
        try {
            const latest = await this.api.get('bot/currentVersion?game=' + game);
            const version = latest.version.toFixed(2);
            return path.join(folder, `${version}.jar`);
        } catch (e) {
            try {
                const files: string[] = await fs.readdir(folder);
                const versions = files.filter(s => s.endsWith(".jar"))
                    .map(s => parseFloat(s.replace(".jar", "")))
                    .filter(s => !isNaN(s)).sort().reverse();
                if (versions.length > 0) {
                    return path.join(folder, `${versions[0]}.jar`);
                }
            } catch (e2) {
                throw e;
            }
            throw e;
        }
    }
    
    async hasLatestJar(game : Game) {
        const path = await this.getLatestJarPath(game);
        const exists = await this.file.exists(path);
        if(!exists) {
            return false;
        }
        const stat = await fs.stat(path);
        return stat.size > 1000;
    }
    
    async downloadLatest(game : Game, onData : (data : any) => any) : Promise<boolean> {
        if(await this.hasLatestJar(game)) {
            return true;
        }
        await this.api.download('bot/currentJar?game=' + game, await this.getLatestJarPath(game), true, onData);
        return true;
    }
}