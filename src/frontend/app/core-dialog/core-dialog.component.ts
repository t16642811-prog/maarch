import { catchError, finalize, of, tap } from 'rxjs';
import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '@service/auth.service';
import { Router } from '@angular/router';
import { LocaleService } from '@service/locale.service';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material/icon';
import { FunctionsService } from '@service/functions.service';
import { LocalStorageService } from '@service/local-storage.service';
import { PluginManagerService } from '@service/plugin-manager.service';
import { IconService } from '@service/icons.service';
import { HeaderService } from '@service/header.service';
import { NotificationService } from '@service/notification/notification.service';
import { AlertComponent } from '@plugins/modal/alert.component';
import { SignatureBookService } from '@appRoot/signatureBook/signature-book.service';


@Component({
    selector: 'app-core-dialog',
    templateUrl: './core-dialog.component.html',
    styleUrls: ['./core-dialog.component.scss']
})
export class CoreDialogComponent implements OnInit {
    onError: boolean = false;
    onErrorMsg: any = {
        idLang: '',
        varContent: {}
    };
    msg: string = 'Loading...';
    loadIcon: boolean = true;
    loadLang: boolean = true;

    headersJson = new HttpHeaders({
        Accept: 'application/json'
    });

    constructor(
        public http: HttpClient,
        public dialogRef: MatDialogRef<CoreDialogComponent>,
        public sanitizer: DomSanitizer,
        public iconReg: MatIconRegistry,
        public dialog: MatDialog,
        private localeService: LocaleService,
        private iconService: IconService,
        private functionsService: FunctionsService,
        private localStorage: LocalStorageService,
        private pluginManagerService: PluginManagerService,
        private headerService: HeaderService,
        private notify: NotificationService,
        private router: Router,
        private authService: AuthService,
        private translate: TranslateService,
        private signatureBookService: SignatureBookService
    ) {
        this.initializeIcons();
    }

    async ngOnInit(): Promise<void> {
        console.debug('INIT CORE LOADING');
        this.headerService.resetSideNavSelection();
        this.setIconLogo();
        const res = await this.loadConfig();
        await this.intializeLanguage();
        if (res === 'noConfiguration') {
            this.router.navigate(['/install']);
        } else {
            await this.applyMinorUpdate();
            this.checkAppSecurity();

            const tokenInfo = this.authService.getToken();
            if (window.location.hash.indexOf('/reset-password') === -1) {
                if (tokenInfo !== null) {
                    const result = await this.getLoggedUserInfo();
                    await this.intializeLanguage();
                    if (!result) {
                        this.authService.logout(false, true);
                    } else if (result === 'User must change his password') {
                        this.router.navigate(['/password-modification']);
                    } else if (this.headerService.user.status === 'ABS') {
                        this.router.navigate(['/activate-user']);
                    }
                } else {
                    this.authService.logout(false, true);
                }

                if (this.authService.isAuth() && this.router.url === '/login') {
                    if (!this.functionsService.empty(this.authService.getToken()?.split('.')[1]) && !this.functionsService.empty(this.authService.getUrl(JSON.parse(atob(this.authService.getToken().split('.')[1])).user.id))) {
                        this.router.navigate([this.authService.getUrl(JSON.parse(atob(this.authService.getToken().split('.')[1])).user.id)]);
                    } else {
                        this.router.navigate(['/home']);
                    }
                }
            }
        }

        console.debug('INIT CORE DONE');

        setTimeout(() => {
            this.dialogRef.close();
        }, 500);
    }

    initializeIcons(): void {
        this.iconService.initializeIcons();
        this.loadIcon = false;
    }

    getLoggedUserInfo() {
        return new Promise((resolve) => {
            this.authService
                .getCurrentUserInfo()
                .pipe(
                    tap(async () => {
                        await this.signatureBookService.getInternalSignatureBookConfig();
                        resolve(true);
                    }),
                    catchError((err: any) => {
                        if (err.error.errors === 'User must change his password') {
                            resolve(err.error.errors)
                        } else {
                            resolve(false);
                        }
                        return of(false);
                    })
                ).subscribe();
        });
    }

