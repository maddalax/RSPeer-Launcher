import React, {useEffect, useState} from 'react';
import {Button, BlockTitle, Block, Preloader
} from 'framework7-react';
import {getService} from "../../Bottle";
import {FileService} from "../../services/FileService";
import {Http} from "../../util/Http";
import {Electron} from "../../util/Electron";
import {DatabaseService} from "../../services/DatabaseService";
const path = Electron.require('path');
const fs = Electron.require('fs-extra');
const {dialog} = Electron.require('electron');


export type CheckDependenciesProps = {
    onFinish : () => any,
    isQuickLaunch : boolean
}

export function CheckJava({onFinish, isQuickLaunch} : CheckDependenciesProps) {

    const [missingJava, setMissingJava] = useState(false);
    const [startingDownload, setStartingDownload] = useState(false);
    const [extracting, setExtracting] = useState('');
    const [startedDownload, setStartedDownload] = useState(false);
    const [error, setError] = useState('');
    const [downloadSize, setDownloadSize] = useState({current : '', size : ''});
    const [javaFileName, setJavaFileName] = useState('');
    const fileService = getService<FileService>('FileService');
    const db = getService<DatabaseService>('Database');
    
    async function getJavaFileZip() {
        const botData = await fileService.getBotDataFolder();
        const javaFileName = `${await fileService.getJavaFolderName()}.zip`;
        return path.join(botData, javaFileName);
    }
    
    async function downloadJava() {
        if(await fileService.exists(await getJavaFileZip())) {
            return;
        }
        setStartedDownload(true);
        const botData = await fileService.getBotDataFolder();
        const javaFileName = await fileService.getJavaFolderName();
        setJavaFileName(javaFileName);
        try {
            const dest = path.join(botData, 'jre-8-mac64.zip');
            await Http.download('raw.githubusercontent.com', `/MaddoxDevelopment/RSPeer.BundledJava/master/${javaFileName}.zip`, dest, (data: any) => {
                setDownloadSize(data);
            }).catch((ex) => {
                console.log(ex);
            })
        } catch (e) {
            console.log(e);
        }
    };
    
    async function extractJava() {
        const botData = await fileService.getBotDataFolder();
        const javaFileName = `${await fileService.getJavaFolderName()}`;
        const extractedPath = path.join(botData, javaFileName);
        const zip = `${extractedPath}.zip`;
        try {
            await fileService.unzip(zip, botData, (data) => {
                setExtracting(data);
            });
        } catch(ex) {
            setError(ex.toString());
            return;
        }
        setExtracting('');
        await db.setConfig('javaPath', await fileService.getJavaPath());
        await fs.remove(zip);
        setTimeout(() => {
            reset();
            checkDependencies();
        }, 500)
    }
    
    async function checkDependencies() {
        
        console.log('chdcking dept')
        
        if (startingDownload) {
            return;
        }

        const definedJavaPath = await db.getConfig('javaPath');
        
        let hasJava = false;

        if (definedJavaPath) {

            hasJava = await fileService.exists(definedJavaPath);

            if(hasJava) {
                onFinish();
                return;
            }

            if (!hasJava) {
                console.log('Selected java path does not exist anymore. Clearing.');
                await db.setConfig('javaPath', null);
            }

        }

        if (!hasJava) {
            const javaPath = await fileService.getJavaPath();
            if (await fileService.exists(javaPath)) {
                console.log('here lol', javaPath);
                await db.setConfig('javaPath', javaPath);
                hasJava = true;
                const test = await db.getConfig('javaPath');
                console.log('test', test);
                setTimeout(onFinish, 3000);
                return;
            }
        }

        // Auto download if quick launch.
        if (!hasJava && isQuickLaunch) {
            await startDependenciesDownload();
            return;
        }

        if (!hasJava) {
            setMissingJava(true);
        }

    }
    
    async function startDependenciesDownload() {
        if(startedDownload) {
            return;
        }
        startDownload();
        try {
            await downloadJava();
            await extractJava();
        } catch (e) {
            console.log(e);
        }
        reset();
    }
    
    async function specifyCustomJava() {
        const getJavaPath = new Promise(res => {
            dialog.showOpenDialog({
                title : 'Select Your Java Runtime Environment Folder. Chosen folder must contain /bin at the first level.',
                message : 'Select Your Java Runtime Environment Folder. Chosen folder must contain /bin at the first level.',
                properties: ['openDirectory']
            }, async (files : string[]) => {
                if(!files || files.length === 0) {
                    return res(null);
                }
                const file = files[0];
                const dir : string[] = await fs.readdir(file);
                if(!dir.includes('bin')) {
                    dialog.showErrorBox('Invalid Java Runtime Path', `Did not find "bin" folder in selected folder.\nFound: ${dir.join(', ')}`)
                    return res(null);
                }
                return res(file);
            });
        });
        const path = await getJavaPath;
        await db.setConfig('javaPath', path);
        setTimeout(() => {
            reset();
            checkDependencies();
        }, 500);
    }
    
    function reset() {
        setStartingDownload(false);
        setStartedDownload(false);
        setError('');
        setMissingJava(false);
        setDownloadSize({current : '', size : ''});
    }
    
    function startDownload() {
        setStartingDownload(true);
        setStartedDownload(false);
        setError('');
        setMissingJava(false);
        setDownloadSize({current : '', size : ''});
    }
    
    async function restart() {
        await fs.remove(await fileService.getBotDataFolder());
        startDownload();
        await checkDependencies();
    }
    
    useEffect(() => {
        checkDependencies();
    }, []);
    
    return <React.Fragment>
        <BlockTitle>Checking Dependencies.</BlockTitle>
        <Block>
            {missingJava && <div>
                <p>Java installation has <strong>not</strong> been specified, please click below to download and install RSPeer's recommended Java JRE.
                    If you would like to specify your own Java Runtime Environment, click <a href={"#"} onClick={specifyCustomJava}>here.</a></p>
                <Block><Button outline onClick={startDependenciesDownload}>Click To Install Dependencies Automatically</Button></Block>
            </div>}
            {!extracting && startedDownload && !downloadSize.current && <div>
                <p>Starting Download: <strong>{javaFileName}</strong></p>
            </div>}
            {!extracting && downloadSize.current && <div>
                <p><Preloader color="blue"/> Downloading {javaFileName}: <strong>{downloadSize.current} / {downloadSize.size}</strong></p>
            </div>}
            {extracting && <p>Extracting: <strong>{extracting}</strong></p>}
            {error && <div>
                <p style={{color : '#ff6767'}}>An error has occured: <strong>{error}</strong></p>
                <Block><Button outline onClick={restart}>Click To Restart Downloading Dependencies.</Button></Block>
            </div>}
        </Block>
    </React.Fragment>
}
