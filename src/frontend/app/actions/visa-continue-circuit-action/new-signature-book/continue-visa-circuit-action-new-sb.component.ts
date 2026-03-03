import { Component, OnInit, Inject, ViewChild, ViewContainerRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import {
    MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
    MatLegacyDialogRef as MatDialogRef,
} from '@angular/material/legacy-dialog';
import { HttpClient } from '@angular/common/http';
import { NoteEditorComponent } from '../../../notes/note-editor.component';
import { tap, finalize, catchError } from 'rxjs/operators';
import { Subscription, of } from 'rxjs';
import { FunctionsService } from '@service/functions.service';
import { VisaWorkflowComponent } from '../../../visa/visa-workflow.component';
import { PluginManagerService } from '@service/plugin-manager.service';
import { AuthService } from '@service/auth.service';
import { HeaderService } from '@service/header.service';
import { SignatureBookService } from '@appRoot/signatureBook/signature-book.service';
import { ContinueVisaCircuitDataToSendInterface, ContinueVisaCircuitObjectInterface } from "@models/actions.model";
import { MatSidenav } from "@angular/material/sidenav";
import { Attachment } from "@models/attachment.model";
import { MaarchPluginFortifyInterface } from '@models/maarch-plugin-fortify-model';
import { StripTagsPipe } from 'ngx-pipes';
import { Router } from '@angular/router';

@Component({
    templateUrl: 'continue-visa-circuit-action-new-sb.component.html',
    styleUrls: ['continue-visa-circuit-action-new-sb.component.scss'],
    providers: [StripTagsPipe]
})
export class ContinueVisaCircuitActionNewSbComponent implements OnInit {
    @ViewChild('myPlugin', { read: ViewContainerRef, static: false }) myPlugin: ViewContainerRef;
    @ViewChild('noteEditor', { static: false }) noteEditor: NoteEditorComponent;
    @ViewChild('appVisaWorkflow', { static: false }) appVisaWorkflow: VisaWorkflowComponent;
    @ViewChild('snav2', { static: false }) public snav2: MatSidenav;

    subscription: Subscription;

    loading: boolean = false;

    resourcesMailing: any[] = [];
    resourcesWarnings: any[] = [];
    resourcesErrors: any[] = [];

    noResourceToProcess: boolean = null;
    componentInstance: any = null;

    parameters: { digitalCertificate: boolean } = {
        digitalCertificate: true
    }

    noteExpanded: boolean = false;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        public dialogRef: MatDialogRef<ContinueVisaCircuitActionNewSbComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public functions: FunctionsService,
        public signatureBookService: SignatureBookService,
        private notify: NotificationService,
        private pluginManagerService: PluginManagerService,
        private authService: AuthService,
        private headerService: HeaderService,
        private router: Router
    ) {}

    async ngOnInit(): Promise<void> {
        this.loading = true;
        if (this.router.url.indexOf('basketList') > -1) {
            this.signatureBookService.selectedResources = [];
            for (let i = 0; i < this.data.resIds.length; i++) {
                await this.signatureBookService.toggleSelection(true, this.data.userId, this.data.groupId, this.data.basketId, this.data.resIds[i]);
            }
            this.data = {
                ... this.data,
                resource: {
                    docsToSign: this.signatureBookService.selectedResources
                }
            }
        }
        await this.checkSignatureBook();
        this.loading = false;
    }

    checkSignatureBook() {
        this.resourcesErrors = [];
        this.resourcesWarnings = [];

        return new Promise((resolve) => {
            this.http
                .post(
                    '../rest/resourcesList/users/' +
                        this.data.userId +
                        '/groups/' +
                        this.data.groupId +
                        '/baskets/' +
                        this.data.basketId +
                        '/actions/' +
                        this.data.action.id +
                        '/checkContinueVisaCircuit',
                    { resources: this.data.resIds }
                )
                .subscribe(
                    (data: any) => {
                        if (!this.functions.empty(data.resourcesInformations.warning)) {
                            this.resourcesWarnings = (data.resourcesInformations.warning as any[]).filter((warning: any) => warning.reason !== 'userHasntSigned');
                        }

                        if (!this.functions.empty(data.resourcesInformations.error)) {
                            this.resourcesErrors = data.resourcesInformations.error;
                            this.noResourceToProcess = this.resourcesErrors.length === this.data.resIds.length;
                        }
                        if (data.resourcesInformations.success) {
                            data.resourcesInformations.success.forEach((value: any) => {
                                if (value.mailing) {
                                    this.resourcesMailing.push(value);
                                }
                            });
                        }
                        resolve(true);
                    },
                    (err: any) => {
                        this.notify.handleSoftErrors(err);
                        this.dialogRef.close();
                    }
                );
        });
    }

    async onSubmit() {
        this.loading = true;
        const realResSelected: number[] = this.data.resIds.filter(
            (resId: any) => this.resourcesErrors.map((resErr) => resErr.res_id).indexOf(resId) === -1
        );
        this.noteExpanded = true;
        this.signatureBookService.config.url = this.signatureBookService.config.url?.replace(/\/$/, '')
        this.componentInstance = await this.pluginManagerService.initPlugin(
            'maarch-plugins-fortify',
            this.myPlugin,
            this.setPluginData()
        );
        if (this.componentInstance) {
            this.componentInstance
                .open()
                .pipe(
                    tap((data: any) => {
                        if (!this.functions.empty(data) && typeof data === 'object') {
                            this.executeAction(realResSelected, this.formatDataToSend(data));
                        } else if (!data) {
                            this.loading = false;
                            this.noteExpanded = false;
                        }
                    }),
                    catchError((err: any) => {
                        this.notify.handleSoftErrors(err);
                        return of(false);
                    })
                ).subscribe();
        } else {
            this.loading  = false;
            this.noteExpanded = false;
        }
    }

    executeAction(realResSelected: number[], objToSend: ContinueVisaCircuitObjectInterface = null) {
        const dataToSend : ContinueVisaCircuitDataToSendInterface = {
            resources : realResSelected,
            note: this.noteEditor.getNote(),
            data: { ...objToSend, digitalCertificate: this.parameters.digitalCertificate },
        };
        this.http
            .put(this.data.processActionRoute, dataToSend)
            .pipe(
                tap((data: any) => {
                    if (!data) {
                        this.dialogRef.close(realResSelected);
                    }
                    if (data && data.errors != null) {
                        this.notify.error(data.errors);
                    }
                }),
                finalize(() => (this.loading = false)),
                catchError((err: any) => {
                    this.loading = false;
                    this.noteExpanded = false;
                    this.notify.handleSoftErrors(err);
                    return of(false);
                })
            )
            .subscribe();
    }

    formatDataToSend(data: any[]): ContinueVisaCircuitObjectInterface {
        const formatedData: ContinueVisaCircuitObjectInterface = {} as ContinueVisaCircuitObjectInterface;

        for (const item of data) {
            const mainDocResId: number = item.resIdMaster ?? item.resId;
            if (!formatedData[mainDocResId]) {
                formatedData[mainDocResId] = [];
            }
            formatedData[mainDocResId].push(item);
        }
        return formatedData;
    }

    isValidAction() {
        return !this.noResourceToProcess;
    }

    atLeastOneDocumentHasNoStamp(): boolean {
        if (this.data.resource.docsToSign.length > 0) {
            return (this.data.resource.docsToSign as Attachment[]).some((resource: Attachment) => resource.stamps.length === 0);
        }
        return false;
    }

    setPluginData(): MaarchPluginFortifyInterface {
        const data: MaarchPluginFortifyInterface = {
            functions: this.functions,
            notification: this.notify,
            translate: this.translate,
            pluginUrl: this.authService.maarchUrl.replace(/\/$/, '') + '/plugins/maarch-plugins',
            additionalInfo: {
                resources: this.data.resource.docsToSign,
                sender: `${this.headerService.user.firstname} ${this.headerService.user.lastname}`,
                externalUserId: this.headerService.user.externalId,
                signatureBookConfig: this.signatureBookService.config,
                digitalCertificate: this.parameters.digitalCertificate
            },
        };
        return data;
    }
}
