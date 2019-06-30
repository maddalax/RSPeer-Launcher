import {Electron} from "../util/Electron";
import {FileService} from "./FileService";
import {DatabaseService} from "./DatabaseService";
const fs = Electron.require('fs-extra');
const path = Electron.require('path');
const execa = Electron.require('execa');

export class ExecService {
    
    private readonly fileService : FileService;
    private readonly database : DatabaseService;
    
    constructor(fileService: FileService, database : DatabaseService) {
        this.fileService = fileService;
        this.database = database;
    }

    async runJar(jarPath : string, vmArgs : string[] = [], appArgs : string[] = []) {
        const javaPath = await this.database.getConfig("javaPath");
        if(!javaPath) {
            throw new Error('The path to your java installation has not been configured, please run through the dependency check screen to download and setup Java.');
        }
        const bin = path.join(javaPath, 'bin');
        const files : string[] = await fs.readdir(bin);
        const executable = files.find(s => s.startsWith("java") && !s.includes("dll"));
        if(!executable) {
            throw new Error("Failed to find Java executable in " + bin);
        }
        const fullPath = path.join(bin, executable);
        const commands = [...vmArgs, '-jar', jarPath, ...appArgs].filter(s => s);
        return await execa(fullPath, commands, { detached: true });
    }
    
}