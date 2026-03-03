import { Component, OnInit, ViewChild, TemplateRef, ViewContainerRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator';
import { MatSidenav } from '@angular/material/sidenav';
import { MatSort } from '@angular/material/sort';
import { HeaderService } from '@service/header.service';
import { AppService } from '@service/app.service';
import { FunctionsService } from '@service/functions.service';
import { AdministrationService } from '../administration.service';
import { ConfirmComponent } from '@plugins/modal/confirm.component';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { catchError, exhaustMap, filter, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
    templateUrl: 'priorities-administration.component.html',
    styleUrls: ['priorities-administration.component.scss']
})
export class PrioritiesAdministrationComponent implements OnInit {

    @ViewChild('snav2', { static: true }) public sidenavRight: MatSidenav;
    @ViewChild('adminMenuTemplate', { static: true }) adminMenuTemplate: TemplateRef<any>;
    @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
    @ViewChild(MatSort, { static: false }) sort: MatSort;

    loading: boolean = false;

    priorities: any[] = [];
    prioritiesOrder: any[] = [];
    displayedColumns = ['id', 'label', 'delays', 'actions'];
    filterColumns = ['id', 'label', 'delays'];

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        private notify: NotificationService,
        private headerService: HeaderService,
        public appService: AppService,
        public functions: FunctionsService,
        public adminService: AdministrationService,
        private viewContainerRef: ViewContainerRef,
        public dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.headerService.setHeader(this.translate.instant('lang.administration') + ' ' + this.translate.instant('lang.priorities'));

        this.headerService.injectInSideBarLeft(this.adminMenuTemplate, this.viewContainerRef, 'adminMenu');

        this.loading = true;

        this.http.get('../rest/priorities').pipe(
            tap((data: any) => {
                this.priorities = data['priorities'];
                this.loading = false;
                this.http.get('../rest/sortedPriorities').pipe(
                    tap((dataPriorities: any) => {
                        this.prioritiesOrder = dataPriorities['priorities'];
                    }),
                    catchError((err: any) => {
                        this.notify.handleSoftErrors(err);
                        return of(false);
                    })
                ).subscribe();
                setTimeout(() => {
                    this.adminService.setDataSource('admin_priorities', this.priorities, this.sort, this.paginator, this.filterColumns);
                }, 0);
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    deletePriority(id: string) {
        const dialogRef = this.dialog.open(ConfirmComponent, { panelClass: 'maarch-modal', autoFocus: false, disableClose: true, data: { title: `${this.translate.instant('lang.deletePriorityConfirm')}`, msg: this.translate.instant('lang.confirmAction') } });
        dialogRef.afterClosed().pipe(
            filter((data: string) => data === 'ok'),
            exhaustMap(() => this.http.delete('../rest/priorities/' + id)),
            tap((data: any) => {
                this.priorities = data['priorities'];
                this.adminService.setDataSource('admin_priorities', this.priorities, this.sort, this.paginator, this.filterColumns);
                this.prioritiesOrder = this.priorities;
                this.notify.success(this.translate.instant('lang.priorityDeleted'));
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    onPriorityDrop(event: CdkDragDrop<string[]>): void {
        moveItemInArray(this.prioritiesOrder, event.previousIndex, event.currentIndex);
        event.container.data.forEach((priority: any, index: number) => {
            priority.order = index;
        });
        this.updatePrioritiesOrder();
    }

    updatePrioritiesOrder() {
        this.http.put('../rest/sortedPriorities', this.prioritiesOrder).pipe(
            tap((data: any) => {
                this.prioritiesOrder = data['priorities'];
                this.notify.success(this.translate.instant('lang.modificationSaved'));
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }
}
