import { Component, Input } from '@angular/core';
import { MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator';

@Component({
    selector: 'app-select-page',
    templateUrl: 'select-page.component.html',
    styleUrls: ['select-page.component.scss'],
})
export class SelectPageComponent {

    @Input() paginator: MatPaginator;

    constructor() { }

    counter(i: number) {
        return new Array(i);
    }

    goToPage(page: number) {
        this.paginator.pageIndex = page;
        this.paginator.page.next({
            pageIndex: page,
            pageSize: this.paginator.pageSize,
            length: this.paginator.length
        });
    }

}
