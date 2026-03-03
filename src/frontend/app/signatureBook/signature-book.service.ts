import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Attachment } from "@models/attachment.model";
import { ResourcesList } from "@models/resources-list.model";
import { FiltersListService } from "@service/filtersList.service";
import { HeaderService } from "@service/header.service";
import { NotificationService } from "@service/notification/notification.service";
import { catchError, map, of, tap } from "rxjs";
import { mapAttachment } from "./signature-book.utils";
import { SignatureBookConfig, SignatureBookConfigInterface } from "@models/signature-book.model";
import { SelectedAttachment } from "@models/signature-book.model";
import { TranslateService } from "@ngx-translate/core";
import { BasketGroupListActionInterface } from "@appRoot/administration/basket/list/list-administration.component";
import { FunctionsService } from "@service/functions.service";

@Injectable({
    providedIn: 'root'
})
export class SignatureBookService {

    toolBarActive: boolean = false;
    resourcesListIds: number[] = [];
    docsToSign: Attachment[] = [];
    basketLabel: string = '';
    config: SignatureBookConfig = new SignatureBookConfig();

    selectedAttachment: SelectedAttachment = new SelectedAttachment();

    selectedDocToSign: SelectedAttachment = new SelectedAttachment();

    selectedResources: Attachment[] = [];

    selectedResourceCount: number = 0;

    basketGroupActions: BasketGroupListActionInterface[] = []

    constructor(
        private http: HttpClient,
        private notifications: NotificationService,
        private filtersListService: FiltersListService,
        private headerService: HeaderService,
        private translate: TranslateService,
        private functions: FunctionsService
    ) {}

    getInternalSignatureBookConfig(): Promise<SignatureBookConfigInterface | null> {
        return new Promise((resolve) => {
            this.http.get('../rest/signatureBook/config').pipe(
                tap((config: SignatureBookConfigInterface) => {
                    this.config = new SignatureBookConfig(config);
                    resolve(config);
                }),
                catchError((err: any) => {
                    this.notifications.handleSoftErrors(err);
                    resolve(null);
                    return of(false);
                })
            ).subscribe();
        })
    }

    initDocuments(userId: number, groupId: number, basketId:number, resId: number): Promise<{ resourcesToSign: Attachment[], resourcesAttached: Attachment[] } | null> {
        return new Promise((resolve) => {
            this.http.get(`../rest/signatureBook/users/${userId}/groups/${groupId}/baskets/${basketId}/resources/${resId}`).pipe(
                map((data: any) => {
                    // Mapping resources to sign
                    const resourcesToSign: Attachment[] = data?.resourcesToSign?.map((resource: any) => mapAttachment(resource)) ?? [];

                    // Mapping resources attached as annex
                    const resourcesAttached: Attachment[] = data?.resourcesAttached?.map((attachment: any) => mapAttachment(attachment)) ?? [];

                    return { resourcesToSign: resourcesToSign, resourcesAttached: resourcesAttached };
                }),
                tap((data: { resourcesToSign: Attachment[], resourcesAttached: Attachment[] }) => {
                    resolve(data);
                }),
                catchError((err: any) => {
                    this.notifications.handleErrors(err);
                    resolve(null);
                    return of(false);
                })
            ).subscribe();
        });
    }

    getResourcesBasket(userId: number, groupId: number, basketId: number, limit: number,  page: number): Promise<ResourcesList[] | []> {
        return new Promise((resolve) => {
            const offset = page * limit;
            const filters: string = this.filtersListService.getUrlFilters();

            this.http.get(`../rest/resourcesList/users/${userId}/groups/${groupId}/baskets/${basketId}?limit=${limit}&offset=${offset}${filters}`).pipe(
                map((result: any) => {
                    this.resourcesListIds = result.allResources;
                    this.basketLabel = result.basketLabel;

                    if (result.defaultAction.data?.actions?.length > 0) {
                        this.basketGroupActions = JSON.parse(JSON.stringify(result.defaultAction.data.actions));
                    }

                    const resourcesList: ResourcesList[] = result.resources.map((resource: any) => new ResourcesList({
                        resId: resource.resId,
                        subject: resource.subject,
                        chrono: resource.chrono,
                        statusImage: resource.statusImage,
                        statusLabel: resource.statusLabel,
                        priorityColor: resource.priorityColor,
                        mailTracking: resource.mailTracking,
                        creationDate: resource.creationDate,
                        processLimitDate: resource.processLimitDate,
                        isLocked: resource.isLocked,
                        locker: resource.locker
                    }));
                    return resourcesList;
                }),
                tap((data: any) => {
                    resolve(data);
                }),
                catchError((err: any) => {
                    this.notifications.handleSoftErrors(err);
                    resolve([]);
                    return of(false);
                })
            ).subscribe();
        });
    }

