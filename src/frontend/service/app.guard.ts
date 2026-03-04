import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { HeaderService } from './header.service';
import { ProcessComponent } from '../app/process/process.component';
import { AuthService } from './auth.service';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from './notification/notification.service';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { ConfirmComponent } from '@plugins/modal/confirm.component';
import { ActionsService } from '@appRoot/actions/actions.service';
import { AppService } from './app.service';

@Injectable({
    providedIn: 'root',
})
export class AppGuard  {
    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        public headerService: HeaderService,
        private router: Router,
        private appService: AppService,
        private authService: AuthService
    ) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        console.debug(`GUARD: ${state.url} INIT`);

        this.headerService.resetSideNavSelection();

        if (this.appService.coreLoaded) {
            return of(this.handleNavigaton(route, state));
        }

        return this.appService.catchEvent().pipe(
            map(() => {
                return this.handleNavigaton(route, state);
            }),
            catchError(() => {
                console.debug(`GUARD: ${state.url} CANCELED !`);
                return of(false);
            })
        );
    }

    handleNavigaton(route: ActivatedRouteSnapshot, routerState: RouterStateSnapshot): boolean {
        const urlArr = routerState.url.replace(/^\/+|\/+$/g, '').split('/');
        let state = false;

        if (route.url.join('/') === 'login') {
            if (this.authService.isAuth()) {
                this.router.navigate(['/home']);
                state = false;
            } else {
                state = true;
            }
        } else {
            const tokenInfo = this.authService.getToken();
            // debugger;
            if (tokenInfo !== null) {
                if (urlArr.filter((url: any) => ['signatureBookNew', 'signatureBook', 'content'].indexOf(url) > -1).length > 0) {
                    this.headerService.hideSideBar = true;
                } else {
                    this.headerService.hideSideBar = false;
                }
                if (
                    urlArr.filter((url: any) => url === 'administration').length > 0 ||
                    urlArr.filter((url: any) => url === 'profile').length > 0
                ) {
                    this.headerService.sideBarAdmin = true;
                } else {
                    this.headerService.sideBarAdmin = false;
                }
                this.authService.setCachedUrl(routerState.url.replace(/^\//g, ''));
                state = true;
            } else {
                this.authService.logout(false, true);
                state = false;
            }
        }
        console.debug(`GUARD: ${routerState.url} DONE !`);
        return state;
    }
}

@Injectable({
    providedIn: 'root',
})
export class AfterProcessGuard  {
    constructor(
        public translate: TranslateService,
        private notify: NotificationService,
        public dialog: MatDialog,
        public authService: AuthService,
        public actionService: ActionsService,
        public router: Router
    ) {}

    async canDeactivate(
        component: ProcessComponent,
        currentRoute: ActivatedRouteSnapshot,
        currentState: RouterStateSnapshot,
        nextState: RouterStateSnapshot
    ): Promise<boolean> {
        /* if (nextState.url !== '/login' && !component.isActionEnded() && !component.detailMode) {
            component.actionService.unlockResource(component.currentUserId, component.currentGroupId, component.currentBasketId, [component.currentResourceInformations.resId]);
        }*/
        if (
            (component.isToolModified() && !component.isModalOpen()) ||
            (component.appDocumentViewer !== undefined && component.appDocumentViewer.isEditingTemplate())
        ) {
            const value = await this.getConfirmation();
            if (value) {
                await component.saveModificationBeforeClose();
            }
            if (nextState.url === '/login') {
                component.logoutTrigger = true;
                this.authService.setEvent('login');
                await component.unlockResource();
                this.authService.redirectAfterLogout(true);
            }
            return true;
        } else {
            if (nextState.url === '/login') {
                component.logoutTrigger = true;
                await component.unlockResource();
                this.authService.redirectAfterLogout(true);
            }
            return true;
        }
    }

    getConfirmation() {
        return new Promise((resolve) => {
            const dialogRef = this.dialog.open(ConfirmComponent, {
                panelClass: 'maarch-modal',
                autoFocus: false,
                disableClose: true,
                data: {
                    title: this.translate.instant('lang.confirm'),
                    msg: this.translate.instant('lang.saveModifiedData'),
                    buttonValidate: this.translate.instant('lang.yes'),
                    buttonCancel: this.translate.instant('lang.no'),
                },
            });
            dialogRef
                .afterClosed()
                .pipe(
                    tap((data: string) => {
                        resolve(data);
                    }),
                    catchError((err: any) => {
                        this.notify.handleErrors(err);
                        return of(false);
                    })
                )
                .subscribe();
        });
    }
}
