import {FileService} from "./FileService";
import {ApiService} from "./ApiService";
import {Electron} from "../util/Electron";
import {Game} from "../models/Game";
import {Encryptor} from "../util/Encryptor";

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
            return;
        }
        const jar = await this.getLatestJarPath();
        const folder = await this.file.getRsPeerFolder();
        const meta = path.join(folder, 'sdk.json');

        if(await fs.exists(meta)) {
            const metaData = await fs.readJson(meta);
            // Already is the latest jar, do not copy over.
            if(metaData && metaData.clientPath && metaData.clientPath === jar) {
                return;
            }
        }

        const dest = path.join(folder, 'rspeer.jar');
        await this.file.delete(dest);
        await fs.copy(jar, dest);
        await fs.writeJson(path.join(folder, 'sdk.json'), {clientPath: jar});
    }

    async getLatestJarVersion(game : Game = Game.Osrs) : Promise<number> {
        const folder = await this.file.getHiddenRsPeerFolder(game);
        const latest = await this.api.get('bot/currentVersion?game=' + game);
        const version = latest.version.toFixed(2);
        return path.join(folder, `${version}.jar`);
    }

    async getLatestJarPath(game : Game = Game.Osrs) {
        const folder = await this.file.getHiddenRsPeerFolder(game);
        try {
           return await this.getLatestJarVersion(game);
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

    async getOrSaveLatestJar(game : Game = Game.Osrs, onData : (data : any) => void) {
       return await this.downloadLatest(game, onData);
    }

    async hasLatestJar(game : Game) {
        const latestJarPath = await this.getLatestJarPath(game);
        const exists = await this.file.exists(latestJarPath);
        if(!exists) {
            return false;
        }
        try {
            const hash = await Encryptor.sha512HashFromFile(latestJarPath);
            const latestVersion = await this.getLatestJarVersion(game);
            const versionByHash = await this.api.get(`bot/getVersionByHash?game=${game}&hash=${hash}`);
            const jarFolder = await this.file.getHiddenRsPeerFolder(game);
            return path.join(jarFolder, `${versionByHash}.jar`) === latestVersion;
        } catch (e) {
            console.error(e);
            const stat = await fs.stat(path);
            return stat.size > 1000;
        }
    }

    async downloadLatest(game : Game, onData : (data : any) => any) : Promise<string> {
        const path = await this.getLatestJarPath(game);
        if(await this.hasLatestJar(game)) {
            return path;
        }
        await this.api.download('bot/currentJar?game=' + game, path, true, onData);
        return path;
    }
}