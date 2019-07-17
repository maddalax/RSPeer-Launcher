import {Electron} from "./Electron";

const https = Electron.require('follow-redirects').https;
const fs = Electron.require('fs-extra');

export class Http {

    static formatBytes(bytes : any, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    static async download(host : string, path : string, dest : string, onData? : (data : any) => any) {
        await fs.remove(dest);
        await fs.ensureFile(dest);
        const options = {
            hostname: host,
            path: path,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        };
        return new Promise((res, rej) => {
            let file = fs.createWriteStream(dest, {flags : 'a'});
            let interval : any = null;
            https.get(options, function(response : any) {
                const length = response.headers['content-length'];
                interval = setInterval(() => {
                    fs.stat(dest, function (err : any, stats : any) {
                        if(err) {
                            console.error(err);
                            return;
                        }
                        if(!stats) {
                            return;
                        }
                        onData && onData({
                            current : Http.formatBytes(stats.size), 
                            size : Http.formatBytes(length)
                        });
                    });
                }, 1000);
                if (response.statusCode !== 200) {
                    console.log(response.statusCode);
                    interval && clearInterval(interval);
                    return rej('Response status was ' + response.statusCode);
                }
                response.pipe(file);
                file.on('finish', function() {
                    interval && clearInterval(interval);
                    file.close(res);
                });
                file.on('error', function (err : any) {
                    interval && clearInterval(interval);
                    console.log(err);
                })
            }).on('error', function(err : any) {
                console.error(err);
                interval && clearInterval(interval);
                fs.unlink(dest);
                rej(err);
            }); 
        });
    }
    
}