import { Component, OnInit, AfterViewInit, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { AppService } from '@service/app.service';
import { DashboardService } from '@appRoot/home/dashboard/dashboard.service';
import { FunctionsService } from '@service/functions.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-tile-view-list',
    templateUrl: 'tile-view-list.component.html',
    styleUrls: ['tile-view-list.component.scss'],
})
export class TileViewListComponent implements OnInit, AfterViewInit {

    @Input() displayColumns: string[];

    @Input() resources: any[];
    @Input() tile: any;
    @Input() icon: string = '';
    @Input() route: string = null;
    @Input() viewDocRoute: string = null;

    thumbnailUrl: string = '';
    showThumbnail: boolean = false;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        private router: Router,
        public appService: AppService,
        private dashboardService: DashboardService,
        public functionsService: FunctionsService
    ) { }

    ngOnInit(): void { }

    ngAfterViewInit(): void { }

    viewThumbnail(ev: any, resource: any) {
        const timeStamp = +new Date();
        const data = { ...resource, ...this.tile.parameters, ...this.tile };
        delete data.parameters;
        const link = this.dashboardService.getFormatedRoute(this.viewDocRoute, data);
        if (link) {
            this.thumbnailUrl = '../rest' + link.route + '?tsp=' + timeStamp;
            this.showThumbnail = true;
        }
    }

    closeThumbnail() {
        this.showThumbnail = false;
    }

    goTo(resource: any) {
        const data = { ...resource, ...this.tile.parameters, ...this.tile };
        delete data.parameters;
        const link = this.dashboardService.getFormatedRoute(this.route, data);
        const regex = /http[.]*/g;
        if (link.route.match(regex) === null) {
            this.router.navigate([link.route], { queryParams: link.params });
        } else {
            if (!this.functionsService.empty(link?.params)) {
                let formatedParams: string = '';
                const paramsArray: string[] = [];
                Object.keys(link.params).forEach((item: any) => {
                    paramsArray.push(item + '=' + link.params[item]);
                    formatedParams = paramsArray.join('&');
                });
                window.open(`${link.route}?${formatedParams}`, '_blank');
            } else {
                window.open(link.route, '_blank');
            }
        }
    }

    isDate(value: any, col: string): boolean {
        if (col === 'creationDate') {
            if (value instanceof Date) {
                return true;
            }
            // Check if the value can be transformed into a Date object
            const dateObject = new Date(value);
            if (!isNaN(dateObject.getTime())) {
                // Check if the string contains only digits or date separation characters
                const isNumericDate = /^[0-9-: T.]+$/.test(value);
                if (isNumericDate) {
                    // Check if the string is fully consumed (no untreated characters)
                    const remainingChars = value.slice(dateObject.toString().length).trim();
                    if (remainingChars === '') {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
