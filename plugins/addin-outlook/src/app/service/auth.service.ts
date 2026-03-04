import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LocalStorageService } from './local-storage.service';
import { NotificationService } from './notification/notification.service';
import { Observable, of, Subject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
// import { TranslateService } from '@ngx-translate/core';

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    applicationName: string = 'Maarch Courrier';
    appUrl: string = null;
    user: any = {};
    authMode: string = '';

    connectionTry: any = null;

    private eventAction = new Subject<any>();

    constructor(
        public http: HttpClient,
        private notify: NotificationService,
        private localStorage: LocalStorageService,
        // public translate: TranslateService,
    ) { }

    catchEvent(): Observable<any> {
        return this.eventAction.asObservable();
    }

    setEvent(content: any) {
        return this.eventAction.next(content);
    }

    getConnection() {
        return new Promise(async (resolve) => {
            const res = await this.getAppInfo();
            if (res) {
                this.setEvent('connected');
                resolve(true);
            } else {
                this.setEvent('not connected'); 
                resolve(false);
            }
        });
    }

    tryConnection() {
        this.connectionTry = setInterval(async () => {
            const res = await this.getAppInfo();
            if (res) {
                clearInterval(this.connectionTry);
                this.connectionTry = null;
                this.setEvent('connected');
            } else {
                this.setEvent('not connected'); 
            }
        }, 2000);
    }

    getToken() {
        return this.localStorage.get('MaarchCourrierToken');
    }

    getAppSession() {
        return this.localStorage.getAppSession();
    }

    setAppSession(id: string) {
        this.localStorage.setAppSession(id);
    }

    setToken(token: string) {
        this.localStorage.save('MaarchCourrierToken', token);
    }

    getRefreshToken() {
        return this.localStorage.get('MaarchCourrierRefreshToken');
    }

    setRefreshToken(refreshToken: string) {
        this.localStorage.save('MaarchCourrierRefreshToken', refreshToken);
    }

    clearTokens() {
        this.localStorage.remove('MaarchCourrierToken');
        this.localStorage.remove('MaarchCourrierRefreshToken');
    }

    getAppInfo() {
        return new Promise((resolve) => {
            this.http.get('../rest/authenticationInformations')
                .pipe(
                    tap((data: any) => {
                        this.applicationName = data.applicationName;
                        this.appUrl = data.maarchUrl.replace(/\/$/, "");
                        this.authMode = data.authMode;
                        this.setAppSession(data.instanceId);
                        resolve(true);
                    }),
                    catchError((err: any) => {
                        console.log(err);
                        return of(false);
                    })
                ).subscribe();
        });
    }

    refreshToken() {
        return this.http
            .get<any>(`../rest/authenticate/token`, { params: { refreshToken: this.getRefreshToken() } })
            .pipe(
                tap((data) => {
                    // Update stored token
                    this.setToken(data.token);

                    // Update user info
                    this.updateUserInfo(data.token);
                }),
                catchError((error) => {
                    this.setEvent('refresh token failed');
                    return of(false);
                })
            );
    }

    saveTokens(token: string, refreshToken: string) {
        this.setToken(token);
        this.setRefreshToken(refreshToken);
    }

    isAuth(): boolean {
        return this.getToken() !== null;
    }

    updateUserInfo(token: string) {
        this.user = JSON.parse(atob(token.split('.')[1])).user;
    }
}
