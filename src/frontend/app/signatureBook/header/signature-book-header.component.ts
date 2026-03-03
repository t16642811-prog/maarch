import { Component, EventEmitter, Input, Output } from "@angular/core";
import { SignatureBookService } from "../signature-book.service";
import { ActionsService } from "@appRoot/actions/actions.service";
import { TranslateService } from "@ngx-translate/core";
import { NotificationService } from "@service/notification/notification.service";
import { Router } from "@angular/router";

@Component({
    selector: 'app-signature-book-header',
    templateUrl: 'signature-book-header.component.html',
    styleUrls: ['signature-book-header.component.scss'],
})

export class SignatureBookHeaderComponent {

    @Input() canGoToPrevious: boolean = false;
    @Input() canGoToNext: boolean  =false;

    @Input() resId: number = null;
    @Input() userId: number = null;
    @Input() groupId: number = null;
    @Input() basketId: number = null;

    @Output() setNextPrevEvent = new EventEmitter<void>();
    @Output() toggleResListDrawer = new EventEmitter<void>();

    constructor (
        public signatureBookService: SignatureBookService,
        public actionService: ActionsService,
        public translate: TranslateService,
        private notification: NotificationService,
        private router: Router
    ) { }

    goToResource(event: string = 'next' || 'previous'): void {
        this.actionService.goToResource(this.signatureBookService.resourcesListIds, this.userId, this.groupId, this.basketId).subscribe(((resourcesToProcess: number[]) => {
            const allResourcesUnlock: number[] = resourcesToProcess;
            const index: number = this.signatureBookService.resourcesListIds.indexOf(parseInt(this.resId.toString(), 10));
            const nextLoop = (event === 'next') ? 1 : (event === 'previous') ? -1 : 1;
            let indexLoop: number = index;

            do {
                indexLoop = indexLoop + nextLoop;
                if ((indexLoop < 0) || (indexLoop === this.signatureBookService.resourcesListIds.length)) {
                    indexLoop = -1;
                    break;
                }

            } while (!allResourcesUnlock.includes(this.signatureBookService.resourcesListIds[indexLoop]));

            if (indexLoop === -1) {
                this.notification.error(this.translate.instant('lang.warnResourceLockedByUser'));
            } else {
                const path: string = '/signatureBookNew/users/' + this.userId + '/groups/' + this.groupId + '/baskets/' + this.basketId + '/resources/' + this.signatureBookService.resourcesListIds[indexLoop];
                this.router.navigate([path]);
                this.unlockResource();
                this.setNextPrevEvent.emit();
            }
        }));
    }

    backToBasket(): void {
        const path = '/basketList/users/' + this.userId + '/groups/' + this.groupId + '/baskets/' + this.basketId;
        this.router.navigate([path]);
    }

    goToHome(): void {
        this.router.navigate(['/home']);
        this.unlockResource();
    }

    async unlockResource(): Promise<void> {
        const path = '/basketList/users/' + this.userId + '/groups/' + this.groupId + '/baskets/' + this.basketId;
        this.actionService.stopRefreshResourceLock();
        await this.actionService.unlockResource(this.userId, this.groupId, this.basketId, [this.resId], path);
    }
}