    intializeLanguage(): Promise<boolean> {
        return new Promise((resolve) => {
            this.translate.onLangChange.subscribe(() => {
                this.localeService.initializeLocale(this.translate.instant('lang.langISO'));
                this.loadLang = false;
                resolve(true);
            });

            if (this.authService.user?.preferences?.languages) {
                if (this.authService.user?.preferences?.languages == this.translate.currentLang) {
                    resolve(true);
                }
                this.translate.use(this.authService.user.preferences.languages);
            } else if (this.authService.lang) {
                if (this.authService.lang == this.translate.currentLang) {
                    resolve(true);
                }
                this.translate.use(this.authService.lang);
            } else {
                this.translate.use('fr');
            }
        });
    }

    loadConfig(): Promise<boolean | string> {
        return new Promise((resolve) => {
            this.http
                .get('../rest/authenticationInformations')
                .pipe(
                    tap((data: any) => {
                        this.authService.setAppSession(data.instanceId);
                        this.localStorage.save('lang', data.lang);
                        this.authService.lang = data.lang;
                        this.authService.mailServerOnline = data.mailServerOnline;
                        this.authService.changeKey = data.changeKey;
                        this.authService.applicationName = data.applicationName;
                        this.authService.loginMessage = this.functionsService.sanitizeHtml(data.loginMessage);
                        this.authService.externalSignatoryBook = data.externalSignatoryBook;
                        this.authService.authMode = data.authMode;
                        this.authService.authUri = data.authUri;
                        this.authService.maarchUrl = data.maarchUrl;
                        this.authService.idleTime = data.idleTime;
                        this.authService.plugins = data.plugins;
                        this.pluginManagerService.storePlugins(data.plugins);


                        if (this.authService.authMode === 'keycloak') {
                            const keycloakState = this.localStorage.get('keycloakState');
                            if (keycloakState === null || keycloakState === 'null') {
                                this.localStorage.save('keycloakState', data.keycloakState);
                            }
                        }
                        resolve(true);
                    }),
                    catchError(async (err) => {
                        if (err.status === 500) {
                            this.notify.handleSoftErrors(err);
                        } else {
                            resolve(this.checkValidUrl());
                        }
                        return of(false);
                    })
                )
                .subscribe();
        });
    }

    checkValidUrl(): Promise<boolean> {
        return new Promise((resolve) => {
            this.http
                .get('../rest/validUrl')
                .pipe(
                    tap((data: any) => {
                        if (!this.functionsService.empty(data.url)) {
                            window.location.href = data.url;
                        } else if (data.lang === 'moreOneCustom') {
                            this.onErrorMsg.idLang = 'lang.moreOneCustom';
                        } else if (data.lang === 'noConfiguration') {
                            this.authService.noInstall = true;
                            resolve(data.lang);
                        }
                        resolve(true);
                    }),
                    catchError((err: any) => {
                        this.notify.handleSoftErrors(err);
                        return of(false);
                    })
                )
                .subscribe();
        });
    }

    checkAppSecurity() {
        if (this.authService.changeKey) {
            setTimeout(() => {
                this.dialog.open(AlertComponent, {
                    panelClass: 'maarch-modal',
                    autoFocus: false,
                    disableClose: true,
                    data: {
                        mode: 'danger',
                        title: this.translate.instant('lang.warnPrivateKeyTitle'),
                        msg: this.translate.instant('lang.warnPrivateKey')
                    }
                });
            }, 1000);
        }
    }

    applyMinorUpdate() {
        console.debug("CHECK UPDATE");
        this.msg = 'Recherche de mise à jour...';
        return new Promise((resolve) => {
            this.http.put('../rest/versionsUpdateSQL', {}).pipe(
                finalize(() => resolve(true)),
                catchError((err: any) => {
                    this.notify.handleSoftErrors(err);
                    return of(false);
                })
            ).subscribe();
        });

    }

    setIconLogo() {
        this.iconReg.addSvgIcon('maarchLogo', this.sanitizer.bypassSecurityTrustResourceUrl('../rest/images?image=onlyLogo'));
        this.iconReg.addSvgIcon('maarchLogoFull', this.sanitizer.bypassSecurityTrustResourceUrl('../rest/images?image=logo'));
    }
}
