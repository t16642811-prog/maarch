import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { catchError, debounceTime, of, tap } from 'rxjs';

@Component({
    selector: 'app-avis-parameters',
    templateUrl: './avis-parameters.component.html',
})

export class AvisParametersComponent implements OnInit {
    avisParameters: { allowSameUser: UntypedFormControl } = {
        allowSameUser: new UntypedFormControl(false)
    }

    constructor(
        public translate: TranslateService,
        private http: HttpClient,
        private notification: NotificationService
    ) { }

    async ngOnInit(): Promise<void> {
        await this.getAvisParameters();
        (this.avisParameters.allowSameUser as UntypedFormControl).valueChanges.pipe(
            debounceTime(1000),
            tap(() => {
                this.saveAvisParametersConf();
            }),
        ).subscribe();
    }

    getAvisParameters(): Promise<boolean> {
        return new Promise((resolve) => {
            this.http.get('../rest/parameters/allowMultipleAvisAssignment').pipe(
                tap((data: any) => {
                    this.avisParameters.allowSameUser.setValue(data.parameter.param_value_int === 1);
                    resolve(this.avisParameters.allowSameUser.value);
                }),
                catchError(() => {
                    this.avisParameters.allowSameUser.setValue(false);
                    resolve(false);
                    return of(false);
                })
            ).subscribe();
        });
    }

    saveAvisParametersConf(): void {
        this.http.put('../rest/parameters/allowMultipleAvisAssignment', { param_value_int: this.avisParameters.allowSameUser.value ? 1 : 0 }).pipe(
            tap(() => {
                this.notification.success(this.translate.instant('lang.dataUpdated'));
            }),
            catchError((err: any) => {
                this.notification.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }
}