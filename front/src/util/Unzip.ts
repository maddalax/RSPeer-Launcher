import {Electron} from "./Electron";

const yauzl = Electron.require('yauzl');
const fs = Electron.require("fs-extra");
const path = Electron.require('path');

export async function unzip(path: string, dest : string, onData: (data: any) => any): Promise<any> {
    return new Promise((resolve, reject) => {
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
    });
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