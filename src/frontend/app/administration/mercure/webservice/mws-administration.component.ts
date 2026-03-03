import { Component, OnInit, ViewChild, TemplateRef, ViewContainerRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { HeaderService } from '@service/header.service';
import { AppService } from '@service/app.service';
import { FunctionsService } from '@service/functions.service';
import { of } from 'rxjs';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { AdministrationService } from '../../administration.service';
import { catchError, tap } from 'rxjs/operators';
import { UntypedFormControl } from '@angular/forms';
import { LadAdministrationMenuComponent } from '../lad-administration-menu.component';

@Component({
    templateUrl: 'mws-administration.component.html',
    styleUrls: ['./mws-administration.component.scss']
})

export class MwsAdministrationComponent implements OnInit {
    @ViewChild('adminMenuTemplate', { static: true }) adminMenuTemplate: TemplateRef<any>;
    @ViewChild('menuMercure') menuMercure: LadAdministrationMenuComponent;

    loading: boolean = false;
    checkInterval: NodeJS.Timeout;


    creationMode: boolean = true;
    isModified: boolean = false;
    showStateAccount: boolean = false;
    stateAccountOK: boolean = false;
    hidePasswordMws: boolean = true;
    hidePasswordMaarch: boolean = true;
    stateAccount: string = '';

    dialogRef: MatDialogRef<any>;

    config: any = {
        enabledLad: new UntypedFormControl(false),
        mws: {
            url: '',
            login: '',
            password: '',
            tokenMws: '',
            loginMaarch: '',
            passwordMaarch: ''
        },
        mwsLadPriority: new UntypedFormControl(false)
    };

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        private notify: NotificationService,
        private headerService: HeaderService,
        public appService: AppService,
        public functions: FunctionsService,
        public adminService: AdministrationService,
        private viewContainerRef: ViewContainerRef
    ) { }

    ngOnInit(): void {
        this.headerService.setHeader(this.translate.instant('lang.administration') + ' ' + this.translate.instant('lang.mws'));
        this.headerService.injectInSideBarLeft(this.adminMenuTemplate, this.viewContainerRef, 'adminMenu');

        this.loading = true;

        this.initConfiguration();

        this.creationMode = false;
    }

    initConfiguration() {
        this.http.get('../rest/configurations/admin_mercure').pipe(
            tap((data: any) => {
                this.config = data.configuration.value;
                this.checkAccount();
                this.loading = false;
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    saveConfiguration(resetToken = true) {
        if (resetToken){
            this.config.mws.tokenMws = '';
        }
        this.http.put('../rest/configurations/admin_mercure', this.config).pipe(
            tap(() => {
                this.notify.success(this.translate.instant('lang.dataUpdated'));
                this.checkAccount();
                this.menuMercure.setConfig(this.config);
            }),
            catchError((err: any) => {
                this.notify.handleErrors(err);
                return of(false);
            })
        ).subscribe();
    }


    toggleMwsLadPrio() {
        this.config.mwsLadPriority = !this.config.mwsLadPriority;
        this.saveConfiguration();
    }

    checkAccount() {
        if (this.config.mws.url !== '' && this.config.mws.login !== '' && this.config.mws.password !== '' ){
            this.showStateAccount = true;
            if (this.config.mws.tokenMws === ''){
                this.http.get('../rest/mercure/webservice/account').pipe(
                    tap((data: any) => {
                        this.config.mws.tokenMws = data.token;
                        this.stateAccountOK = true;
                        this.saveConfiguration(false);
                        this.stateAccount = this.translate.instant('lang.mwsStatusOK');
                    }),
                    catchError((err: any) => {
                        this.stateAccountOK = false;
                        if (err.status === 401){
                            this.stateAccount = this.translate.instant('lang.mwsInvalidCredentials');
                        } else if (err.status === 404) {
                            this.stateAccount = this.translate.instant('lang.mwsUriNotFound');
                        }
                        return of(false);
                    })
                ).subscribe();
            } else {
                this.stateAccountOK = true;
                this.stateAccount = this.translate.instant('lang.mwsStatusOK');
            }
        } else {
            this.showStateAccount = false;
        }
    }

}
