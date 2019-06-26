import {Electron} from "./Electron";

const process = Electron.require('process');

export enum OperatingSystem {
    Windows64,
    Windows32,
    Linux,
    MacOSX
}

export class OperatingSystems {
    
    public static current() : OperatingSystem {
        const platform = process.platform;
        if(platform === 'darwin') {
            return OperatingSystem.MacOSX;
        }
        if(platform === 'linux' || platform === 'freebsd') {
            return OperatingSystem.Linux;
        }
        if(platform === 'win32') {
            return OperatingSystem.Windows32;
        }
        return OperatingSystem.Linux;
    }
}