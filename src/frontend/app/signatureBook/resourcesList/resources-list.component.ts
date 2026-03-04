import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { ResourcesList } from '@models/resources-list.model';
import { TranslateService } from '@ngx-translate/core';
import { SignatureBookService } from '../signature-book.service';
import { ActionsService } from '@appRoot/actions/actions.service';
import { NotificationService } from '@service/notification/notification.service';
import { Router } from '@angular/router';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { FiltersListService } from '@service/filtersList.service';
import { ListPropertiesInterface } from '@models/list-properties.model';

@Component({
    selector: 'app-resources-list',
    templateUrl: 'resources-list.component.html',
    styleUrls: ['resources-list.component.scss'],
})
export class ResourcesListComponent implements AfterViewInit, OnInit {
    @ViewChild('viewport', { static: false }) viewport: CdkVirtualScrollViewport;

    @Input() resId: number;
    @Input() basketId: number;
    @Input() groupId: number;
    @Input() userId: number;
    @Input() basketLabel: string = '';

    @Output() afterGoToResource = new EventEmitter<boolean>();
    @Output() afterInit = new EventEmitter<boolean>();
    @Output() closeDrawerResList = new EventEmitter<void>();

    resources: ResourcesList[] = [];
    selectedResourceCount: number = 0;

    loading: boolean = true;
    endList: boolean = false;

    viewportHeight: number = 0;
    firstResIdInList: number = 0;
    limit: number = 0;
    lastStartPage: number = 0;
    lastPage: number = 0;

    constructor(
        public translate: TranslateService,
        public signatureBookService: SignatureBookService,
        private actionsService: ActionsService,
        private router: Router,
        private notifications: NotificationService,
        private actionService: ActionsService,
        private filtersListService: FiltersListService
    ) { }

    async ngOnInit(): Promise<void> {
        if (this.resources.length === 0) {
            await this.initData();
        }
        this.loading = false;
        this.afterInit.emit(true);
    }

    initViewPort() {
        if (this.viewportHeight === 0) {
            this.viewportHeight = this.calculateContainerHeight();
            setTimeout(() => {
                this.scrollToSelectedResource();
            }, 0);
        }
    }

    async ngAfterViewInit() {
        this.viewport.scrolledIndexChange.subscribe(async (index: number) => {
            const end: number = this.viewport.getRenderedRange().end;
            // Check if scrolled to the end of the list
            if (!this.loading) {
                this.loading = true;
                if (index === 0 && this.lastStartPage > 0) {
                    this.lastStartPage = this.lastStartPage - 1;
                    await this.loadPreviousData();
                } else if (index > 0 && end === this.resources.length && !this.endList) {
                    this.lastPage = this.lastPage + 1;
                    await this.loadNextData();
                }
                this.loading = false;
            }
        });
    }

    async initData(): Promise<void> {

        const listProperties: ListPropertiesInterface = this.filtersListService.initListsProperties(
            this.userId,
            this.groupId,
            this.basketId,
            'basket'
        );

        const page: number = parseInt(listProperties.page);
        this.limit = listProperties.pageSize;

        this.lastStartPage = page;
        this.lastPage = page;

        // Fetch data from the backend
        const array: ResourcesList[] = await this.signatureBookService.getResourcesBasket(
            this.userId,
            this.groupId,
            this.basketId,
            this.limit,
            page
        );
        if (array.length === 0) {
            this.endList = true;
        } else {
            this.appendData(array, 'after');

            if (page > 0) {
                this.lastStartPage = this.lastStartPage - 1;
                await this.loadPreviousData(false);
            } else if (this.limit < 15) {
                this.lastPage = this.lastPage + 1;
                await this.loadNextData();
            }
        }
    }

    async loadNextData(): Promise<void> {
        // Fetch data from the backend
        const array: ResourcesList[] = await this.signatureBookService.getResourcesBasket(
            this.userId,
            this.groupId,
            this.basketId,
            this.limit,
            this.lastPage
        );
        if (array.length === 0) {
            this.endList = true;
        } else {
            this.appendData(array, 'after');
        }
    }

