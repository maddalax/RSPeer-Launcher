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
        const latest = await this.api.get('bot/currentVersion?game=' + game);
        const version = latest.version.toFixed(2);
        return path.join(folder, `${version}.jar`);
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
    
    async downloadLatest(game : Game, onData : (data : any) => any) {
        if(await this.hasLatestJar(game)) {
            return;
        }
        await this.api.download('bot/currentJar?game=' + game, await this.getLatestJarPath(game), true, onData)
    }
}