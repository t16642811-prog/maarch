import { Component, OnInit, ViewChild, TemplateRef, ViewContainerRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { HeaderService } from '@service/header.service';

import { AppService } from '@service/app.service';
import { FunctionsService } from '@service/functions.service';
import { AdministrationService } from '../administration.service';
import { LadAdministrationMenuComponent } from './lad-administration-menu.component';

@Component({
    templateUrl: 'lad-administration.component.html',
    styleUrls: ['./lad-administration.component.scss']
})

export class LadAdministrationComponent implements OnInit {
    @ViewChild('adminMenuTemplate', { static: true }) adminMenuTemplate: TemplateRef<any>;
    @ViewChild('ladMenuContent') ladMenuContent: LadAdministrationMenuComponent;

    loading: boolean = true;
    ladEnabled: boolean;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        private headerService: HeaderService,
        public appService: AppService,
        public functions: FunctionsService,
        public adminService: AdministrationService,
        private viewContainerRef: ViewContainerRef
    ) { }

    ngOnInit(): void {
        this.headerService.setHeader(this.translate.instant('lang.administration') + ' ' + this.translate.instant('lang.mercureLad'));
        this.headerService.injectInSideBarLeft(this.adminMenuTemplate, this.viewContainerRef, 'adminMenu');
    }

    setLadEnabled(state: boolean) {
        this.ladEnabled = state;
        this.loading = false;
    }
}