    toggleMailTracking(resource: ResourcesList) {
        if (!resource.mailTracking) {
            this.followResources(resource);
        } else {
            this.unFollowResources(resource);
        }
    }

    followResources(resource: ResourcesList): void {
        this.http.post('../rest/resources/follow', { resources: [resource.resId] }).pipe(
            tap(() => {
                this.headerService.nbResourcesFollowed++;
                resource.mailTracking = !resource.mailTracking;
            }),
            catchError((err: any) => {
                this.notifications.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    unFollowResources(resource: ResourcesList): void {
        this.http.delete('../rest/resources/unfollow', { body: { resources: [resource.resId] } }).pipe(
            tap(() => {
                this.headerService.nbResourcesFollowed--;
                resource.mailTracking = !resource.mailTracking;
            }),
            catchError((err: any) => {
                this.notifications.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    downloadProof(data: {resId: number, chrono: string}, isAttachment: boolean): Promise<boolean> {
        const type: string = isAttachment ? 'attachments' : 'resources';
        return new Promise((resolve) => {
            this.http.get(`../rest/${type}/${data.resId}/proofSignature`, { responseType: 'blob' as 'json' })
                .pipe(
                    tap((result: any) => {
                        let chronoOrResId: string = data.resId.toString();
                        if (!this.functions.empty(data.chrono)) {
                            chronoOrResId = data.chrono.replace(/\//g, '_');
                        }
                        const filename = 'proof_' + chronoOrResId + '.' + result.type.replace('application/', '');
                        const downloadLink = document.createElement('a');
                        downloadLink.href = window.URL.createObjectURL(result);
                        downloadLink.setAttribute('download', filename);
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        resolve(true);
                    }),
                    catchError((err: any) => {
                        if (err.status === 400) {
                            this.notifications.handleErrors(this.translate.instant('lang.externalIdNotFoundProblemProof'));
                        } else {
                            this.notifications.handleSoftErrors(err);
                        }
                        resolve(false);
                        return of(false);
                    })
                ).subscribe();
        });
    }

    async toggleSelection(checked: boolean, userId: number, groupId: number, basketId: number, resId: number): Promise<boolean> {
        if (checked) {
            const res: Attachment[] = (await this.initDocuments(userId, groupId, basketId, resId)).resourcesToSign;
            this.selectedResources = this.selectedResources.concat(res);
            if (res.length === 0) {
                return false;
            }
        } else {
            this.selectedResources = this.selectedResources.filter((doc: Attachment) => doc.resIdMaster !== resId);
        }
        return true;
    }

    getAllDocsToSign(): Attachment[] {
        this.docsToSign.forEach((resource: Attachment) => {
            const findResource: Attachment = this.selectedResources.find((doc: Attachment) => doc.resId === resource.resId);
            if (findResource === undefined) {
                this.selectedResources.push(resource);
            } else {
                const index: number = this.selectedResources.indexOf(findResource);
                this.selectedResources[index] = resource;
            }
        });

        // Filter the selectedResources array to remove duplicate entries based on resId
        this.selectedResources = this.selectedResources.filter((resource: Attachment, index: number, self: Attachment[]) =>
            // Keep the current resource only if it is the first occurrence of this resId in the array
            index === self.findIndex((t) => t.resId === resource.resId)
        );


        return this.selectedResources;
    }
}
