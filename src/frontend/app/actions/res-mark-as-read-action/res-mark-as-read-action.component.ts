import { Component, Inject, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { HttpClient } from '@angular/common/http';
import { NoteEditorComponent } from '../../notes/note-editor.component';
import { tap, finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
    selector: 'app-res-mark-as-read-action.component',
    templateUrl: './res-mark-as-read-action.component.html',
    styleUrls: ['./res-mark-as-read-action.component.scss'],
})
export class ResMarkAsReadActionComponent {

    @ViewChild('noteEditor', { static: true }) noteEditor: NoteEditorComponent;

    loading: boolean = false;

    constructor(
        public translate: TranslateService,
        public http: HttpClient, private notify: NotificationService,
        public dialogRef: MatDialogRef<ResMarkAsReadActionComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) { }

    onSubmit() {
        this.loading = true;
        if (this.data.resIds.length > 0) {
            this.executeAction();
        }
    }

    executeAction() {
        this.http.put(this.data.processActionRoute, { resources: this.data.resIds, data: { basketId: this.data.basketId }, note: this.noteEditor.getNote() }).pipe(
            tap(() => {
                this.dialogRef.close(this.data.resIds);
            }),
            finalize(() => this.loading = false),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

}
