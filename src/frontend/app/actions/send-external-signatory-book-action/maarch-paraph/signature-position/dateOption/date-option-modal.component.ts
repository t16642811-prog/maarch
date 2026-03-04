import { Component, Inject, OnInit } from '@angular/core';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

@Component({
    templateUrl: 'date-option-modal.component.html',
    styleUrls: ['date-option-modal.component.scss'],
})
export class DateOptionModalComponent implements OnInit {

    date: any;

    today: Date = new Date();

    dateformats: any[] = [
        'dd/MM/y',
        'dd-MM-y',
        'dd.MM.y',
        'd MMM y',
        'd MMMM y',
    ];

    datefonts: any[] = [
        'Arial',
        'Verdana',
        'Helvetica',
        'Tahoma',
        'Times New Roman',
        'Courier New',
    ];

    size = {
        'Arial': 15,
        'Verdana': 13,
        'Helvetica': 13,
        'Tahoma': 13,
        'Times New Roman': 15,
        'Courier New': 13
    };

    constructor(
        public dialogRef: MatDialogRef<DateOptionModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
    ) { }

    ngOnInit(): void {
        this.date = JSON.parse(JSON.stringify(this.data.currentDate));
    }

    dismissModal() {
        this.dialogRef.close();
    }

    getFontLabel(label: string) {
        return label.replace(' ', '_');
    }

    onSubmit() {
        this.dialogRef.close(this.date);
    }

    select(font: string) {
        this.date.size = this.size[font];
    }
}
