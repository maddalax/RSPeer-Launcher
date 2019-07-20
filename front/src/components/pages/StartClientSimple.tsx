import {
    Block,
    Button,
    Link,
    List,
    ListInput,
    Navbar,
    NavRight,
    Page,
    Popup,
    View,
} from "framework7-react";
import * as React from "react";
import {useEffect, useState} from "react";
import {getService} from "../../Bottle";
import {ClientLaunchConfig, ClientLaunchService} from "../../services/ClientLaunchService";
import {Client, Proxy, RemoteQuickStartLaunch} from "../../models/QuickLaunch";
import {NsqService} from "../../services/WebsocketService";
import {AuthorizationService} from "../../services/AuthorizationService";
import {EventBus} from "../../event/EventBus";
import {LauncherInfoService} from "../../services/LauncherInfoService";
import {Launcher} from "../../models/Launcher";

type Props = {
    path: string
    open: boolean
    onFinish: (index: number) => any,
    onError: (error: any) => any
    onLog: (log: any) => any,
    onBotPanelOpen : () => any;
}

const launchService = getService<ClientLaunchService>('ClientLaunchService');
const authService = getService<AuthorizationService>('AuthorizationService');
const launcherInfoService = getService<LauncherInfoService>('LauncherInfoService');
const nsq = getService<NsqService>('NsqService');

export default ({open, onFinish, onError, onLog, onBotPanelOpen}: Props) => {

    const [error, setError] = useState('');
    const [count, setCount] = useState(1);
    const [ip, setIp] = useState('');
    const [port, setPort] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [launchers, setLaunchers] = useState([] as Launcher[]);
    const [selectedLauncher, setSelectedLauncher] = useState(null);

    const buildQuickLaunch = () => {
        const clients: Client[] = [];
        for (let i = 0; i < count; i++) {
            const proxy: Proxy | null = ip && port ? {ip, port: parseInt(port), username, password} : null;
            const client: Client = {};
            if(proxy) {
                client.proxy = proxy;
            }
            clients.push(client);
        }
        return {clients};
    };

    const launch = async () => {
        setError('');
        setLoading(true);
        const qs = buildQuickLaunch();
        const config: ClientLaunchConfig = {
            quickLaunch: qs,
            count : qs.clients.length,
            onError: (err) => {
                setError(err.toString());
                onError(err)
            },
            onFinish: (index: number) => {
                setLoading(false);
                onFinish(index);
            },
            onLog
        };
        const launcher = selectedLauncher != null ? launchers.find(w => w.identifier === selectedLauncher) : launchers[0];
        if(!launcher) {
            return setError(`Unable to find selected launcher. ${launcher}.`);
        }
        if(launcher.isMe) {
            launchService.launch(config);
        }
        else {
            const session = await authService.getSession();
            if(!session) {
                return onError('Failed to load user, cannot remote start.');
            }
            const simple : RemoteQuickStartLaunch = {
                qs : config.quickLaunch,
                session : session,
                type : 'start:client',
                sleep : 10
            };
            try {
                await nsq.dispatch({type : 'start:client', identifier : launcher.identifier, payload : simple});
            } catch(ex) {
                onError(ex);
            }
            setTimeout(() => {
                onLog(`Successfully send open command to ${launcher.host} (${launcher.ip}). Client should open shortly on that machine.`);
                setLoading(false);
                onFinish(0);
            }, 1000)
        }
    };

    async function discoverLaunchers() {
        await nsq.dispatch({
            type : 'launcher:discover'
        });
    }

    useEffect(() => {
        if (!open) {
            return;
        }
        setLaunchers([]);
        EventBus.getInstance().register('launcher_discovered', (launcher : Launcher) => {
            launcher.isMe = launcherInfoService.isMe(launcher);
            setLaunchers(prev => {
                if(prev.find(w => w.identifier === launcher.identifier)) {
                    return prev;
                }
                prev = prev.concat([launcher]);
                return prev;
            });
        });
        discoverLaunchers();
    }, [open]);

    return <Popup id="startClientSimple" tabletFullscreen={true} opened={open} onPopupClosed={() => {
        onFinish(0);
    }}>
        <View>
            <Page>
                <Navbar title="Start Client">
                    <NavRight>
                        <Link popupClose>Close</Link>
                    </NavRight>
                </Navbar>
                <List inset>
                    <ListInput
                        type="text"
                        value={ip}
                        onChange={(e) => setIp(e.target.value)}
                        label={"Proxy Ip Address (Optional)"}
                        placeholder="127.0.0.1"
                        info={"Input this if you would like to run your client with a proxy."}
                        clearButton
                    />
                    <ListInput
                        type="number"
                        value={port}
                        onChange={(e) => setPort(e.target.value)}
                        label={"Proxy Port (Optional)"}
                        placeholder={"4689"}
                        info={"The port that your proxy uses."}
                        clearButton
                    />
                    <ListInput
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        label={"Proxy Username (Optional)"}
                        placeholder="username"
                        info={"If your proxy requires authorization, enter that here."}
                        clearButton
                    />
                    <ListInput
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        label={"Proxy Password (Optional)"}
                        placeholder="password"
                        info={"If your proxy requires authorization, enter that here."}
                        clearButton
                    />
                    <ListInput
                        type="number"
                        label={"Number Of Clients To Start"}
                        min={1}
                        value={count}
                        onChange={(e: any) => setCount(e.target.value)}
                        info={"Note: All clients opened from this will use the same proxy if you specified it above."}
                        clearButton
                    />
                    <ListInput
                        label="Computer"
                        type="select"
                        value={selectedLauncher || launchers[0]}
                        placeholder="Loading..."
                        onChange={(e) => setSelectedLauncher(e.target.value)}
                        info={"Which computer would you like to run this client on? You may select any of your computers that are running the RSPeer launcher."}

                    >
                        {launchers.sort(w => w.isMe ? 1 : 0).map((launcher: Launcher) => {
                            const title = launcher.isMe ? `${launcher.host} (This Launcher) (${launcher.ip})` : `${launcher.host} (${launcher.ip})`;
                            return <option value={launcher.identifier}>{title}</option>
                        })}
                    </ListInput>
                    <Block>
                        {!loading && <Button outline onClick={launch}>Launch {count} Client(s)</Button>}
                        {loading && <Button outline>Launching... Please Wait</Button>}
                        {error && <Block>
                            <p style={{color: '#ff6767'}}><strong>{error}</strong></p>
                        </Block>}
                        <Block>
                            <p>Looking for more advanced client launching, such as the ability to specify script, runescape accounts, and proxies? 
                                Check out the <Link href={"#"} onClick={() => {
                                    onFinish(0);
                                    onBotPanelOpen();
                                }}>Bot Management Panel.</Link></p>
                        </Block>
                    </Block>
                </List>
            </Page>
        </View>
    </Popup>
}
