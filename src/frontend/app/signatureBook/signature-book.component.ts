import { Component, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { ActionsService } from '@appRoot/actions/actions.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { NotificationService } from '@service/notification/notification.service';
import { filter, tap } from 'rxjs';
import { Subscription } from 'rxjs';
import { MatDrawer } from '@angular/material/sidenav';
import { Attachment } from '@models/attachment.model';
import { MessageActionInterface } from '@models/actions.model';
import { SignatureBookService } from './signature-book.service';
import { ResourcesListComponent } from './resourcesList/resources-list.component';
import { TranslateService } from '@ngx-translate/core';
import { FunctionsService } from '@service/functions.service';
import { UserStampInterface } from '@models/user-stamp.model';
import { SelectedAttachment } from "@models/signature-book.model";

@Component({
    templateUrl: 'signature-book.component.html',
    styleUrls: ['signature-book.component.scss']
})
export class SignatureBookComponent implements OnDestroy {

    @ViewChild('drawerStamps', { static: true }) stampsPanel: MatDrawer;
    @ViewChild('drawerResList', { static: false }) drawerResList: MatDrawer;
    @ViewChild('resourcesList', { static: false }) resourcesList: ResourcesListComponent;

    loadingAttachments: boolean = true;
    loadingDocsToSign: boolean = true;
    loading: boolean = true;

    resId: number = 0;
    basketId: number;
    groupId: number;
    userId: number;

    attachments: Attachment[] = [];
    docsToSign: Attachment[] = [];

    subscription: Subscription;
    defaultUserStamp: UserStampInterface;

    processActionSubscription: Subscription;

    canGoToNext: boolean = false;
    canGoToPrevious: boolean = false;
    hidePanel: boolean = true;

    constructor(
        public http: HttpClient,
        public signatureBookService: SignatureBookService,
        public translate: TranslateService,
        public functions: FunctionsService,
        private route: ActivatedRoute,
        private router: Router,
        private notify: NotificationService,
        private actionsService: ActionsService,
    ) {

        this.initParams();

        this.subscription = this.actionsService.catchActionWithData().pipe(
            filter((data: MessageActionInterface) => data.id === 'selectedStamp'),
            tap(() => {
                this.stampsPanel?.close();
            })
        ).subscribe();

        // Event after process action
        this.processActionSubscription = this.actionsService.catchAction().subscribe(() => {
            this.processAfterAction();
        });
    }

    @HostListener('window:unload', [ '$event' ])
    async unloadHandler(): Promise<void> {
        this.unlockResource();
    }

    initParams(): void {
        this.route.params.subscribe(async params => {
            this.resetValues();

            this.resId = parseInt(params['resId']);
            this.basketId = parseInt(params['basketId']);
            this.groupId = parseInt(params['groupId']);
            this.userId = parseInt(params['userId']);

            if (!this.signatureBookService.config.isNewInternalParaph) {
                this.router.navigate([`/signatureBook/users/${this.userId}/groups/${this.groupId}/baskets/${this.basketId}/resources/${this.resId}`]);
                return;
            }

            if (this.resId !== undefined) {
                this.actionsService.lockResource(this.userId, this.groupId, this.basketId, [this.resId]);
                this.setNextPrev();
                await this.initDocuments();
            } else {
                this.router.navigate(['/home']);
            }
        });
    }

    setNextPrev() {
        const index: number = this.signatureBookService.resourcesListIds.indexOf(this.resId);
        this.canGoToNext = this.signatureBookService.resourcesListIds[index + 1] !== undefined;
        this.canGoToPrevious = this.signatureBookService.resourcesListIds[index - 1] !== undefined;
    }

    resetValues(): void {
        this.loading = true;
        this.loadingDocsToSign = true;
        this.loadingAttachments = true;

        this.attachments = [];
        this.signatureBookService.docsToSign = [];

        this.subscription?.unsubscribe();
    }

    async initDocuments(): Promise<void>{
        await this.signatureBookService.initDocuments(this.userId, this.groupId, this.basketId, this.resId).then((data: any) => {
            this.signatureBookService.selectedAttachment = new SelectedAttachment();
            this.signatureBookService.selectedDocToSign = new SelectedAttachment();

            if (data.resourcesAttached.length > 0) {
                this.signatureBookService.toolBarActive = false;
                this.signatureBookService.selectedAttachment.index = 0;
                this.signatureBookService.selectedAttachment.attachment = data.resourcesAttached[0];
            } else {
                this.signatureBookService.toolBarActive = true;
            }
            if (data.resourcesToSign.length > 0) {
                this.signatureBookService.selectedDocToSign.index = 0;
                this.signatureBookService.selectedDocToSign.attachment = data.resourcesToSign[0];
            }
            this.signatureBookService.docsToSign = data.resourcesToSign;
            this.signatureBookService.selectedDocToSign.attachment = data.resourcesToSign[0];
            this.attachments = data.resourcesAttached;
            this.loadingAttachments = false;
            this.loadingDocsToSign = false;
            this.loading = false;
        });
    }

    processAfterAction() {
        this.backToBasket();
    }

    backToBasket(): void {
        const path = '/basketList/users/' + this.userId + '/groups/' + this.groupId + '/baskets/' + this.basketId;
        this.router.navigate([path]);
    }

    ngOnDestroy(): void {
        // unsubscribe to ensure no memory leaks
        this.subscription.unsubscribe();
        this.processActionSubscription.unsubscribe();
        this.unlockResource();
        this.signatureBookService.selectedResources = [];
    }

    async unlockResource(): Promise<void> {
        const path = '/basketList/users/' + this.userId + '/groups/' + this.groupId + '/baskets/' + this.basketId;
        this.actionsService.stopRefreshResourceLock();
        await this.actionsService.unlockResource(this.userId, this.groupId, this.basketId, [this.resId], path);
    }

    openResListPanel() {
        setTimeout(() => {
            this.drawerResList.open();
        }, 300);
    }

    showPanelContent() {
        this.resourcesList.initViewPort();
    }

    docsToSignUpdated(updatedDocsToSign: Attachment[]): void {
        this.docsToSign = updatedDocsToSign;
    }
}
