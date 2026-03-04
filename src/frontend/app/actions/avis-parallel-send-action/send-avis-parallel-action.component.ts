import { Component, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { HttpClient } from '@angular/common/http';
import { NoteEditorComponent } from '../../notes/note-editor.component';
import { tap, finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { FunctionsService } from '@service/functions.service';
import { AvisWorkflowComponent } from '../../avis/avis-workflow.component';
import { HeaderService } from '@service/header.service';
import { SessionStorageService } from '@service/session-storage.service';
import { AlertComponent } from '@plugins/modal/alert.component';

@Component({
    templateUrl: 'send-avis-parallel-action.component.html',
    styleUrls: ['send-avis-parallel-action.component.scss'],
})
export class SendAvisParallelComponent implements AfterViewInit {

    @ViewChild('noteEditor', { static: true }) noteEditor: NoteEditorComponent;
    @ViewChild('appAvisWorkflow', { static: false }) appAvisWorkflow: AvisWorkflowComponent;

    alertDialogRef: MatDialogRef<AlertComponent>;

    loading: boolean = false;

    resourcesError: any[] = [];

    noResourceToProcess: boolean = null;

    opinionLimitDate: Date = null;

    today: Date = new Date();

    availableRoles: any[] = [];

    delegation: any = {
        isDelegated: false,
        userDelegated: null
    };

    canGoToNextRes: boolean = false;
    showToggle: boolean = false;
    inLocalStorage: boolean = false;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        private notify: NotificationService,
        public dialogRef: MatDialogRef<SendAvisParallelComponent>,
        public headerService: HeaderService,
        public dialog: MatDialog,
        public functions: FunctionsService,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private sessionStorage: SessionStorageService
    ) { }

    async ngAfterViewInit(): Promise<void> {
        this.showToggle = this.data.additionalInfo.showToggle;
        this.canGoToNextRes = this.data.additionalInfo.canGoToNextRes;
        this.inLocalStorage = this.data.additionalInfo.inLocalStorage;
        if (this.data.resIds.length === 1) {
            await this.appAvisWorkflow.loadParallelWorkflow(this.data.resIds[0]);
            if (this.appAvisWorkflow.emptyWorkflow()) {
                this.appAvisWorkflow.loadDefaultWorkflow(this.data.resIds[0]);
            }
            const userId: number = parseInt(this.data.userId, 10);
            this.delegation.isDelegated = userId !== this.headerService.user.id ? true : false;
            if (this.delegation.isDelegated && !this.noResourceToProcess) {
                this.http.get('../rest/users/' + userId).pipe(
                    tap((user: any) => {
                        this.delegation.userDelegated = `${user.firstname} ${user.lastname}`;
                    })
                ).subscribe();
            }
        }
    }

    async onSubmit() {
        const allowMultipleAvis: boolean = await this.getAvisParameter();
        const hasDuplicateUsersWithSameMode = this.hasDuplicateUsersWithSameMode(this.appAvisWorkflow.avisWorkflow.items);

        if (!allowMultipleAvis && hasDuplicateUsersWithSameMode) {
            this.alertDialogRef = this.dialog.open(AlertComponent, {
                panelClass: 'maarch-modal',
                autoFocus: false,
                disableClose: true,
                data: {
                    title: this.translate.instant('lang.warning'),
                    msg: this.translate.instant('lang.duplicateUsersWithSameMode')
                }
            });
        } else {
            this.loading = true;
            if (this.data.resIds.length === 0) {
                const res = await this.indexDocument();
                if (res) {
                    this.executeAction(this.data.resIds);
                }
            } else {
                const realResSelected: number[] = this.data.resIds.filter((resId: any) => this.resourcesError.map(resErr => resErr.res_id).indexOf(resId) === -1);
                this.sessionStorage.checkSessionStorage(this.inLocalStorage, this.canGoToNextRes, this.data);
                this.executeAction(realResSelected);
            }
            this.loading = false;
        }
    }


    indexDocument() {
        return new Promise((resolve) => {
            this.http.post('../rest/resources', this.data.resource).pipe(
                tap((data: any) => {
                    this.data.resIds = [data.resId];
                    resolve(true);
                }),
                catchError((err: any) => {
                    this.notify.handleErrors(err);
                    resolve(false);
                    return of(false);
                })
            ).subscribe();
        });
    }

    executeAction(realResSelected: number[]) {
        const opinionUserState: string = this.translate.instant('lang.requestedOpinion').concat(' ', this.delegation.userDelegated);
        const noteContent: string = this.delegation.isDelegated ? `[${this.translate.instant('lang.avisUserAsk').toUpperCase()}] ${this.noteEditor.getNoteContent()} ← ${opinionUserState}` : `[${this.translate.instant('lang.avisUserAsk').toUpperCase()}] ${this.noteEditor.getNoteContent()}`;
        this.noteEditor.setNoteContent(noteContent);
        this.http.put(this.data.processActionRoute, { resources: realResSelected, note: this.noteEditor.getNote(), data: { opinionLimitDate: this.functions.formatDateObjectToDateString(this.opinionLimitDate, true, 'yyyy-mm-dd'), opinionCircuit : this.appAvisWorkflow.getWorkflow() } }).pipe(
            tap((data: any) => {
                if (!data) {
                    this.dialogRef.close(realResSelected);
                }
                if (data && data.errors != null) {
                    this.notify.error(data.errors);
                }
            }),
            finalize(() => this.loading = false),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    isValidAction() {
        return !this.noResourceToProcess && this.appAvisWorkflow !== undefined && !this.appAvisWorkflow.emptyWorkflow() && !this.appAvisWorkflow.workflowEnd() && !this.functions.empty(this.noteEditor.getNoteContent()) && !this.functions.empty(this.functions.formatDateObjectToDateString(this.opinionLimitDate));
    }

    /**
    * Checks if there are users in avis workflow with multiple same modes
    * @param items avis workflow containing users data.
    * @returns True if some users have multiple same modes, false otherwise.
    */
    hasDuplicateUsersWithSameMode(items: any[]): boolean {
        const userModes: { [key: string]: Set<string> } = {};
        for (const item of items) {
            const userId = item.item_id.toString();
            const mode = item.item_mode;
            if (!userModes[userId]) {
                userModes[userId] = new Set([mode]);
            } else if (!userModes[userId].has(mode)) {
                userModes[userId].add(mode);
            } else {
                return true;
            }
        }
        return false;
    }

    getAvisParameter(): Promise<boolean> {
        return new Promise((resolve) => {
            this.http.get('../rest/parameters/allowMultipleAvisAssignment').pipe(
                tap((data: any) => {
                    resolve(data.parameter.param_value_int === 1 ?? false);
                }),
                catchError(() => {
                    resolve(false);
                    return of(false);
                })
            ).subscribe();
        });
    }

}
