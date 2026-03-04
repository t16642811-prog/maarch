import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { catchError, filter, of, tap } from 'rxjs';
import { FunctionsService } from './functions.service';
import { BinaryFile } from '@models/binary-file.model';
import { NotificationService } from './notification/notification.service';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { LoaderComponent } from '@plugins/modal/loader.component';

@Injectable({
    providedIn: 'root'
})
export class LadService {

    dialogRef: MatDialogRef<LoaderComponent>;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        private notificationService: NotificationService,
        private functions: FunctionsService,
        public dialog: MatDialog,
    ) { }

    initLad() {
        this.dialogRef = this.dialog.open(LoaderComponent, { panelClass: 'maarch-modal', autoFocus: false, disableClose: true, data: { msg: `${this.translate.instant('lang.mercureLadProcessingDocument')}...` } });
    }

    endLad() {
        this.dialogRef.close();
    }

    launchLadProcess(file: BinaryFile) {

        return new Promise((resolve) => {
            if (file.format !== 'pdf' && file.base64src === null) {
                resolve(false);
                console.warn(`Unsupported format for lad : ${file.format}`);
            }
            const content = file.base64src ?? file.content;
            const filename = (file.name === 'pdf') ? file.name : file.name + '.pdf';

            this.http.post('../rest/mercure/lad', { encodedResource: content, extension: 'pdf', filename: filename }).pipe(
                filter((data: any) => data.message === null || typeof data.message === 'undefined'),
                tap((data: any) => {
                    resolve(data);
                }),
                catchError((err: any) => {
                    const backendError = err?.error?.errors;
                    if (!this.functions.empty(backendError)) {
                        this.notificationService.handleSoftErrors(backendError);
                    } else {
                        this.notificationService.handleSoftErrors(this.translate.instant('lang.mercureLadProcessingError'));
                    }
                    resolve(false);
                    return of(false);
                })
            ).subscribe();
        });
    }

    isEnabled(): Promise<boolean> {
        return new Promise((resolve) => {
            this.http.get('../rest/mercure/lad/isEnabled').pipe(
                tap((data: any) => {
                    resolve(data.enabled);
                }),
                catchError(() => {
                    resolve(false);
                    return of(false);
                })
            ).subscribe();
        });
    }
}
