
import { Injectable } from '@angular/core';
import { MatLegacyPaginatorIntl as MatPaginatorIntl } from '@angular/material/legacy-paginator';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class CustomMatPaginatorIntl extends MatPaginatorIntl {

    bypassRangeLabel: string[] = ['/administration/history', '/administration/history-batch'];
    constructor(
        public translate: TranslateService,
        private router: Router
    ) {
        super();

        this.getAndInitTranslations();
    }

    getAndInitTranslations() {

        this.itemsPerPageLabel = '';
        this.nextPageLabel = this.translate.instant('lang.nextPage');
        this.previousPageLabel = this.translate.instant('lang.prevPage');
        this.changes.next();

    }

    getRangeLabel = (page: number, pageSize: number, length: number) => {
        if (length === 0 || pageSize === 0) {
            return `0 / ${length}`;
        }
        length = Math.max(length, 0);

        const nbPage = Math.ceil(length / pageSize);

        return this.bypassRangeLabel.indexOf(this.router.url) === -1 ? `${this.translate.instant('lang.page')} ${page + 1} / ${nbPage}` : '';
    };
}
