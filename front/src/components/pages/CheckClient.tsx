import * as React from "react";
import {useEffect, useState} from "react";
import {getService} from "../../Bottle";
import {ClientDependencyService} from "../../services/ClientDependencyService";
import {Icon, List, ListItem} from "framework7-react";
import {FileService} from "../../services/FileService";
import {EventBus} from "../../event/EventBus";
import {Game, GameFormatted} from "../../models/Game";

export type CheckClientProps = {
    onFinish : (path : string) => any
    game : Game
}

export function CheckClient({onFinish, game} : CheckClientProps) {
    
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState({current : '', size : ''});
    const [error, setError] = useState('');
    const service = getService<ClientDependencyService>('ClientDependencyService');
    const fileService = getService<FileService>('FileService');
    
    async function restartDownload() {
        setDownloading(true);
        setError('');
        setProgress({current : '', size : ''});
        await fileService.delete(await service.getLatestJarPath());
        await downloadLatest(true);
    }
    
    async function downloadLatest(ignoreDownloadCheck : boolean = false) {
        if(!ignoreDownloadCheck && downloading) {
            return;
        }
        if(await service.hasLatestJar(game)) {
            onFinish(await service.getLatestJarPath());
            return;
        }
        setDownloading(true);
        try {
            await service.downloadLatest(game, (data : any) => setProgress(data));
        } catch(ex) {
            setError(ex.error || JSON.stringify(ex));
            return;
        }
        if(!await service.hasLatestJar(game)) {
           setError('Failed to find latest client after download. Something went wrong.')
           return;
        }

        try {
            await service.saveApiJar(game);
        } catch (e) {
            EventBus.getInstance().dispatch('on_error', e.toString());
        }
        onFinish(await service.getLatestJarPath());
    }
    
    useEffect(() => {
       downloadLatest();
    });
    
    const current = progress.current ? `Downloading Client: ${progress.current} / ${progress.size}` : 'Starting Download...';
    return (<React.Fragment>
        <List>
            {downloading && !error && <ListItem header={`Downloading Latest ${GameFormatted(game)} RSPeer Client`} link="#" title={current}>
                <Icon slot="media" f7="bolt"/>
            </ListItem>}
            {error && <ListItem link="#" header="An error has occured downloading the latest RSPeer client. Click to restart download." title={error} after="Restart Download" onClick={restartDownload}>
                <Icon slot="media" f7="alert"/>
            </ListItem>}
        </List>
    </React.Fragment>)
}
