import React, {useEffect, useState} from 'react';
import {Button, BlockTitle, Block, Preloader, ListItem, List
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
    const [downloadPath, setDownloadPath] = useState('');
    const [selectedJava, setSelectedJava] = useState('Java 11');
    const fileService = getService<FileService>('FileService');
    const db = getService<DatabaseService>('Database');
    
    const getZipFile = async () : Promise<string | null> => {
        const botData = await fileService.getBotDataFolder();
        const files = await fs.readdir(botData);
        const zip = files.find((s : string) => s.includes('OpenJDK') || s.endsWith('.zip') || s.endsWith('.tar.gz'));
        if(!zip) {
            return null;
        }
        return path.join(botData, zip);
    };
    
    const convertSelectedJavaToVersion = () => {
        switch (selectedJava) {
            case 'Java 8': return 8;
            case 'Java 11':
            default: return 11;
        }
    };
    
    async function downloadJava() {
        const zip = await getZipFile();
        const size = await fileService.getSize(zip);
        if(size > 1000) {
            setStartingDownload(false);
            return;
        }
        setStartingDownload(false);
        setStartedDownload(true);
        await fileService.delete(zip);
        const botData = await fileService.getBotDataFolder();
        const version = convertSelectedJavaToVersion();
        const downloadPath = await fileService.getJavaDownloadPath(version);
        setDownloadPath(downloadPath.path);
        const split = downloadPath.path.split("/");
        const dest = path.join(botData, split[split.length - 1]);
        await Http.download(downloadPath.host, downloadPath.path, dest, false, (data: any) => {
            setDownloadSize(data);
        });
    }

    async function extractJava() {
        setStartingDownload(false);
        const botData = await fileService.getBotDataFolder();
        const zip = await getZipFile();
        if(!zip) {
            return setError(`Failed to find java zip/tar.gz file after download.`)
        }
        await fileService.unzip(zip, botData, (data) => {
            setExtracting(data);
        });
        setExtracting('');
        
        await db.setConfig('javaPath', zip);
        await fileService.delete(zip);
        await fileService.delete(path.join(await fileService.getBotDataFolder(), '__MACOSX'));
        setTimeout(() => {
            reset();
            checkDependencies();
        }, 500)
    }

    async function checkDependencies() {
        
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
                await db.setConfig('javaPath', null);
            }

        }

        if (!hasJava) {
            const javaPath = await fileService.getJavaPath();
            if (await fileService.exists(javaPath)) {
                await db.setConfig('javaPath', javaPath);
                hasJava = true;
                setTimeout(onFinish, 1500);
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
        if(selectedJava === 'Custom Java') {
            return await specifyCustomJava();
        }
        startDownload();
        try {
            await downloadJava();
            await extractJava();
        } catch (e) {
            console.error(e);
            setStartingDownload(false);
            setError(e.toString());
            return;
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
        try {
            startDownload();
            await fs.remove(await fileService.getBotDataFolder());
            await checkDependencies();
        } catch(e) {
            setError(e.toString());
        }
    }

    useEffect(() => {
        checkDependencies();
    }, []);
    
    return <React.Fragment>
        <BlockTitle>Checking Dependencies.</BlockTitle>
        <Block>
            {missingJava && <div>
                <p>Java installation has <strong>not</strong> been specified, please click below to download and install RSPeer's recommended Java Runtime.</p>
                <Block>
                    <List>
                        <ListItem radio after={"Recommended"} title="AdoptOpenJDK Java 11" name="java-11-radio" value="Java 11" checked={selectedJava === 'Java 11'} onChange={e => setSelectedJava(e.target.value)}/>
                        <ListItem radio title="AdoptOpenJDK Java 8" name="java-8-radio" value="Java 8" checked={selectedJava === 'Java 8'} onChange={e => setSelectedJava(e.target.value)}/>
                        <ListItem radio title="Choose Your Own" name="custom-java-radio" value="Custom Java" checked={selectedJava === 'Custom Java'} onChange={e => setSelectedJava(e.target.value)}/>
                    </List>
                    <Button outline color="green" onClick={startDependenciesDownload}>Continue Installation ({selectedJava})</Button>
                </Block>
            </div>}
            {startingDownload && !error && <div>
                <Preloader color="blue"/> Starting Dependency Check
            </div>}
            {!extracting && startedDownload && !downloadSize.current && <div>
                <p>Starting Download: <strong>{downloadPath}</strong></p>
            </div>}
            {!extracting && downloadSize.current && <div>
                <p><Preloader color="blue"/> Downloading {downloadPath}: <strong>{downloadSize.current} / {downloadSize.size}</strong></p>
            </div>}
            {extracting && <p>Extracting: <strong>{extracting}</strong></p>}
            {error && <div>
                <p style={{color : '#ff6767'}}>An error has occured: <strong>{error}</strong></p>
                <Block><Button outline onClick={restart}>Click To Restart Downloading Dependencies.</Button></Block>
            </div>}
        </Block>
    </React.Fragment>
}
