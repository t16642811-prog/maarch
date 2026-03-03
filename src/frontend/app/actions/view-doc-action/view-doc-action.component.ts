import { Component, Inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

@Component({
    templateUrl: 'view-doc-action.component.html',
    styleUrls: ['view-doc-action.component.scss'],
})
export class ViewDocActionComponent {

    constructor(
        public translate: TranslateService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) { }
}
