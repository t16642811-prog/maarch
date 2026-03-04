import { Component, OnInit, ViewChild, TemplateRef, ViewContainerRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { HeaderService } from '@service/header.service';
import { MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator';
import { MatSort } from '@angular/material/sort';
import { AppService } from '@service/app.service';
import { FunctionsService } from '@service/functions.service';
import { of } from 'rxjs';
import { MatLegacyDialogRef as MatDialogRef, MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { AdministrationService } from '../../administration.service';
import { catchError, tap } from 'rxjs/operators';
import { UntypedFormControl } from '@angular/forms';

@Component({
    templateUrl: 'mws-monitoring.component.html',
    styleUrls: ['./mws-monitoring.component.scss']
})

export class MwsMonitoringComponent implements OnInit {
    @ViewChild('adminMenuTemplate', { static: true }) adminMenuTemplate: TemplateRef<any>;
    @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
    @ViewChild(MatSort, { static: false }) sort: MatSort;

    loading: boolean = false;
    checkInterval: NodeJS.Timeout;

    dialogRef: MatDialogRef<any>;

    /* Liste des données */
    statusSubscription: any = {
        startDate: 'NA',
        endDate: 'NA',
        nbPagesMax: 'NA'
    };

    chartPages: any = null;
    chartDays: any = null;
    chartStatus: any = null;
    chartEvolLad: any = null;
    chartEvolOcr: any = null;

    colorScheme = {
        domain: ['#5AA454', '#E44D25', '#990b0b']
    };

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
    cardColor: string = '#232837';
    legendPosition: string = 'right';

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        private notify: NotificationService,
        private headerService: HeaderService,
        public appService: AppService,
        private dialog: MatDialog,
        public functions: FunctionsService,
        public adminService: AdministrationService,
        private viewContainerRef: ViewContainerRef
    ) { }

    ngOnInit(): void {
        this.headerService.setHeader(this.translate.instant('lang.administration') + ' ' + this.translate.instant('lang.mws') + ' - ' + this.translate.instant('lang.mwsMonitoring'));

        this.headerService.injectInSideBarLeft(this.adminMenuTemplate, this.viewContainerRef, 'adminMenu');

        this.loading = true;

        this.initConfiguration();

    }


    initConfiguration() {
        this.http.get('../rest/configurations/admin_mercure').pipe(
            tap((data: any) => {
                this.config = data.configuration.value;
                this.loadSubscriptionState();
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }


    loadSubscriptionState() {
        this.http.get('../rest/mercure/webservice/subscriptionState').pipe(
            tap((data: any) => {

                this.statusSubscription.nbPagesMax = data.nbMaxPages;
                this.statusSubscription.startDate = data.creationDate.date;
                this.statusSubscription.endDate = data.endDate.date;

                this.chartDays = [
                    {
                        'name': this.translate.instant('lang.mwsRemainingDays'),
                        'value': data.nbDaysRemaining
                    }
                ];

                this.chartPages = [
                    {
                        'name': this.translate.instant('lang.mwsProcessedPages'),
                        'value': data.nbProcessedPages
                    },
                    {
                        'name': this.translate.instant('lang.mwsRemainingPages'),
                        'value': data.nbPagesRemaining
                    }
                ];

                this.chartEvolLad = [
                    {
                        'name': this.translate.instant('lang.mwsCountDepot'),
                        'series': data.evolutionLAD
                    }
                ];

                this.chartEvolOcr = [
                    {
                        'name': this.translate.instant('lang.mwsCountDepot'),
                        'series': data.evolutionOCR
                    }
                ];

                this.chartStatus = data.statusDistribution;

                this.loading = false;
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }
}
