export class Electron {
    static require(module : string) {
        const w : any = window;
        return w.remote.require(module);
    }
}