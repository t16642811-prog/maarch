
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HeaderService } from './header.service';
import { TranslateService } from '@ngx-translate/core';
import { AppService } from './app.service';

@Injectable({
    providedIn: 'root'
})
export class AppLightGuard  {

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        private appService: AppService,
        public headerService: HeaderService,
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        console.debug(`GUARD: ${state.url} INIT`);

        this.headerService.resetSideNavSelection();

        if (this.appService.coreLoaded) {
            return of(true);
        }

        console.debug('GUARD: waiting for core loading...');


        return this.appService.catchEvent().pipe(
            map(() => {
                console.debug(`GUARD: ${state.url} DONE !`);
                return true;
            }),
            catchError(() => {
                console.debug(`GUARD: ${state.url} CANCELED !`);
                return of(false);
            })
        );
    }
}
