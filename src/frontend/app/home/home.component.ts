import { Component, OnInit, AfterViewInit, ViewChild, ViewContainerRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { NotificationService } from '@service/notification/notification.service';
import { HeaderService } from '@service/header.service';
import { AppService } from '@service/app.service';
import { FeatureTourService } from '@service/featureTour.service';
import { DomSanitizer } from '@angular/platform-browser';
import { FunctionsService } from '@service/functions.service';
import { catchError, of, tap } from 'rxjs';

@Component({
    templateUrl: 'home.component.html',
    styleUrls: ['home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit {
    private readonly barPalette: string[] = [
        '#1D4ED8',
        '#0EA5E9',
        '#10B981',
        '#F59E0B',
        '#EF4444',
        '#8B5CF6',
        '#14B8A6',
        '#F97316'
    ];

    @ViewChild('remotePlugin2', { read: ViewContainerRef, static: true }) remotePlugin2: ViewContainerRef;

    loading: boolean = false;

    homeData: any;
    homeMessage: any;
    homeStats: {
        totalBaskets: number;
        nonEmptyBaskets: number;
        totalResources: number;
        topBaskets: any[];
        maxBasketCount: number;
    } = {
        totalBaskets: 0,
        nonEmptyBaskets: 0,
        totalResources: 0,
        topBaskets: [],
        maxBasketCount: 0
    };
    chartPriorityData: any[] = [];
    chartDoctypeData: any[] = [];
    chartEvolutionDayData: any[] = [];
    chartEvolutionWeekData: any[] = [];
    evolutionMode: 'day' | 'week' = 'week';
    statsLoading: boolean = false;
    statsLoaded: boolean = false;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        public dialog: MatDialog,
        public appService: AppService,
        public functions: FunctionsService,
        private notify: NotificationService,
        private headerService: HeaderService,
        private featureTourService: FeatureTourService,
        private sanitizer: DomSanitizer
    ) { }

    async ngOnInit(): Promise<void> {
        this.headerService.setHeader(this.translate.instant('lang.home'));

        this.http.get('../rest/home?light=1').pipe(
            tap((data: any) => {
                this.homeData = data;
                const sanitizedHtml = this.functions.sanitizeHtml(data['homeMessage']);
                this.homeMessage = this.sanitizer.bypassSecurityTrustHtml(sanitizedHtml);
                this.prepareHomeStats(data);
                this.loadHomeStatistics();
            }),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    ngAfterViewInit(): void {
        if (!this.featureTourService.isComplete()) {
            this.featureTourService.init();
        }
    }

    prepareHomeStats(data: any) {
        const regrouped = Array.isArray(data?.regroupedBaskets) ? data.regroupedBaskets : [];
        const assigned = Array.isArray(data?.assignedBaskets) ? data.assignedBaskets : [];

        const regroupedBaskets = regrouped.reduce((acc: any[], group: any) => {
            const baskets = Array.isArray(group?.baskets) ? group.baskets : [];
            return acc.concat(baskets.map((basket: any) => ({
                ...basket,
                groupDesc: group.groupDesc
            })));
        }, []);

        const allBaskets = [...regroupedBaskets, ...assigned];
        const normalized = allBaskets.map((basket: any) => ({
            name: basket.basket_name || this.translate.instant('lang.undefined'),
            count: Number(basket.resourceNumber || 0),
            color: basket.color || '#135F7F',
            groupDesc: basket.groupDesc || basket.group_desc || ''
        }));

        const totalResources = normalized.reduce((sum: number, basket: any) => sum + basket.count, 0);
        const nonEmptyBaskets = normalized.filter((basket: any) => basket.count > 0).length;
        const topBaskets = normalized
            .sort((a: any, b: any) => b.count - a.count)
            .slice(0, 6);
        const maxBasketCount = topBaskets.length > 0 ? Math.max(...topBaskets.map((item: any) => item.count), 1) : 1;

        this.homeStats = {
            totalBaskets: normalized.length,
            nonEmptyBaskets,
            totalResources,
            topBaskets,
            maxBasketCount
        };
    }

    getBarWidth(count: number) {
        const max = this.homeStats.maxBasketCount || 1;
        return `${Math.max((count / max) * 100, count > 0 ? 8 : 4)}%`;
    }

    getBarColor(index: number, color?: string): string {
        if (color && !['#666666', '#676d73', '#808080', '#999999', '#a0a0a0'].includes(color.toLowerCase())) {
            return color;
        }
        return this.barPalette[index % this.barPalette.length];
    }

    prepareHomeCharts(statistics: any) {
        this.chartPriorityData = Array.isArray(statistics?.priority) ? statistics.priority : [];
        this.chartDoctypeData = Array.isArray(statistics?.doctype) ? statistics.doctype : [];

        const evolutionDay = Array.isArray(statistics?.evolutionDay) ? statistics.evolutionDay : [];
        const evolutionWeek = Array.isArray(statistics?.evolutionWeek) ? statistics.evolutionWeek : [];

        this.chartEvolutionDayData = [{
            name: 'Courriers / jour',
            series: evolutionDay
        }];

        this.chartEvolutionWeekData = [{
            name: 'Courriers / semaine',
            series: evolutionWeek
        }];
    }

    getCurrentEvolutionSeries() {
        return this.evolutionMode === 'day' ? this.chartEvolutionDayData : this.chartEvolutionWeekData;
    }

    loadHomeStatistics() {
        if (this.statsLoading || this.statsLoaded) {
            return;
        }
        this.statsLoading = true;
        this.http.get('../rest/home?statsOnly=1').pipe(
            tap((data: any) => {
                this.prepareHomeCharts(data?.statistics || {});
                this.statsLoading = false;
                this.statsLoaded = true;
            }),
            catchError(() => {
                this.statsLoading = false;
                return of(false);
            })
        ).subscribe();
    }

}
