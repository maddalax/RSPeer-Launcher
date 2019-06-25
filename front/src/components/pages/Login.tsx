import React from 'react';
import {
    Page,
    LoginScreen,
    View,
    LoginScreenTitle,
    List,
    ListInput, Button
} from 'framework7-react';
import {getService} from "../../Bottle";
import {AuthorizationService} from "../../services/AuthorizationService";
import {RouterAccessor} from "../../accessors/RouterAccessor";

export class Login extends React.Component<any, any> {
    
    private keyListener : any;
    private auth = getService<AuthorizationService>('AuthorizationService');
    private router = getService<RouterAccessor>('Router');
    
    constructor(props : any) {
        super(props);
        this.state = {
            email : '',
            password : '',
            signInText : 'Sign in',
            loggedIn : false
        }
    }

    onSignIn = () => {
        this.setState({signInText : 'Signing in...'});
        this.auth.login(this.state.email, this.state.password)
            .then(() => {
                this.setState({loggedIn : true}, () => {
                    const password = document.getElementById('password-input');
                    password && password.removeEventListener('keypress', this.keyListener);
                    this.router.get().navigate('/');
                })
            })
            .catch(res => {
                this.setState({signInText : res.error});
            })
    };
    
    async componentDidMount() {
        const user = await this.auth.getUser();
        if(user) {
           this.setState({loggedIn : true}, () => {
               this.router.get().navigate('/');
           }) 
        }
        const password = document.getElementById('password-input');
        if (password) {
            this.keyListener = password.addEventListener('keypress', (e: any) => {
                const key = e.which || e.keyCode;
                if (key !== 13) {
                    return;
                }
                this.onSignIn();
            });
        }
    }
    
    render() {
        
        const logo = {
            display: 'block',
            marginLeft: 'auto',
            marginRight: 'auto',
            width: '50%',
            marginTop: '50px'
        };
        
        return (
            <LoginScreen id="login-screen" opened={!this.state.loggedIn}>
                <View>
                    <Page loginScreen>
                        <img src="https://rspeer.nyc3.cdn.digitaloceanspaces.com/robot.svg" width={'150px'} height={'150px'}
                             style={logo} alt={"Logo"}/>
                        <LoginScreenTitle>Sign In To RSPeer</LoginScreenTitle>
                        <List form>
                            <ListInput
                                label="Email Address"
                                name="email"
                                autofocus={true}
                                placeholder="Email Address"
                                type="email"
                                validateOnBlur={true}
                                validate={true}
                                onChange={(e: any) => this.setState({email : e.target.value})}
                            />
                            <ListInput
                                id={"password-input"}
                                label="Password"
                                name="password"
                                placeholder="Password"
                                type="password"
                                onChange={(e: any) => this.setState({password : e.target.value})}
                            />
                        </List>
                        <List>
                            <Button outline color="blue" onClick={this.onSignIn}>{this.state.signInText}</Button>
                        </List>
                    </Page>
                </View>
            </LoginScreen>
        )
    }
}
