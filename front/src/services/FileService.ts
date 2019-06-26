import {IFileService} from "./base/IFileService";
import {Electron} from "../util/Electron";
import {unzip} from "../util/Unzip";
import {OperatingSystem, OperatingSystems} from "../util/OperatingSystem";

const path = Electron.require('path');
const os = Electron.require('os');
const process = Electron.require('process');
const fs = Electron.require('fs-extra');

export class FileService implements IFileService {

    async getRsPeerFolder(): Promise<string> {
        const isWin = process.platform === "win32";
        const home = this.getHomeDirectory();
        const folder = path.join(isWin ? path.join(home, 'Documents') : home, 'rspeer', 'cache');
        await fs.ensureDir(folder);
        return folder;
    }
    
    async getDatabasePath(): Promise<string> {
        const folder = await this.getRsPeerFolder();
        const data = path.join(folder, 'data');
        await fs.ensureDir(data);
        return path.join(data,'rspeer.db');
    }

    async getHiddenRsPeerFolder(): Promise<string> {
        const home = this.getHomeDirectory();
        const folder = path.join(home, '.rspeer');
        await fs.ensureDir(folder);
        return folder;
    }

    getHomeDirectory(): string {
        return os.homedir();
    }

    getSystemUsername(): string {
        return os.userInfo().username;
    }

    async getJavaPath(): Promise<string> {
        const botData = await this.getBotDataFolder();
        const javaFolderName = this.getJavaFolderName();
        const os = OperatingSystems.current();
        return os === OperatingSystem.MacOSX
            ? path.join(botData, javaFolderName, 'Contents', 'Home')
            : path.join(botData, javaFolderName);
    }

    async unzip(path: string, dest: string, onData: (data: any) => any): Promise<string> {
        return await unzip(path, dest, onData);
    }

    getJavaFolderName(): string {
        const os = OperatingSystems.current();
        switch (os) {
            case OperatingSystem.Linux:
                return "jre-8-linux64";
            case OperatingSystem.MacOSX:
                return "jre-8-mac64";
            case OperatingSystem.Windows32:
                return "jre-8-win32";
            // use 32 bit java for 64 os because it uses less ram.
            case OperatingSystem.Windows64:
                return "jre-8-win32";
        }
        throw new Error("Operating system not specified.");
    }

    async exists(path: string): Promise<boolean> {
        return await fs.pathExists(path);
    }

    async delete(path : string) : Promise<boolean> {
        return await fs.remove(path);
    }

    async getBotDataFolder(): Promise<string> {
        const rspeerFolder = await this.getRsPeerFolder();
        const data = path.join(rspeerFolder, 'bot_data');
        await fs.ensureDir(data);
        return data;
    }
}