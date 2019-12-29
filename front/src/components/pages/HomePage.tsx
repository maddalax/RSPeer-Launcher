import React from 'react';
import {
    Block,
    BlockTitle,
    Button,
    Col,
    Icon,
    List,
    ListItem,
    Navbar,
    NavTitle,
    Page,
    Row,
    Toolbar
} from 'framework7-react';
import {getService} from "../../Bottle";
import {AuthorizationService} from "../../services/AuthorizationService";
import {RouterAccessor} from "../../accessors/RouterAccessor";
import {CheckJava} from "./CheckJava";
import {DatabaseService} from "../../services/DatabaseService";
import EditJavaPath from "./EditJavaPath";
import StartClientSimple from "./StartClientSimple";
import ContentPopup from "./ContentPopup";
import {QuickLaunchArgService} from "../../services/QuickLaunchArgService";
import {QuickLaunch, QuickLaunchCheckResult, QuickLaunchParseResult} from "../../models/QuickLaunch";
import {ClientLaunchService} from "../../services/ClientLaunchService";
import Websocket from './Websocket';
import {EventBus} from "../../event/EventBus";
import {Electron} from "../../util/Electron";
import {formatDate, jsonClone, sleep} from "../../util/Util";
import {isDev, isStaging, LauncherVersion} from "../../Config";
import {FileService} from "../../services/FileService";
import {isApiError} from "../../util/ErrorUtil";

const {shell} = Electron.require('electron');
const path = Electron.require('path');

type State = {
    user: any,
    javaPath: string,
    contentPopup: {
        showing: boolean,
        title: string,
        content: any
    }
    quickLaunch : QuickLaunch | null,
    clientPath: string,
    openClientSimple: boolean,
    openClientAdvanced: boolean,
    clearingJavaPath: boolean,
    checkingJavaDependency: boolean
    executingQuickLaunch : boolean,
    initializeMessage: string,
    isIntervalCheck : boolean,
    failedLogin : boolean,
    errorLogs: string[]
    logs: string[]
}

export default class HomePage extends React.Component<any, State> {

    private clientCheckIntervals : any[];

    constructor(props: any) {
        super(props);
        this.clientCheckIntervals = [];
        this.state = {
            user: null,
            javaPath: '',
            clientPath: '',
            openClientSimple: false,
            openClientAdvanced: false,
            clearingJavaPath: false,
            initializeMessage: 'Please wait...',
            executingQuickLaunch : false,
            checkingJavaDependency: false,
            isIntervalCheck : false,
            failedLogin : false,
            quickLaunch : null,
            errorLogs: [],
            logs: [],
            contentPopup: {
                showing: false,
                title: '',
                content: ''
            }
        }
    }

    private onErrorRecieved = (err : any) => this.pushError(err);
    private onLogRecieved = (log : any) => this.pushLog(log);

    async componentDidMount() {
        EventBus.getInstance().register("on_error", this.onErrorRecieved);
        EventBus.getInstance().register("on_log", this.onLogRecieved);
        const router = getService<RouterAccessor>('Router');
        if (this.$f7router) {
            router.set(this.$f7router);
        }
        const result = await this.checkQuickLaunch();
        // If quick launch should have logged in but failed, do not re-direct to login, they will not see the errors otherwise.
        if (result.shouldLogin && result.failedLogin) {
            this.setState({failedLogin : true});
            return;
        }
        this.initialize(router);
    }

    async initialize(router : any) {
        let user;
        let errored;
        try {
            const auth = getService<AuthorizationService>('AuthorizationService');
            user = await auth.getUser();
        } catch (e) {
            errored = true;
            this.pushError(e);
        }

        if(errored && !user) {
            this.pushError("Trying initialization again in 10 seconds.");
            await sleep(10000);
            await this.initialize(router);
            return;
        }

        if (!user) {
            router.get().navigate('/login/');
            return;
        }

        this.setState({errorLogs : []});
        this.setState({user, checkingJavaDependency : true, initializeMessage : ''});
    }

    componentWillUnmount(): void {
        EventBus.getInstance().unregister("on_error", this.onErrorRecieved);
        EventBus.getInstance().unregister("on_log", this.onLogRecieved);
        this.clientCheckIntervals.forEach(c => clearInterval(c));
    }

