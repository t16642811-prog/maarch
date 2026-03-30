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
    @ViewChild('remotePlugin2', { read: ViewContainerRef, static: true }) remotePlugin2: ViewContainerRef;

    readonly evolutionChartWidth: number = 1600;
    readonly evolutionChartHeight: number = 460;
    readonly evolutionChartPadding = {
        top: 34,
        right: 4,
        bottom: 58,
        left: 52
    };
    readonly homeChartPalette: string[] = ['#9fd9c6', '#9ec5fe', '#f8b4d9', '#b7e4c7', '#c7d2fe', '#fbcfe8'];
    readonly pieChartScheme = {
        domain: this.homeChartPalette
    };
    readonly barChartScheme = {
        domain: ['#9ec5fe', '#9fd9c6', '#f8b4d9', '#b7e4c7', '#c7d2fe', '#f9c0d8']
    };

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
    currentEvolutionSeries: any[] = [];
    currentEvolutionPoints: any[] = [];
    evolutionMaxValue: number = 1;
    evolutionGridValues: number[] = [];
    evolutionChartPoints: any[] = [];
    evolutionPolyline: string = '';
    evolutionAreaPath: string = '';
    statsLoading: boolean = false;
    statsLoaded: boolean = false;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        public dialog: MatDialog,
        public appService: AppService,
        public functions: FunctionsService,
        private readonly notify: NotificationService,
        private readonly headerService: HeaderService,
        private readonly featureTourService: FeatureTourService,
        private readonly sanitizer: DomSanitizer
    ) { }

    ngOnInit(): void {
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
            color: basket.color || '#0893a9',
            groupDesc: basket.groupDesc || basket.group_desc || ''
        }));

        const totalResources = normalized.reduce((sum: number, basket: any) => sum + basket.count, 0);
        const nonEmptyBaskets = normalized.filter((basket: any) => basket.count > 0).length;
        const sortedBaskets = [...normalized];
        sortedBaskets.sort((a: any, b: any) => b.count - a.count);
        const topBaskets = sortedBaskets.slice(0, 6);
        const maxBasketCount = topBaskets.length > 0 ? Math.max(...topBaskets.map((item: any) => item.count), 1) : 1;

        topBaskets.forEach((basket: any) => {
            basket.width = `${Math.max((basket.count / maxBasketCount) * 100, basket.count > 0 ? 8 : 4)}%`;
            basket.barColor = this.homeChartPalette[topBaskets.indexOf(basket) % this.homeChartPalette.length];
        });

        this.homeStats = {
            totalBaskets: normalized.length,
            nonEmptyBaskets,
            totalResources,
            topBaskets,
            maxBasketCount
        };
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
        this.updateEvolutionComputedData();
    }

    setEvolutionMode(mode: 'day' | 'week') {
        if (this.evolutionMode === mode) {
            return;
        }
        this.evolutionMode = mode;
        this.updateEvolutionComputedData();
    }

    getEvolutionBarHeight(value: any): string {
        const max = this.evolutionMaxValue;
        const numericValue = Number(value || 0);
        const ratio = max > 0 ? numericValue / max : 0;
        return `${Math.max(ratio * 100, numericValue > 0 ? 6 : 2)}%`;
    }

    isEvolutionPeak(value: any): boolean {
        return Number(value || 0) === this.evolutionMaxValue;
    }

    getEvolutionGridY(value: number): number {
        const chartHeight = this.evolutionChartHeight - this.evolutionChartPadding.top - this.evolutionChartPadding.bottom;
        const max = this.evolutionMaxValue;
        const ratio = max > 0 ? value / max : 0;
        return this.evolutionChartHeight - this.evolutionChartPadding.bottom - (chartHeight * ratio);
    }

    updateEvolutionComputedData() {
        this.currentEvolutionSeries = this.evolutionMode === 'day' ? this.chartEvolutionDayData : this.chartEvolutionWeekData;
        const series = this.currentEvolutionSeries?.[0]?.series;
        this.currentEvolutionPoints = Array.isArray(series) ? series : [];
        const values = this.currentEvolutionPoints.map((item: any) => Number(item?.value || 0));
        this.evolutionMaxValue = values.length > 0 ? Math.max(...values, 1) : 1;
        const stepCount = 4;
        this.evolutionGridValues = Array.from({ length: stepCount + 1 }, (_, index) => Math.round((this.evolutionMaxValue / stepCount) * index));

        const chartWidth = this.evolutionChartWidth - this.evolutionChartPadding.left - this.evolutionChartPadding.right;
        const chartHeight = this.evolutionChartHeight - this.evolutionChartPadding.top - this.evolutionChartPadding.bottom;
        const count = this.currentEvolutionPoints.length;
        const stepX = count > 1 ? chartWidth / (count - 1) : 0;

        this.evolutionChartPoints = this.currentEvolutionPoints.map((point: any, index: number) => {
            const numericValue = Number(point?.value || 0);
            const ratio = this.evolutionMaxValue > 0 ? numericValue / this.evolutionMaxValue : 0;
            const x = this.evolutionChartPadding.left + (stepX * index);
            const y = this.evolutionChartHeight - this.evolutionChartPadding.bottom - (chartHeight * ratio);

            return {
                x,
                y,
                value: numericValue,
                label: this.formatEvolutionTick(point?.name),
                rawLabel: point?.name
            };
        });
        this.evolutionPolyline = this.evolutionChartPoints.map((point: any) => `${point.x},${point.y}`).join(' ');

        const points = this.evolutionChartPoints;
        if (points.length === 0) {
            this.evolutionAreaPath = '';
            return;
        }

        const baselineY = this.evolutionChartHeight - this.evolutionChartPadding.bottom;
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];
        const linePath = points.map((point: any) => `L ${point.x} ${point.y}`).join(' ');

        this.evolutionAreaPath = `M ${firstPoint.x} ${baselineY} ${linePath} L ${lastPoint.x} ${baselineY} Z`;
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

    formatEvolutionTick = (value: any): string => {
        const raw = String(value ?? '').trim();
        if (raw === '') {
            return '';
        }

        if (this.evolutionMode === 'day') {
            const date = /^\d{2}\/\d{2}$/.test(raw) ? raw : null;
            if (date) {
                return date;
            }

            const parsed = new Date(raw);
            if (!Number.isNaN(parsed.getTime())) {
                return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}`;
            }
        }

        const weekMatch = /S\s?(\d{1,2})$/i.exec(raw) || /W(\d{1,2})$/i.exec(raw);
        if (weekMatch) {
            return `S${String(weekMatch[1]).padStart(2, '0')}`;
        }

        return raw;
    };

    formatEvolutionValue = (value: any): string => {
        const parsed = Number(value);
        if (Number.isNaN(parsed)) {
            return String(value ?? '');
        }
        return `${parsed}`;
    };

    getEvolutionTickLabel(label: string, index: number): string {
        return label;
    }

}
