import { Component, OnInit, Output, Input, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { tap, finalize, catchError, filter, exhaustMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { trigger, transition, style, animate } from '@angular/animations';
import { AttachmentPageComponent } from './attachments-page/attachment-page.component';
import { AttachmentCreateComponent } from './attachment-create/attachment-create.component';
import { ConfirmComponent } from '../../plugins/modal/confirm.component';
import { PrivilegeService } from '@service/privileges.service';
import { HeaderService } from '@service/header.service';
import { VisaWorkflowModalComponent } from '../visa/modal/visa-workflow-modal.component';
import { AppService } from '@service/app.service';
import { ExternalSignatoryBookManagerService } from '@service/externalSignatoryBook/external-signatory-book-manager.service';
import { FunctionsService } from '@service/functions.service';
import { ActivatedRoute } from '@angular/router';
import { SignatureBookService } from '@appRoot/signatureBook/signature-book.service';

@Component({
    selector: 'app-attachments-list',
    templateUrl: 'attachments-list.component.html',
    styleUrls: ['attachments-list.component.scss'],
    providers: [ExternalSignatoryBookManagerService],
    animations: [
        trigger(
            'myAnimation',
            [
                transition(
                    ':enter', [
                        style({ transform: 'translateY(-10%)', opacity: 0 }),
                        animate('150ms', style({ transform: 'translateY(0)', 'opacity': 1 }))
                    ]
                ),
                transition(
                    ':leave', [
                        style({ transform: 'translateY(0)', 'opacity': 1 }),
                        animate('150ms', style({ transform: 'translateY(-10%)', 'opacity': 0 })),
                    ]
                )]
        )
    ],
})
export class AttachmentsListComponent implements OnInit {


    @Input() injectDatas: any;
    @Input() resId: number = null;
    @Input() target: string = 'panel';
    @Input() autoOpenCreation: boolean = false;
    @Input() canModify: boolean = null;
    @Input() canDelete: boolean = null;
    @Input() isModal: boolean = false;

    @Output() reloadBadgeAttachments = new EventEmitter<string>();
    @Output() afterActionAttachment = new EventEmitter<string | {id: string, attachment: object}>();

    integrationTargets: any[] = [
        {
            id: 'all',
            label: this.translate.instant('lang.allIntegratedAttachments'),
            description: this.translate.instant('lang.allIntegratedAttachmentsDesc')
        },
        {
            id: 'inSignatureBook',
            label: this.translate.instant('lang.attachInSignatureBook'),
            description: this.translate.instant('lang.attachInSignatureBookDesc')
        },
        {
            id: 'sign',
            label: this.translate.instant('lang.attachmentToSign'),
            description: this.translate.instant('lang.signTargetDesc')
        },
        {
            id: 'annex',
            label: this.translate.instant('lang.attachmentAnnex'),
            description: this.translate.instant('lang.annexTargetDesc')
        },
    ];

    attachments: any[] = [];
    attachmentsClone: any[] = [];
    loading: boolean = true;
    pos = 0;
    mailevaEnabled: boolean = false;
    hideMainInfo: boolean = false;

    filterAttachTypes: any[] = [];
    attachmentTypes: any[] = [];

    currentFilter: string = '';
    currentIntegrationTarget: string = 'inSignatureBook';

    dialogRef: MatDialogRef<any>;

    groupId: any = null;

    downloadingProof: boolean = false;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        public dialog: MatDialog,
        public appService: AppService,
        public externalSignatoryBook: ExternalSignatoryBookManagerService,
        public functions: FunctionsService,
        public signatureBookService: SignatureBookService,
        private notify: NotificationService,
        private headerService: HeaderService,
        private privilegeService: PrivilegeService,
        private route: ActivatedRoute
    ) { }

    async ngOnInit(): Promise<void> {
        await this.loadAttachmentTypes();
        if (this.autoOpenCreation) {
            this.createAttachment();
        }
        this.currentIntegrationTarget = this.isModal ? 'inSignatureBook' : 'all';
        this.route.params.subscribe(async (param: any) => {
            if (this.resId !== null) {
                this.http.get(`../rest/resources/${this.resId}/attachments`).pipe(
                    tap((data: any) => {
                        this.mailevaEnabled = data.mailevaEnabled;
                        this.attachments = data.attachments;
                        this.attachments = this.attachments.map((attachment: any) => ({
                            ... attachment,
                            signable: this.attachmentTypes.find((type: any) => type.typeId === attachment.type).signable
                        }));
                        this.attachments.forEach((element: any) => {
                            if (this.filterAttachTypes.filter(attachType => attachType.id === element.type).length === 0) {
                                this.filterAttachTypes.push({
                                    id: element.type,
                                    label: element.typeLabel,
                                    signable: element.signable
                                });
                            }
                            element.thumbnailUrl = '../rest/attachments/' + element.resId + '/thumbnail';
                        });
                        this.groupId = param['groupSerialId'];
                        this.attachmentsClone = JSON.parse(JSON.stringify(this.attachments));
                        this.attachments = this.isModal ? this.attachmentsClone.filter((attachment: any) => attachment.inSignatureBook && attachment.status === 'A_TRA') : this.attachmentsClone;
                        if (this.isModal) {
                            this.setTaget('inSignatureBook');
                        }
                    }),
                    finalize(() => this.loading = false),
                    catchError((err: any) => {
                        this.notify.handleErrors(err);
                        return of(false);
                    })
                ).subscribe();
            }
        });
    }

    loadAttachments(resId: number) {
        this.route.params.subscribe((param: any) => {
            const timeStamp = +new Date();
            this.resId = resId;
            this.loading = true;
            this.filterAttachTypes = [];
            this.http.get('../rest/resources/' + this.resId + '/attachments').pipe(
                tap((data: any) => {
                    this.mailevaEnabled = data.mailevaEnabled;
                    this.attachments = data.attachments;
                    this.attachments = this.attachments.map((attachment: any) => ({
                        ... attachment,
                        signable: this.attachmentTypes.find((type: any) => type.typeId === attachment.type).signable
                    }));
                    this.attachments.forEach((element: any) => {
                        if (this.filterAttachTypes.filter(attachType => attachType.id === element.type).length === 0) {
                            this.filterAttachTypes.push({
                                id: element.type,
                                label: element.typeLabel,
                                signable: element.signable
                            });
                        }
                        element.thumbnailUrl = '../rest/attachments/' + element.resId + '/thumbnail?tsp=' + timeStamp;
                    });
                    this.attachmentsClone = JSON.parse(JSON.stringify(this.attachments));
                    if (this.attachments.filter((attach: any) => attach.type === this.currentFilter).length === 0) {
                        this.currentFilter = '';
                    }
                    this.reloadBadgeAttachments.emit(`${this.attachments.length}`);
                    this.afterActionAttachment.emit('setInSignatureBook');
                    this.loading = false;
                }),
                catchError((err: any) => {
                    this.notify.handleSoftErrors(err.error.errors);
                    return of(false);
                })
            ).subscribe();
        });
    }

    setInSignatureBook(attachment: any) {
        this.http.put('../rest/attachments/' + attachment.resId + '/inSignatureBook', {}).pipe(
            tap(() => {
                attachment.inSignatureBook = !attachment.inSignatureBook;
                this.afterActionAttachment.emit({ id: 'setInSignatureBook', attachment: attachment });
                this.notify.success(this.translate.instant('lang.actionDone'));
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err.error.errors);
                return of(false);
            })
        ).subscribe();
    }

    setInSendAttachment(attachment: any) {
        this.http.put('../rest/attachments/' + attachment.resId + '/inSendAttachment', {}).pipe(
            tap(() => {
                attachment.inSendAttach = !attachment.inSendAttach;
                this.afterActionAttachment.emit('setInSendAttachment');
                this.notify.success(this.translate.instant('lang.actionDone'));
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err.error.errors);
                return of(false);
            })
        ).subscribe();
    }

    toggleInfo(attachment: any, state: boolean) {
        this.attachments.forEach((element: any) => {
            element.hideMainInfo = false;
        });
        attachment.hideMainInfo = state;
    }

    resetToggleInfo() {
        this.attachments.forEach((element: any) => {
            element.hideMainInfo = false;
        });
    }

    showAttachment(attachment: any) {
        this.dialogRef = this.dialog.open(AttachmentPageComponent, { height: '99vh', width: this.appService.getViewMode() ? '99vw' : '90vw', maxWidth: this.appService.getViewMode() ? '99vw' : '90vw', panelClass: 'attachment-modal-container', disableClose: true, data: { resId: attachment.resId, editMode : attachment.canUpdate } });

        this.dialogRef.afterClosed().pipe(
            filter((data: string) => data === 'success'),
            tap(() => {
                this.loadAttachments(this.resId);
            }),
            catchError((err: any) => {
                this.notify.handleErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    createAttachment() {
        this.dialogRef = this.dialog.open(AttachmentCreateComponent, { disableClose: true, panelClass: 'attachment-modal-container', height: '90vh', width: this.appService.getViewMode() ? '99vw' : '90vw', maxWidth: this.appService.getViewMode() ? '99vw' : '90vw', data: { resIdMaster: this.resId } });

        this.dialogRef.afterClosed().pipe(
            filter((data: string) => data === 'success'),
            tap(() => {
                this.loadAttachments(this.resId);
                this.afterActionAttachment.emit('setInSendAttachment');
            }),
            catchError((err: any) => {
                this.notify.handleErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    deleteAttachment(attachment: any) {
        this.dialogRef = this.dialog.open(ConfirmComponent, { panelClass: 'maarch-modal', autoFocus: false, disableClose: true, data: { title: this.translate.instant('lang.delete'), msg: this.translate.instant('lang.confirmAction') } });
        this.dialogRef.afterClosed().pipe(
            filter((data: string) => data === 'ok'),
            exhaustMap(() => this.http.delete(`../rest/attachments/${attachment.resId}`)),
            tap(() => {
                this.loadAttachments(this.resId);
                this.afterActionAttachment.emit('setInSendAttachment');
                this.notify.success(this.translate.instant('lang.attachmentDeleted'));
            }),
            catchError((err: any) => {
                this.notify.handleErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    filterType(ev: any) {
        this.currentFilter = ev.value;
    }

    openExternalSignatoryBookWorkflow(attachment: any) {
        this.dialog.open(VisaWorkflowModalComponent, {
            panelClass: 'maarch-modal',
            data: {
                id: attachment.resId,
                type: 'attachment',
                title: this.translate.instant(`lang.${this.externalSignatoryBook.signatoryBookEnabled}Workflow`),
                linkedToExternalSignatoryBook: true
            }
        });
    }

    getTitle(): string {
        return !this.externalSignatoryBook.canViewWorkflow() ? this.translate.instant('lang.unavailableForSignatoryBook') : this.translate.instant('lang.' + this.externalSignatoryBook.signatoryBookEnabled + 'Workflow');
    }

    loadAttachmentTypes() {
        return new Promise((resolve) => {
            this.http.get('../rest/attachmentsTypes').pipe(
                tap((data: any) => {
                    Object.keys(data.attachmentsTypes).forEach((type: any) => {
                        this.attachmentTypes.push({
                            typeId: data.attachmentsTypes[type].typeId,
                            signable: data.attachmentsTypes[type].signable
                        });
                    });

                    resolve(true);
                }),
                catchError((err: any) => {
                    this.notify.handleSoftErrors(err);
                    this.dialogRef.close('');
                    return of(false);
                })
            ).subscribe();
        });
    }

    setTaget(target: string): void {
        this.filterAttachTypes = [];
        this.attachmentsClone.forEach((element: any) => {
            if (this.filterAttachTypes.filter(attachType => attachType.id === element.type).length === 0) {
                this.filterAttachTypes.push({
                    id: element.type,
                    label: element.typeLabel,
                    signable: element.signable
                });
            }
        });
        const attachmentsWithValidStatus: any[] = this.attachmentsClone.filter((attachment: any) => attachment.status === 'A_TRA');
        const filterAttachTypesClone: any[] = JSON.parse(JSON.stringify(this.filterAttachTypes));
        this.currentIntegrationTarget = target;
        this.currentFilter = '';
        if (target === 'all') {
            this.attachments = this.attachmentsClone;
        } else if (target === 'sign') {
            this.attachments = attachmentsWithValidStatus.filter((attachment: any) => attachment.inSignatureBook && attachment.signable);
        } else if (target === 'annex') {
            this.attachments = attachmentsWithValidStatus.filter((attachment: any) => attachment.inSignatureBook && !attachment.signable);
        } else if (target === 'inSignatureBook') {
            this.attachments = attachmentsWithValidStatus.filter((attachment: any) => attachment.inSignatureBook);
        }
        const attachTypes: string[] = this.attachments.map((attachment: any) => attachment.type);
        this.filterAttachTypes = filterAttachTypesClone.filter((element: any) => attachTypes.indexOf(element.id) > -1);
    }

    async downloadProof(data: { resId: number, chrono: string }): Promise<void> {
        this.downloadingProof = true;
        await this.signatureBookService.downloadProof(data, true).then(() => this.downloadingProof = false);
    }
}