    async componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<State>, snapshot?: any) {
        if(this.state.javaPath && this.state.executingQuickLaunch && this.state.quickLaunch) {
            const qs = jsonClone(this.state.quickLaunch);
            this.setState({executingQuickLaunch : false, quickLaunch : null}, async () => {
                const clientLaunchService : ClientLaunchService = getService<ClientLaunchService>('ClientLaunchService');
                await clientLaunchService.launch({
                    quickLaunch : qs,
                    onLog : this.pushLog,
                    onError : this.pushError,
                });
            });
        }
    }

    async checkQuickLaunch(): Promise<QuickLaunchCheckResult> {
        const check: QuickLaunchCheckResult = {shouldLogin: false, failedLogin: false};
        const service = getService<QuickLaunchArgService>('QuickLaunchArgService');
        if (!service.hasQuickLaunchArgs()) {
            return check;
        }
        this.setState({initializeMessage: 'Checking quick launch arguments.'});
        const result: QuickLaunchParseResult = await service.build();
        if (result.noArgs) {
            this.setState({initializeMessage: 'No quick launch arguments found, initializing...'});
            return check;
        }
        result.logs.map(l => this.pushLog(l));
        if (result.config == null) {
            result.errors.map(l => this.pushError(l));
            return check;
        }
        if (await service.shouldLogin(result)) {
            check.shouldLogin = true;
            const message = `Attempting to login to RSPeer with email ${result.config.rspeerEmail}.`;
            this.setState({initializeMessage: message});
            this.pushLog(message);
            try {
                await service.login(result);
            } catch (e) {
                check.failedLogin = true;
                const error = `Failed to login to RSPeer. ${e.error || JSON.stringify(e)}`;
                this.setState({initializeMessage: error});
                this.pushError(error, false);
                return check;
            }
        }
        this.setState({initializeMessage: 'Attempting to start clients using specified quick launch configuration.'});
        this.pushLog('Attempting to start clients using specified quick launch configuration.');
        this.setState({executingQuickLaunch : true, quickLaunch : result.config});
        return check;
    }

    onFinishPathEdit = (cleared: boolean) => {
        this.setState({clearingJavaPath: false});
        if (cleared) {
            this.setState({checkingJavaDependency: true, javaPath: ''});
        }
    };

    setConfig = async () => {
        const db = await getService<DatabaseService>('Database');
        const path = await db.getConfig('javaPath');
        this.setState({javaPath : path || ''});
    };

    pushError = (err: any, sentry : boolean = true) => {
        sentry && this.sentryCaptureError(err);
        this.setState(prev => {
            const error = err.toString();
            prev.errorLogs.unshift(`${formatDate(Date.now() as any, true)} - ${error}`);
            if (prev.errorLogs.length > 100) {
                prev.errorLogs.splice(prev.errorLogs.length - 1, 1);
            }
            return prev;
        })
    };

    sentryCaptureError = (err : any) => {
      if(isApiError(err)) {
          return;
      }
      console.error("Capturing with sentry.", err);
    };

    pushLog = (log: string) => {
        this.setState(prev => {
            const formatted = typeof log === "object" ? JSON.stringify(log) : log.toString();
            prev.logs.unshift(`${formatDate(Date.now() as any, true)} - ${formatted}`);
            if (prev.logs.length > 100) {
                prev.logs.splice(prev.logs.length - 1, 1);
            }
            return prev;
        })
    };

    toggleContentPopup({title, content}: { title: string, content: any } = {title: '', content: ''}) {
        this.setState(prev => {
            prev.contentPopup.showing = !prev.contentPopup.showing;
            prev.contentPopup.title = title;
            prev.contentPopup.content = content;
            return prev;
        })
    }

    openBotPanel = async () => {
        this.pushLog('Opening https://app.rspeer.org/#/bot/management in your browser.');
        const service = getService<AuthorizationService>('AuthorizationService');
        const session = await service.getSession();
        const menu = "menu=bot_panel";
        const qs = session != null ? `?idToken=${session}&${menu}` : `?${menu}`;
        shell.openExternal('https://app.rspeer.org/#/bot/management' + qs);
    };

    openSupport = async () => {
        const url = "https://docs.rspeer.org/docs/client-wont-start";
        this.pushLog('Opening ' + url + ' in your browser.');
        shell.openExternal(url);
    };

    getEnviromentTitle() {
        if(isDev()) return 'Development';
        if(isStaging()) return 'Staging';
        return '';
    }

    logout = async () => {
        const file = getService<FileService>('FileService');
        const rspeer = await file.getRsPeerFolder();
        await file.delete(path.join(rspeer, 'misc_new'));
        await file.delete(path.join(rspeer, 'rspeer_me'));
        window.location.reload();
    };

    render() {
        return <Page>
            <Navbar>
                <NavTitle>RSPeer Launcher v{LauncherVersion} {this.getEnviromentTitle()}</NavTitle>
            </Navbar>
            <EditJavaPath javaPath={this.state.javaPath} open={this.state.clearingJavaPath}
                          onFinish={this.onFinishPathEdit}/>
            <ContentPopup open={this.state.contentPopup.showing} title={this.state.contentPopup.title}
                          content={this.state.contentPopup.content} onFinish={() => this.toggleContentPopup()}/>
            <Toolbar bottom>
                <small>© RSPeer 2019</small>
            </Toolbar>
            {this.state.user &&
                <List>
                    <ListItem title={`Welcome ${this.state.user.username}.`} view={"#"} after={"Log Out"} onClick={this.logout}>
                    </ListItem>
                </List>
         }
            {this.state.initializeMessage && !this.state.failedLogin && <React.Fragment>
                <List>
                    {<ListItem header="Initializing..." title={this.state.initializeMessage}>
                        <Icon slot="media" f7="bolt"/>
                    </ListItem>}
                </List>
            </React.Fragment>}
            {this.state.initializeMessage && this.state.failedLogin && <React.Fragment>
                <List>
                    {<ListItem header="Failed To Login Automatically" view={"#"} title={this.state.initializeMessage} after={"Login Manually"} onClick={() => {
                        const router = getService<RouterAccessor>('Router');
                        router.get().navigate('/login');
                    }}>
                        <Icon slot="media" f7="bolt"/>
                    </ListItem>}
                </List>
            </React.Fragment>}
            {this.state.user && <Websocket user={this.state.user} onMessage={this.pushLog} onError={this.pushError}/>}
            {this.state.javaPath && <React.Fragment>
                <List>
                    <ListItem header="Java Installation Location" title={this.state.javaPath} view={"#"} after="Edit" onClick={() => {
                        this.setState({clearingJavaPath : true})
                    }}>
                        <Icon slot="media" f7="bolt"/>
                    </ListItem>
                </List>
                {this.state.user != null && <React.Fragment>
                    <BlockTitle>Client Management</BlockTitle>
                    <StartClientSimple open={this.state.openClientSimple}
                                       onBotPanelOpen={this.openBotPanel}
                                       onError={(err) => {
                                           this.pushError(err);
                                       }}
                                       onLog={(log) => {
                                           this.pushLog(log);
                                       }}
                                       onFinish={() => this.setState({openClientSimple: false})}/>
                    <Block>
                        <Row>
                            <Col>
                                <Button outline onClick={() => this.setState({openClientSimple: true})}>Start
                                    Client</Button>
                            </Col>
                            <Col>
                                <Button outline onClick={this.openBotPanel}>Bot Management Panel</Button>
                            </Col>
                            <Col>
                                <Button outline color={'red'} onClick={this.openSupport}>Client Not Starting / Help</Button>
                            </Col>
                        </Row>
                    </Block>
                </React.Fragment>}
            </React.Fragment>}
            {this.state.errorLogs.length > 0 && <React.Fragment>
                <List>
                    <ListItem title="Recent Errors">
                        <Button onClick={() => this.setState({errorLogs: []})}>Clear Errors</Button>
                    </ListItem>
                    {this.state.errorLogs.map(e => {
                        return <ListItem style={{color: '#ff6767'}} key={e.toString()} title={e.toString()} after={"View"} view={"#"}
                                         onClick={() => {
                                             this.toggleContentPopup({
                                                 title: 'Viewing Error',
                                                 content: <p style={{color: '#ff6767'}}>{e.toString()}</p>
                                             })
                                         }}>
                            <Icon slot="media" f7="alert"/>
                        </ListItem>
                    })}
                </List></React.Fragment>}
            {<React.Fragment>
                <List>
                    <ListItem title="Recent Logs">
                        <Button onClick={() => this.setState({logs: []})}>Clear Logs</Button>
                    </ListItem>
                    {this.state.logs.length === 0 && <ListItem style={{color: '#4cd964'}} title={'You have no logs to show.'}>
                    </ListItem>}
                    {this.state.logs.map(e => {
                        return <ListItem key={e.toString()} style={{color: '#4cd964'}} title={e.toString()} after={"View"}
                                         view={"#"}
                                         onClick={() => {
                                             this.toggleContentPopup({
                                                 title: 'Viewing Log',
                                                 content: <p style={{color: '#4cd964'}}>{e}</p>
                                             })
                                         }}>
                            <Icon slot="media" f7="check_round"/>
                        </ListItem>
                    })}
                </List></React.Fragment>}
            {this.state.checkingJavaDependency && <CheckJava isQuickLaunch={this.state.executingQuickLaunch} onFinish={() => {
                this.setState({checkingJavaDependency: false}, this.setConfig);
            }}/>}
        </Page>
    }
}