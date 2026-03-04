import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { AppService } from '@service/app.service';
import { FunctionsService } from '@service/functions.service';
import { of } from 'rxjs';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { AdministrationService } from '../administration.service';
import { catchError, finalize, tap } from 'rxjs/operators';
import { UntypedFormControl } from '@angular/forms';

@Component({
    selector: 'app-admin-menu-mercure',
    templateUrl: 'lad-administration-menu.component.html',
    styleUrls: ['./lad-administration-menu.component.scss']
})

export class LadAdministrationMenuComponent implements OnInit {

    @Output() setLadEnabledEv = new EventEmitter<boolean>();

    loading: boolean = false;
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
        public appService: AppService,
        public functions: FunctionsService,
        public adminService: AdministrationService
    ) { }

    ngOnInit(): void {
        this.initConfiguration();
    }

    public isLadEnabled() {
        return this.config.enabledLad;
    }

    initConfiguration() {
        this.http.get('../rest/configurations/admin_mercure').pipe(
            tap((data: any) => {
                this.config = data.configuration.value;
                this.setLadEnabledEv.emit(this.config.enabledLad);
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    saveConfiguration(config: any) {
        this.http.put('../rest/configurations/admin_mercure', config).pipe(
            tap(() => {
                if (!config.enabledLad) {
                    this.notify.success(`${this.translate.instant('lang.mercureLad')} ${this.translate.instant('lang.disabled').toLowerCase()}`);
                } else {
                    this.notify.success(`${this.translate.instant('lang.mercureLad')} ${this.translate.instant('lang.enabled').toLowerCase()}`);
                }
                this.config = config;
                this.setLadEnabledEv.emit(this.config.enabledLad);
            }),
            catchError((err: any) => {
                this.notify.handleErrors(err);
                return of(false);
            }),
            finalize(() => this.loading = false)
        ).subscribe();
    }


    setLadConf(activate: boolean){
        this.loading = true;
        const config = JSON.parse(JSON.stringify(this.config));
        config.enabledLad = activate;
        this.saveConfiguration(config);
    }

    setConfig(conf: any){
        this.config = conf;
    }

    launchTest(){
        this.loading = true;
        this.http.post('../rest/administration/mercure/test', this.config).pipe(
            tap(() => {
                this.setLadConf(true);
            }),
            catchError((err: any) => {
                this.loading = false;
                this.notify.handleErrors(err);
                return of(false);
            })
        ).subscribe();
    }

}
