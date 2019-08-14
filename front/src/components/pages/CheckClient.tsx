import * as React from "react";
import {useEffect, useState} from "react";
import {getService} from "../../Bottle";
import {ClientDependencyService} from "../../services/ClientDependencyService";
import {Icon, List, ListItem} from "framework7-react";
import {FileService} from "../../services/FileService";
import {EventBus} from "../../event/EventBus";
import {Game, GameFormatted} from "../../models/Game";
import {sleep} from "../../util/Util";

export type CheckClientProps = {
    onFinish : (path : string) => any
    game : Game,
    isInterval : boolean
}

export function CheckClient({onFinish, game, isInterval} : CheckClientProps) {
    
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState({current : '', size : ''});
    const [error, setError] = useState('');
    const service = getService<ClientDependencyService>('ClientDependencyService');
    const fileService = getService<FileService>('FileService');
    
    async function restartDownload() {
        try {
            setDownloading(true);
            setError('');
            await sleep(1500);
            setProgress({current: '', size: ''});
            await fileService.delete(await service.getLatestJarPath(game));
            await downloadLatest(true);
        } catch (e) {
            setError(e.toString());
        }
    }
    
    async function downloadLatest(ignoreDownloadCheck : boolean = false) {
        if(!ignoreDownloadCheck && downloading) {
            return;
        }
        
        if(await service.hasLatestJar(game)) {
            onFinish(await service.getLatestJarPath(game));
            return;
        }
        
        setDownloading(true);
        
        if(await service.downloadLatest(game, (data : any) => setProgress(data))) {
            onFinish(await service.getLatestJarPath(game));
            return;
        }
        
        if(!await service.hasLatestJar(game)) {
           setError('Failed to find latest client after download. Something went wrong.');
           return;
        }

        await service.saveApiJar(game);
        onFinish(await service.getLatestJarPath(game));
    }
    
    async function tryDownloadLatest() {
        try {
            await downloadLatest();
        } catch (e) {
            // If it is the interval check, do not show error to user since it happens every 5 seconds.
            if(!isInterval) {
                setError(e.toString());
            }
        }
    }
    
    function onConnectionEstablished() {
        console.log('Established connection.');
        if(error) {
            setError('');
            restartDownload();
        }
    }

    function onConnectionLost(err : any) {
        console.log('Lost connection.');
        if(error) {
            setError(err.toString());
        }
    }
    
    useEffect(() => {
        EventBus.getInstance().register("server_connection_established", onConnectionEstablished);
        EventBus.getInstance().register("server_connection_lost", onConnectionLost);

        tryDownloadLatest();
        return () => {
            EventBus.getInstance().unregister("server_connection_established", onConnectionEstablished);
            EventBus.getInstance().unregister("server_connection_established", onConnectionLost);

        }
    });
    
    const errorTitle : any = <span style={{color: '#ff6767'}}>{error}</span>;
    const current = progress.current ? `Downloading Client: ${progress.current} / ${progress.size}` : 'Starting Download...';
    return (<React.Fragment>
        <List>
            {downloading && !error && <ListItem header={`Downloading Latest ${GameFormatted(game)} RSPeer Client`} link="#" title={current}>
                <Icon slot="media" f7="bolt"/>
            </ListItem>}
            {error && <ListItem link="#" header={`An error has retrieving the latest ${GameFormatted(game)} RSPeer Client. Click to restart download.`} title={errorTitle} after="Restart Download" onClick={restartDownload}>
                <Icon slot="media" f7="alert"/>
            </ListItem>}
        </List>
    </React.Fragment>)
}
