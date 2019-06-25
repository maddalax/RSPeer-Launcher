import {Electron} from "./Electron";

const process = Electron.require('process');
const os = Electron.require('os');

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
            const arch = os.arch();
            return arch === 'AMD64' ? OperatingSystem.Windows64 : OperatingSystem.Windows32;
        }
        return OperatingSystem.Linux;
    }
}