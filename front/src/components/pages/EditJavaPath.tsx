import {Block, Button, Link, Navbar, NavRight, Page, Popup, View} from "framework7-react";
import * as React from "react";
import {useState} from "react";
import {getService} from "../../Bottle";
import {DatabaseService} from "../../services/DatabaseService";
import {FileService} from "../../services/FileService";
import {EventBus} from "../../event/EventBus";
const path = require('path');

type Props = {
    javaPath : string
    open : boolean
    onFinish : (cleared : boolean) => any
}

export default ({javaPath, open, onFinish} : Props) => {
    
    const [loading, setLoading] = useState(false);
    
    async function clearJavaPath() {
        try {
            setLoading(true);
            const db = getService<DatabaseService>('Database');
            const javaPath = await db.getConfig('javaPath');
            await db.setConfig('javaPath', null);
            const file = getService<FileService>('FileService');
            const botDataFolder = await file.getBotDataFolder();
            if (file.inBotDataFolder(javaPath)) {
                const root = path.join(javaPath, '../', '../');
                await file.delete(root);
                await file.delete(path.join(botDataFolder, '__MACOSX'))
            }
        } catch (e) {
            EventBus.getInstance().dispatch('on_error', `Failed to delete java path, reason: ${e.toString()}.`);
        }
        setTimeout(() => {
            setLoading(false);
            onFinish(true);
        }, 500);
    }
    
    return <Popup id="editJavaPath" opened={open} onPopupClosed={() => {
        onFinish(false);
    }}>
        <View>
            <Page>
                <Navbar title="Edit Specified Java Path">
                    <NavRight>
                        <Link popupClose>Close</Link>
                    </NavRight>
                </Navbar>
                <Block>
                    <p>You can clear and set a new Java path for the launcher to use. To do so, click the button below. Once you
                        clear your Java path, you will have the option of downloading the bundled java path or selecting your own.</p>
                    <p>Current path: <strong>{javaPath}</strong></p>
                    {!loading && <Button raised outline onClick={clearJavaPath}>Set New Java Path</Button>}
                    {loading && <Button raised outline>Processing...</Button>}  
                </Block>
            </Page>
        </View>
    </Popup>
}
