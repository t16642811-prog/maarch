import { Component, ViewChild, OnInit, HostListener, AfterViewInit } from '@angular/core';
import { MAT_LEGACY_TOOLTIP_DEFAULT_OPTIONS as MAT_TOOLTIP_DEFAULT_OPTIONS, MatLegacyTooltipDefaultOptions as MatTooltipDefaultOptions } from '@angular/material/legacy-tooltip';
import { HeaderService } from '@service/header.service';
import { AppService } from '@service/app.service';
import { MatSidenav } from '@angular/material/sidenav';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@service/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { tap } from 'rxjs';

/** Custom options the configure the tooltip's default show/hide delays. */
export const myCustomTooltipDefaults: MatTooltipDefaultOptions = {
    showDelay: 500,
    hideDelay: 0,
    touchendHideDelay: 0,
};

@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html',
    providers: [
        { provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: myCustomTooltipDefaults }
    ],
})
export class AppComponent implements AfterViewInit {

    @ViewChild('snavLeft', { static: false }) snavLeft: MatSidenav;

    debugMode: boolean = false;
    loading: boolean = true;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        public appService: AppService,
        public headerService: HeaderService,
        public authService: AuthService,
        public dialog: MatDialog
    ) {
        this.appService.loadAppCore();
        this.appService.catchEvent().pipe(
            tap(() => {
                setTimeout(() => {
                    this.headerService.sideNavLeft = this.snavLeft;
                    this.loading = false;
                }, 0);
            })
        ).subscribe();
    }

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.appService.setScreenWidth(window.innerWidth);
    }

    ngAfterViewInit(): void {
        this.appService.setScreenWidth(window.innerWidth);
    }
}
