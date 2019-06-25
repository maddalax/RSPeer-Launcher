import {Block, Button, Link, Navbar, NavRight, Page, Popup, View} from "framework7-react";
import * as React from "react";
import {useState} from "react";
import {getService} from "../../Bottle";
import {DatabaseService} from "../../services/DatabaseService";
import {FileService} from "../../services/FileService";

type Props = {
    path : string
    open : boolean
    onFinish : (cleared : boolean) => any
}

export default ({path, open, onFinish} : Props) => {
    
    const [loading, setLoading] = useState(false);
    
    async function clearJavaPath() {
        console.log('clearing.');
        setLoading(true);
        const db = getService<DatabaseService>('Database');
        await db.setConfig('javaPath', null);
        const file = getService<FileService>('FileService');
        await file.delete(await file.getJavaPath());
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
                    <p>Current path: <strong>{path}</strong></p>
                    {!loading && <Button raised outline onClick={clearJavaPath}>Set New Java Path</Button>}
                    {loading && <Button raised outline>Processing...</Button>}  
                </Block>
            </Page>
        </View>
    </Popup>
}
