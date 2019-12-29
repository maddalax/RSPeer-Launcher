import {Electron} from "./Electron";

const yauzl = Electron.require('yauzl');
const fs = Electron.require("fs-extra");
const path = Electron.require('path');
const tar = Electron.require('tar');

export async function unzip(path: string, dest : string, onData: (data: any) => any): Promise<any> {
    const folder = await getDestinationFolder(dest);
    return new Promise((resolve, reject) => {
        if(path.endsWith('.tar.gz')) {
          handleTar(path, folder, onData).then(resolve).catch(reject);
        }
        else {
            yauzl.open(path, {lazyEntries: true}, (err: any, zipFile: any) => {
                if(err) {
                    return reject(err);
                }
                handleZipFile(err, zipFile, dest, onData).then(() => {
                    resolve();
                }).catch((err) => {
                    reject(err);
                })
            });   
        }
    });
}

function handleTar(path : string, workingDir : string, onData : (data : any) => any) {
    return new Promise(res => {
        fs.createReadStream(path).pipe(
            tar.x({
                C: workingDir
            })
        ).on('entry', (entry : any) => {
            onData(entry.path);
        }).on('close', () => {
            console.log(workingDir);
            fs.chmodSync(workingDir, "755");
            res();
        });
    })
}

function handleZipFile(err: any, zipfile: any, dest : string, onData: (data: any) => any) {
    return new Promise((resolve, reject) => {
        if (err) {
            reject(err);
            return;
        }

        if(!dest) {
            throw new Error("Destination is required.")
        }

        zipfile.on("close", function () {
            resolve();
        });

        zipfile.on('error', function (err: any) {
            reject(err);
        });

        zipfile.on("entry", async function (entry: any) {
            try {
                const destination = path.join(dest, entry.fileName);
                if (destination.toString().endsWith(path.sep)) {
                    onData(destination);
                    await fs.ensureDir(destination);
                    zipfile.readEntry()
                } else {
                    await fs.ensureFile(destination);
                    const writeStream = fs.createWriteStream(destination, {flags: 'w'});
                    zipfile.openReadStream(entry, function (err: any, stream: any) {
                        if (err) {
                            return reject(err);
                        }
                        onData(destination);
                        writeStream.on("close", function () {
                            fs.chmodSync(destination, "755");
                            zipfile.readEntry();
                        });
                        stream.pipe(writeStream);
                    });
                }
            } catch (e) {
                console.error(e);
                reject(e);
            }
        });
        zipfile.readEntry();
    })
}

const getDestinationFolder = async (dest : string) => {
    if(!fs.exists(dest)) {
        await fs.ensureDir(dest);
        return dest;
    }
    const stat = await fs.lstat(dest);
    if(stat.isDirectory()) {
        return dest;
    }
    return path.join(dest, '../');
};