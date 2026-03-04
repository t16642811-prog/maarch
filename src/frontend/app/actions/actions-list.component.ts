import { Component, Input, ViewChild, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { MatLegacyMenuTrigger as MatMenuTrigger } from '@angular/material/legacy-menu';
import { Router } from '@angular/router';
import { ActionsService } from './actions.service';
import { ConfirmComponent } from '../../plugins/modal/confirm.component';
import { catchError, exhaustMap, filter, tap } from 'rxjs/operators';
import { HeaderService } from '@service/header.service';
import { FunctionsService } from '@service/functions.service';
import { PrivilegeService } from '@service/privileges.service';
import { of } from 'rxjs';

@Component({
    selector: 'app-actions-list',
    templateUrl: 'actions-list.component.html',
    styleUrls: ['actions-list.component.scss']
})
export class ActionsListComponent {

    @ViewChild(MatMenuTrigger, { static: false }) contextMenu: MatMenuTrigger;
    @Output() triggerEvent = new EventEmitter<string>();

    @Input() selectedRes: any;
    @Input() totalRes: number;
    @Input() contextMode: boolean;
    @Input() currentBasketInfo: any;
    @Input() currentResource: any = {};

    @Output() refreshEvent = new EventEmitter<string>();
    @Output() refreshEventAfterAction = new EventEmitter<string>();
    @Output() refreshPanelFolders = new EventEmitter<string>();

    dialogRef: MatDialogRef<any>;

    loading: boolean = false;

    contextMenuPosition = { x: '0px', y: '0px' };
    contextMenuTitle = '';
    currentAction: any = {};
    basketInfo: any = {};
    contextResId = 0;
    currentLock: any = null;
    arrRes: any[] = [];
    folderList: any[] = [];

    isSelectedFreeze: any;
    isSelectedBinding: null;

    actionsList: any[] = [];


    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        private notify: NotificationService,
        public dialog: MatDialog,
        private router: Router,
        private actionService: ActionsService,
        private headerService: HeaderService,
        private functionService: FunctionsService,
        public privilegeService: PrivilegeService,
    ) { }

    open(x: number, y: number, row: any) {
        this.loadActionList();
        // Adjust the menu anchor position
        this.contextMenuPosition.x = x + 'px';
        this.contextMenuPosition.y = y + 'px';

        this.currentResource = row;

        this.contextMenuTitle = row.chrono;
        this.contextResId = row.resId;

        this.folderList = row.folders !== undefined ? row.folders : [];

        this.getFreezeBindingValue();

        // Opens the menu
        this.contextMenu.openMenu();

        // prevents default
        return false;
    }

    launchEvent(action: any, row: any = null) {
        this.arrRes = [];
        this.currentAction = action;

        this.arrRes = this.selectedRes;


        if (this.contextMode && this.selectedRes.length > 1) {
            this.contextMenuTitle = '';
            this.contextResId = 0;
        }

        if (!this.functionService.empty(row)) {
            this.contextMenuTitle = row.chrono;
            this.currentResource = row;
        }

        this.actionService.launchAction(action, this.currentBasketInfo.ownerId, this.currentBasketInfo.groupId, this.currentBasketInfo.basketId, this.selectedRes, this.currentResource, true);

    }

    loadActionList() {

        if (JSON.stringify(this.basketInfo) !== JSON.stringify(this.currentBasketInfo)) {

            this.basketInfo = JSON.parse(JSON.stringify(this.currentBasketInfo));

            this.http.get('../rest/resourcesList/users/' + this.currentBasketInfo.ownerId + '/groups/' + this.currentBasketInfo.groupId + '/baskets/' + this.currentBasketInfo.basketId + '/actions')
                .subscribe((data: any) => {
                    if (data.actions.length > 0) {
                        this.actionsList = data.actions;
                    } else {
                        this.actionsList = [{
                            id: 0,
                            label: this.translate.instant('lang.noAction'),
                            component: ''
                        }];
                    }
                    this.loading = false;
                }, (err: any) => {
                    this.notify.handleErrors(err);
                });
        }
    }

    refreshList() {
        this.refreshEvent.emit();
    }

    refreshFolders() {
        this.refreshPanelFolders.emit();
    }

    unFollow() {
        this.dialogRef = this.dialog.open(ConfirmComponent, {
            panelClass: 'maarch-modal',
            autoFocus: false,
            disableClose: true,
            data: {
                title: this.translate.instant('lang.untrackThisMail'),
                msg: this.translate.instant('lang.stopFollowingAlert')
            }
        });

        this.dialogRef.afterClosed().pipe(
            filter((data: string) => data === 'ok'),
            exhaustMap(() => this.http.request('DELETE', '../rest/resources/unfollow', { body: { resources: this.selectedRes } })),
            tap((data: any) => {
                this.notify.success(this.translate.instant('lang.removedFromFolder'));
                this.headerService.nbResourcesFollowed -= data.unFollowed;
                this.refreshList();
            })
        ).subscribe();
    }

    follow() {
        this.http.post('../rest/resources/follow', { resources: this.selectedRes }).pipe(
            tap((data: any) =>  {
                this.notify.success(this.translate.instant('lang.followedMail'));
                this.headerService.nbResourcesFollowed += data.followed;
                this.refreshList();
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }


    toggleFreezing(value) {
        this.http.put('../rest/archival/freezeRetentionRule', { resources: this.selectedRes, freeze : value }).pipe(
            tap(() => {
                if (value) {
                    this.notify.success(this.translate.instant('lang.retentionRuleFrozen'));
                } else {
                    this.notify.success(this.translate.instant('lang.retentionRuleUnfrozen'));

                }
                this.refreshList();
            }
            ),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    toogleBinding(value) {
        this.http.put('../rest/archival/binding', { resources: this.selectedRes, binding : value }).pipe(
            tap(() => {
                if (value) {
                    this.notify.success(this.translate.instant('lang.bindingMail'));
                } else if (value === false) {
                    this.notify.success(this.translate.instant('lang.noBindingMail'));
                } else {
                    this.notify.success(this.translate.instant('lang.bindingUndefined'));
                }
                this.refreshList();
            }
            ),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    getFreezeBindingValue() {
        this.isSelectedFreeze = this.currentResource.retentionFrozen;
        this.isSelectedBinding = this.currentResource.binding;
    }
}
