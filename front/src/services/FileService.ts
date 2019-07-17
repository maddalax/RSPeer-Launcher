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
        const folder = path.join(isWin ? path.join(home, 'Documents') : home, 'RSPeer', 'cache');
        await fs.ensureDir(folder);
        return folder;
    }

    async getDatabasePath(): Promise<string> {
        const folder = await this.getRsPeerFolder();
        const data = path.join(folder, 'data');
        await fs.ensureDir(data);
        return path.join(data, 'rspeer.db');
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

    async getJavaPath(): Promise<string | null> {
        const botData = await this.getBotDataFolder();
        const javaFolderName = await this.getJavaFolderName();
        if(!javaFolderName) {
            return null;
        }
        const os = OperatingSystems.current();
        return os === OperatingSystem.MacOSX
            ? path.join(botData, javaFolderName, 'Contents', 'Home')
            : path.join(botData, javaFolderName);
    }

    async unzip(path: string, dest: string, onData: (data: any) => any): Promise<string> {
        return await unzip(path, dest, onData);
    }

    async getJavaFolderName(): Promise<string> {
        const botData = await this.getBotDataFolder();
        const files = await fs.readdir(botData);
        const javaPath = files.find((s : string) => {
            if(s.endsWith('.zip') || s.endsWith('.tar.gz') || s.startsWith('.')) {
                return false;
            }
            return s.startsWith('jdk') || s.endsWith('jre');
        });
        return javaPath;
    }

    getJavaDownloadPath(version: number): { host: string, path: string } {
        const result = {host: 'github.com', path: ''};
        const os = OperatingSystems.current();
        switch (os) {
            case OperatingSystem.Linux:
                result.path = version == 11
                    ? `/AdoptOpenJDK/openjdk11-binaries/releases/download/jdk-11.0.3%2B7/OpenJDK11U-jre_x64_linux_hotspot_11.0.3_7.tar.gz`
                    : `/AdoptOpenJDK/openjdk8-binaries/releases/download/jdk8u212-b04/OpenJDK8U-jre_x64_linux_hotspot_8u212b04.tar.gz`;
                return result;
            case OperatingSystem.MacOSX:
                result.path = version == 11
                    ? `/AdoptOpenJDK/openjdk11-binaries/releases/download/jdk-11.0.3%2B7/OpenJDK11U-jre_x64_mac_hotspot_11.0.3_7.tar.gz`
                    : `/AdoptOpenJDK/openjdk8-binaries/releases/download/jdk8u212-b04/OpenJDK8U-jre_x64_mac_hotspot_8u212b04.tar.gz`;
                return result;
            case OperatingSystem.Windows32:
            // use 32 bit java for 64 os because it uses less ram.
            case OperatingSystem.Windows64:
                result.path = version == 11
                    ? `/AdoptOpenJDK/openjdk11-binaries/releases/download/jdk-11.0.3%2B7/OpenJDK11U-jre_x86-32_windows_hotspot_11.0.3_7.zip`
                    : `/AdoptOpenJDK/openjdk8-binaries/releases/download/jdk8u212-b04/OpenJDK8U-jre_x86-32_windows_hotspot_8u212b04.zip`;
                return result;
        }
        throw new Error("Operating system not specified.");
    }

    async exists(path: string | null): Promise<boolean> {
        return path && await fs.pathExists(path);
    }
    
    async getSize(path : string | null) : Promise<number> {
        if(!path || !this.exists(path)) {
            return -1;
        }
        const stat = await fs.lstat(path);
        return stat.size;
    }

    async delete(path: string | null): Promise<boolean> {
        return path && await fs.remove(path);
    }

    async getBotDataFolder(): Promise<string> {
        const rspeerFolder = await this.getRsPeerFolder();
        const data = path.join(rspeerFolder, 'bot_data');
        await fs.ensureDir(data);
        return data;
    }

    async inBotDataFolder(path: string): Promise<boolean> {
        const folder = await this.getBotDataFolder();
        return folder.includes(path);
    }
}