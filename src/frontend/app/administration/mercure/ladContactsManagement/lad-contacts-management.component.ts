import { Component, OnInit, ViewChild, TemplateRef, ViewContainerRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { HeaderService } from '@service/header.service';
import { AppService } from '@service/app.service';
import { FunctionsService } from '@service/functions.service';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { AdministrationService } from '../../administration.service';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
    templateUrl: 'lad-contacts-management.component.html',
    styleUrls: ['./lad-contacts-management.component.scss']
})

export class LadContactsManagementComponent implements OnInit {
    @ViewChild('adminMenuTemplate', { static: true }) adminMenuTemplate: TemplateRef<any>;

    loading: boolean = false;
    dialogRef: MatDialogRef<any>;

    indexationState: any = {
        dateIndexation : '',
        countIndexedContacts : 0,
        countAllContacts : 0,
        pctIndexationContacts : 0
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
        this.headerService.setHeader(this.translate.instant('lang.administration') + ' ' + this.translate.instant('lang.ladContactsManagement'));
        this.headerService.injectInSideBarLeft(this.adminMenuTemplate, this.viewContainerRef, 'adminMenu');

        this.loading = true;

        this.loadIndexationState();

        this.loading = false;
    }

    loadIndexationState() {
        this.http.get('../rest/mercure/lad/contactIndexations').pipe(
            tap((data: any) => {
                this.indexationState = data;
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }
}