    async loadPreviousData(scrollTo: boolean = true): Promise<void> {
        // Fetch data from the backend
        const array: ResourcesList[] = await this.signatureBookService.getResourcesBasket(
            this.userId,
            this.groupId,
            this.basketId,
            this.limit,
            this.lastStartPage
        );
        this.appendData(array, 'before');
        if (scrollTo) {
            this.scrollToFirstResIdInList();
        }
        this.firstResIdInList = this.resources[0].resId;
    }

    appendData(data: ResourcesList[], mode: 'before' | 'after' = 'after') {
        let concatArray: ResourcesList[] = [];
        if (mode === 'before') {
            concatArray = data.concat(this.resources);
        } else if (mode === 'after') {
            concatArray = this.resources.concat(data);
        }
        this.resources = concatArray;
    }

    /**
     * Navigates to the selected resource.
     * @param resId resId resource to navigate to.
     */
    goToResource(resId: number): void {
        // Set the selected resource
        this.resId = resId;

        // Call the actions service to navigate to the resource
        const resIds: number[] = this.resources.map((resource: ResourcesList) => resource.resId);
        this.actionsService
            .goToResource(resIds, this.userId, this.groupId, this.basketId)
            .subscribe((resourcesToProcess: number[]) => {
                // Check if the resource is locked
                if (resourcesToProcess.indexOf(resId) > -1) {
                    // Emit event to close the resource list panel
                    this.afterGoToResource.emit(true);

                    // Construct the path to navigate to
                    const path: string = `/signatureBookNew/users/${this.userId}/groups/${this.groupId}/baskets/${this.basketId}/resources/${resId}`;

                    // Navigate to the resource
                    this.router.navigate([path]);

                    // Unlock the resource
                    this.unlockResource();

                } else {
                    // Notify user that the resource is locked
                    this.notifications.error(this.translate.instant('lang.warnResourceLockedByUser'));
                }
            });
    }

    async unlockResource(): Promise<void> {
        this.actionService.stopRefreshResourceLock();
        await this.actionService.unlockResource(this.userId, this.groupId, this.basketId, [this.resId]);
    }

    calculateContainerHeight(): number {
        const resourcesLength: number = this.resources.length;
        // This should be the height of your item in pixels
        const itemHeight: number = 100;
        // The final number of items to keep visible
        const visibleItems: number = 15;
        setTimeout(() => {
            /* Makes CdkVirtualScrollViewport to refresh its internal size values after
             * changing the container height. This should be delayed with a "setTimeout"
             * because we want it to be executed after the container has effectively
             * changed its height. Another option would be a resize listener for the
             * container and call this line there but it may requires a library to detect the resize event.
             * */
            this.viewport.checkViewportSize();
        }, 50);
        // It calculates the container height for the first items in the list
        // It means the container will expand until it reaches `itemSizepx`
        // and will keep this size.
        if (resourcesLength <= visibleItems) {
            return itemHeight * resourcesLength;
        }
        // This function is called from the template so it ensures the container will have
        // the final height if number of items are greater than the value in "visibleItems".
        return itemHeight * visibleItems;
    }

    /**
     * Scrolls to the selected resource.
     */
    scrollToSelectedResource(): void {
        // Get the index of the selected resource
        const index: number = this.resources.map((res) => res.resId).indexOf(this.resId);

        // If the selected resource exists in the list
        if (index !== -1) {
            this.viewport.scrollToIndex(index);
        }
    }

    scrollToFirstResIdInList(): void {
        const index: number = this.resources.map((res) => res.resId).indexOf(this.firstResIdInList);
        if (index !== -1) {
            this.viewport.scrollToIndex(index);
        }
    }

    async toggleResource(state: boolean, resource: ResourcesList) {
        const res = await this.signatureBookService.toggleSelection(state, this.userId, this.groupId, this.basketId, resource.resId);
        if (!res) {
            this.notifications.error(this.translate.instant('lang.emptyDocsToSign'));
            resource.selected = false;
        }
        this.selectedResourceCount = this.resources.filter((res => res.selected)).length;
        this.signatureBookService.selectedResourceCount = this.selectedResourceCount;
    }
}
