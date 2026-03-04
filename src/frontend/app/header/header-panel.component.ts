import { Component, OnInit, Input } from '@angular/core';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { HeaderService } from '@service/header.service';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { MatSidenav } from '@angular/material/sidenav';
import { AppService } from '@service/app.service';
import { Router } from '@angular/router';
import { FunctionsService } from '@service/functions.service';

@Component({
    selector: 'app-header-panel',
    styleUrls: ['header-panel.component.scss'],
    templateUrl: 'header-panel.component.html',
})
export class HeaderPanelComponent implements OnInit {

    @Input() navButton: any = null;
    @Input() snavLeft: MatSidenav;

    dialogRef: MatDialogRef<any>;
    config: any = {};

    constructor(
        public translate: TranslateService,
        public headerService: HeaderService,
        public appService: AppService,
        public functions: FunctionsService,
        private router: Router,
        private _location: Location
    ) { }

    ngOnInit(): void { }

    toggleSidePanel() {
        if (this.headerService.sideNavLeft) {
            this.headerService.sideNavLeft.toggle();
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 300);
        }
    }

    goTo() {
        if (this.headerService.sideBarButton.route === '__GOBACK') {
            if (this.router.url.includes('fromSearch=true')) {
                let searchTerm: string = '';
                const storedCriteria = JSON.parse(sessionStorage.getItem('criteriaSearch_' + this.headerService.user.id));
                if (!this.functions.empty(storedCriteria) && !this.functions.empty(storedCriteria.criteria.meta?.values)) {
                    if (!this.functions.empty(storedCriteria.criteria.meta?.values)) {
                        searchTerm = storedCriteria.criteria.meta.values;
                    }
                }
                this.router.navigate(['/search'], { queryParams: { value: searchTerm } });
            } else {
                this._location.back();
            }
        } else {
            this.router.navigate([this.headerService.sideBarButton.route]);
        }

    }

    goToHome() {
        this.router.navigate(['/home']);
    }
}
