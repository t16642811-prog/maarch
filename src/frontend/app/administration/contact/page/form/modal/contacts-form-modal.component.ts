import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { FunctionsService } from '@service/functions.service';
import { ContactsFormComponent } from '../contacts-form.component';

@Component({
    templateUrl: 'contacts-form-modal.component.html',
    styleUrls: ['contacts-form-modal.component.scss'],
})
export class ContactsFormModalComponent {

    @ViewChild('appContactForm', { static: false }) appContactForm: ContactsFormComponent;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: any,
        public dialogRef: MatDialogRef<ContactsFormModalComponent>,
        private functionsService: FunctionsService) {
    }

    onSubmit() {
        this.appContactForm.onSubmit();
    }

    isValid() {
        return (this.appContactForm !== undefined && this.appContactForm.isValidForm());
    }

    goTo(id: any) {
        this.dialogRef.close({
            id: id,
            state: 'create'
        });
    }
}
