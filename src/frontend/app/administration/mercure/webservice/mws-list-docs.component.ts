import { Component, OnInit, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { HeaderService } from '@service/header.service';
import { MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator';
import { MatSort } from '@angular/material/sort';
import { AppService } from '@service/app.service';
import { FunctionsService } from '@service/functions.service';
import { of } from 'rxjs';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { AdministrationService } from '../../administration.service';
import { catchError, tap } from 'rxjs/operators';
import { UntypedFormControl } from '@angular/forms';

@Component({
    templateUrl: 'mws-list-docs.component.html',
    styleUrls: ['./mws-list-docs.component.scss']
})

export class MwsListDocsComponent implements OnInit {
    @ViewChild('adminMenuTemplate', { static: true }) adminMenuTemplate: TemplateRef<any>;
    @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
    @ViewChild(MatSort, { static: false }) sort: MatSort;

    loading: boolean = false;
    checkInterval: NodeJS.Timeout;
    dialogRef: MatDialogRef<any>;

    displayedColumns = ['date', 'filename', 'method', 'status'];
    filterColumns = ['filename'];
    docs: any = [];
    nbTotal: any = 0;

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
        this.headerService.setHeader(this.translate.instant('lang.administration') + ' ' + this.translate.instant('lang.mws') + ' - ' + this.translate.instant('lang.mwsListDocs'));
        this.headerService.injectInSideBarLeft(this.adminMenuTemplate, this.viewContainerRef, 'adminMenu');

        this.loading = true;

        this.initConfiguration();
    }

    initConfiguration() {
        this.http.get('../rest/configurations/admin_mercure').pipe(
            tap((data: any) => {
                this.config = data.configuration.value;
                this.loadListDocs();
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    loadListDocs(){
        this.http.get('../rest/mercure/webservice/documents/' + this.config.mws.tokenMws).pipe(
            tap((data: any) => {
                this.docs = data.docs;
                this.nbTotal = data.nbTotal;
                this.loading = false;
                setTimeout(() => {
                    this.adminService.setDataSource('admin_mercure', this.docs, this.sort, this.paginator, this.filterColumns);
                }, 0);
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

}
