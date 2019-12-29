import {Block, Link, Navbar, NavRight, Page, Popup, View} from "framework7-react";
import * as React from "react";

type Props = {
    open : boolean,
    title : string,
    content : any,
    onFinish : () => any
}

export default ({open, content, title, onFinish} : Props) => {
    return <Popup id="contentPopup" opened={open} onPopupClosed={onFinish}>
        <View>
            <Page>
                <Navbar title={title}>
                    <NavRight>
                        <Link popupClose>Close</Link>
                    </NavRight>
                </Navbar>
                <Block>
                    {content}
                </Block>
            </Page>
        </View>
    </Popup>
}
