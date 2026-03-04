import { Component, Inject, AfterViewInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { DocumentViewerComponent } from '../document-viewer.component';

@Component({
    templateUrl: 'document-viewer-modal.component.html',
    styleUrls: ['document-viewer-modal.component.scss'],
})
export class DocumentViewerModalComponent implements AfterViewInit {

    @ViewChild('appDocumentViewer', { static: false }) appDocumentViewer: DocumentViewerComponent;

    loading: boolean = false;

    constructor(public translate: TranslateService, public dialogRef: MatDialogRef<DocumentViewerModalComponent>, @Inject(MAT_DIALOG_DATA) public data: any) { }

    createNewVersion() {
        this.dialogRef.close('createNewVersion');
    }

    ngAfterViewInit(): void {
        if (this.data?.source === 'mailEditor') {
            this.appDocumentViewer.file.content = this.data.content;
            this.appDocumentViewer.file.contentMode = this.data.contentMode;
        }
    }
}
