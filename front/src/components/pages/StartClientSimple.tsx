import {Block, Button, Icon, Link, List, ListInput, Navbar, NavRight, Page, Popup, View} from "framework7-react";
import * as React from "react";
import {useEffect, useState} from "react";
import {getService} from "../../Bottle";
import {ClientLaunchConfig, ClientLaunchService} from "../../services/ClientLaunchService";
import {Client, Proxy, RemoteQuickStartLaunch, RemoteSimpleLaunch} from "../../models/QuickLaunch";
import {Launcher, RemoteLauncherService} from "../../services/RemoteLauncherService";
import {WebsocketService} from "../../services/WebsocketService";
import {AuthorizationService} from "../../services/AuthorizationService";

type Props = {
    path: string
    open: boolean
    onFinish: (index: number) => any,
    onError: (error: any) => any
    onLog: (log: any) => any
}

const launchService = getService<ClientLaunchService>('ClientLaunchService');
const remoteLauncher = getService<RemoteLauncherService>('RemoteLauncherService');
const authService = getService<AuthorizationService>('AuthorizationService');


export default ({open, onFinish, onError, onLog}: Props) => {

    const [error, setError] = useState('');
    const [count, setCount] = useState(1);
    const [ip, setIp] = useState('');
    const [port, setPort] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [launchers, setLaunchers] = useState({} as Launcher);
    const [selectedLauncher, setSelectedLauncher] = useState('');

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
        const selected = selectedLauncher || Object.keys(launchers)[0];
        const launcher = launchers[selected];
        if(!launcher) {
            return setError(`Unable to find selected launcher. ${selected}.`);
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
                await remoteLauncher.send(selectedLauncher || Object.keys(launchers)[0], simple);
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

    async function loadLaunchers() {
        const ws = getService<WebsocketService>('WebsocketService');
        let launchers = await remoteLauncher.getLaunchers();
        const us = Object.keys(launchers).find((key: string) => {
            const launcher = launchers[key];
            if (launcher.identifier === ws.getIdentifier()) {
                return key;
            }
            return null;
        });
        const result: any = {};
        if (us) {
            launchers[us].isMe = true;
            result[us] = launchers[us];
        }
        Object.keys(launchers).filter(s => s !== us).forEach(l => {
            result[l] = launchers[l];
        });
        
        setLaunchers(result);
    }

    useEffect(() => {
        if (!open) {
            return;
        }
        loadLaunchers();
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
                        value={selectedLauncher || Object.keys(launchers)[0]}
                        placeholder="Loading..."
                        onChange={(e) => {
                           setSelectedLauncher(e.target.value);
                        }}
                        info={"Which computer would you like to run this client on? You may select any of your computers that are running the RSPeer launcher."}

                    >
                        {Object.keys(launchers).map((key: string) => {
                            const launcher = launchers[key];
                            const title = launcher.isMe ? `${launcher.host} (This Launcher) (${launcher.ip})` : `${launcher.host} (${launcher.ip})`;
                            return <option value={key}>{title}</option>
                        })}
                    </ListInput>
                    <Block>
                        {!loading && <Button outline onClick={launch}>Launch {count} Client(s)</Button>}
                        {loading && <Button outline>Launching... Please Wait</Button>}
                        {error && <Block>
                            <p style={{color: '#ff6767'}}><strong>{error}</strong></p>
                        </Block>}
                    </Block>
                </List>
            </Page>
        </View>
    </Popup>
}
