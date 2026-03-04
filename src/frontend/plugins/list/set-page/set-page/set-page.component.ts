import { Component, Input } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';
import { MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator';
import { FunctionsService } from '@service/functions.service';

@Component({
    selector: 'app-set-page',
    templateUrl: './set-page.component.html',
    styleUrls: ['./set-page.component.scss']
})
export class SetPageComponent {

    @Input() paginator: MatPaginator;
    @Input() pageLength: number = 0;
    @Input() currentPage = new UntypedFormControl({ value: 1 }, [Validators.min(1), Validators.max(this.pageLength)]);
    pageSize: number = 10;
    hasError: boolean = false;

    constructor(
        public functions: FunctionsService
    ) { }

    goToPage(page: number = this.currentPage.value) {
        this.hasError = false;
        if (this.currentPage.hasError('max')) {
            this.hasError = true;
        } else {
            const value = page ?? this.currentPage.value;
            if (!this.functions.empty(value) && value <= this.pageLength) {
                this.paginator.pageIndex = value - 1;
                this.paginator.page.next({
                    pageIndex: value,
                    pageSize: this.paginator.pageSize,
                    length: this.paginator.length
                });
            }
        }
    }
}
