import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HeaderService } from './header.service';
import { AuthService } from './auth.service';
import { TranslateService } from '@ngx-translate/core';
import { AppService } from './app.service';
import { PrivilegeService } from '@service/privileges.service';
@Injectable({
    providedIn: 'root',
})
export class AppGuardAdmin implements CanActivate {
    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        public headerService: HeaderService,
        private router: Router,
        private appService: AppService,
        private authService: AuthService,
        private privileges: PrivilegeService
    ) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        console.debug(`GUARD ADMIN: ${state.url} INIT`);

        this.headerService.resetSideNavSelection();

        if (this.appService.coreLoaded) {
            if (!this.handleNavigaton(state) || !this.hasAdminPrivilege(state)) {
                this.router.navigate(['/home']);
                return of(false);
            }

            return of(true);
        }

        return this.appService.catchEvent().pipe(
            map(() => {
                const isAuth: boolean = this.handleNavigaton(state);
                if (!isAuth || !this.hasAdminPrivilege(state)) {
                    this.router.navigate(['/home']);
                }
                return isAuth;
            }),
            catchError(() => {
                console.debug(`GUARD ADMIN: ${state.url} CANCELED !`);
                return of(false);
            })
        );
    }

    handleNavigaton(routerState: RouterStateSnapshot): boolean {
        let state: boolean = false;

        const tokenInfo: string = this.authService.getToken();

        if (tokenInfo !== null) {
            this.headerService.hideSideBar = false;
            this.headerService.sideBarAdmin = true;
            this.authService.setCachedUrl(routerState.url.replace(/^\//g, ''));
            state = true;
        } else {
            this.authService.logout(false, true);
            state = false;
        }
        console.debug(`GUARD ADMIN: ${routerState.url} DONE !`);
        return state;
    }

    hasAdminPrivilege(state: RouterStateSnapshot): boolean {
        const userPrivileges: any[] = this.headerService.user.privileges;
        const urlState: string  = state.url;
        const adminPrivilegesService: any[] = this.privileges.getAdministrations().map((privilege: any)=> ({
            id: privilege.id,
            route: privilege.route
        }));
        return (userPrivileges.indexOf(adminPrivilegesService.find((item: any) => urlState.startsWith(item.route))?.id) > -1) || (urlState === '/administration' && userPrivileges.includes('admin'));
    }
}
