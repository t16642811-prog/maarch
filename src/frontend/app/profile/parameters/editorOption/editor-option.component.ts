import { Component, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '@service/notification/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { FunctionsService } from '@service/functions.service';
import { HeaderService } from '@service/header.service';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
    selector: 'app-editor-option',
    templateUrl: './editor-option.component.html',
    styleUrls: ['./editor-option.component.scss'],
})

export class EditorOptionComponent {

    @Input() docEdition: any;

    editorsList: any;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        private notify: NotificationService,
        public functionsService: FunctionsService,
        public headerService: HeaderService,

    ) {
        this.http.get('../rest/documentEditors').pipe(
            tap((data: any) => {
                this.editorsList = Object.keys(data).filter(key => key !== 'default').map(key => data[key]);
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    updateUserPreferences() {
        this.http.put('../rest/currentUser/profile/preferences', { documentEdition: this.docEdition }).pipe(
            tap(() => {
                this.notify.success(this.translate.instant('lang.modificationSaved'));
                this.headerService.resfreshCurrentUser();
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

}
