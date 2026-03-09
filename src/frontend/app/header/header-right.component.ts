import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { HeaderService } from '@service/header.service';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { MatLegacyInput as MatInput } from '@angular/material/legacy-input';
import { IndexingGroupModalComponent } from '../menu/menu-shortcut.component';
import { NavigationEnd, Router } from '@angular/router';
import { AppService } from '@service/app.service';
import { PrivilegeService } from '@service/privileges.service';
import { FunctionsService } from '@service/functions.service';
import { AuthService } from '@service/auth.service';
import { RegisteredMailImportComponent } from '@appRoot/registeredMail/import/registered-mail-import.component';
import { AboutUsComponent } from '@appRoot/about-us.component';
import { LocalStorageService } from '@service/local-storage.service';
import { forkJoin, interval, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';


@Component({
    selector: 'app-header-right',
    styleUrls: ['header-right.component.scss'],
    templateUrl: 'header-right.component.html',
})
export class HeaderRightComponent implements OnInit, OnDestroy {

    @ViewChild('searchInput', { static: false }) searchInput: MatInput;

    dialogRef: MatDialogRef<any>;
    config: any = {};
    menus: any = [];
    searchTarget: string = '';

    hideSearch: boolean = true;

    quickSearchTargets: any[] = [
        {
            id: 'searchTerm',
            label: this.translate.instant('lang.defaultQuickSearch'),
            desc: this.translate.instant('lang.quickSearchTarget'),
            icon: 'fas fa-inbox fa-2x',
        },
        {
            id: 'recipients',
            label: this.translate.instant('lang.recipient'),
            desc: this.translate.instant('lang.searchByRecipient'),
            icon: 'fas fa-user fa-2x',
        },
        {
            id: 'senders',
            label: this.translate.instant('lang.sender'),
            desc: this.translate.instant('lang.searchBySender'),
            icon: 'fas fa-address-book fa-2x',
        }
    ];

    selectedQuickSearchTarget: string = 'searchTerm';
    notificationItems: any[] = [];
    unreadNotificationCount: number = 0;
    urgentCurrentCount: number = 0;
    private notificationPollingSub: Subscription | null = null;
    private routerEventsSub: Subscription | null = null;
    private lastUrgentTotal: number | null = null;
    private lastBasketCounters: {[key: string]: number} = {};
    private knownMailNotificationIds: Set<string> = new Set<string>();
    private dismissedMailNotificationIds: Set<string> = new Set<string>();
    private openedMailResourceIds: Set<number> = new Set<number>();
    notificationsDetailLoaded: boolean = false;
    loadingNotificationsDetail: boolean = false;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        public router: Router,
        public dialog: MatDialog,
        public authService: AuthService,
        public appService: AppService,
        public headerService: HeaderService,
        public functions: FunctionsService,
        public privilegeService: PrivilegeService,
        private localStorage: LocalStorageService
    ) { }

    ngOnInit(): void {
        this.menus = this.privilegeService.getCurrentUserMenus();
        if (!this.functions.empty(this.localStorage.get('quickSearchTarget'))) {
            this.selectedQuickSearchTarget = this.localStorage.get('quickSearchTarget');
        }
        this.restoreOpenedResourceIds();
        this.initUrgentNotificationsPolling();
        this.routerEventsSub = this.router.events.subscribe((event: any) => {
            if (event instanceof NavigationEnd) {
                this.removeNotificationForOpenedResource(event.urlAfterRedirects || event.url || '');
            }
        });
        this.removeNotificationForOpenedResource(this.router.url || '');
    }

    ngOnDestroy(): void {
        if (this.notificationPollingSub) {
            this.notificationPollingSub.unsubscribe();
        }
        if (this.routerEventsSub) {
            this.routerEventsSub.unsubscribe();
        }
    }

    gotToMenu(shortcut: any) {
        if (shortcut.id === 'indexing' && shortcut.groups.length > 1) {
            this.config = { panelClass: 'maarch-modal', data: { indexingGroups: shortcut.groups, link: shortcut.route } };
            this.dialogRef = this.dialog.open(IndexingGroupModalComponent, this.config);
        } else {
            const component = shortcut.route.split('__');

            if (component.length === 2) {
                if (component[0] === 'RegisteredMailImportComponent') {
                    this.dialog.open(RegisteredMailImportComponent, {
                        disableClose: true,
                        width: '99vw',
                        maxWidth: '99vw',
                        panelClass: 'maarch-full-height-modal'
                    });
                }
            } else {
                this.router.navigate([shortcut.route]);
            }
        }
    }

    showSearchInput() {
        this.hideSearch = !this.hideSearch;
        setTimeout(() => {
            this.searchInput.focus();
        }, 200);
    }

    hideSearchBar() {
        if (this.privilegeService.getCurrentUserMenus().find((privilege: any) => privilege.id === 'adv_search_mlb') === undefined) {
            return false;
        } else {
            return this.router.url.split('?')[0] !== '/search';
        }
    }

    showLogout() {
        return this.authService.canLogOut();
    }

    goTo() {
        this.router.navigate(['/search'], { queryParams: { target: this.selectedQuickSearchTarget, value: this.searchTarget } });
    }

    openAboutModal() {
        this.dialog.open(AboutUsComponent, { panelClass: 'maarch-modal', autoFocus: false, disableClose: false });
    }

    setTarget(id: string) {
        this.selectedQuickSearchTarget = id;
        this.localStorage.save('quickSearchTarget', this.selectedQuickSearchTarget);
    }

    getTargetDesc(): string {
        return this.quickSearchTargets.find((item: any) => item.id === this.selectedQuickSearchTarget).desc;
    }

    getTargetIcon(): string {
        return this.quickSearchTargets.find((item: any) => item.id === this.selectedQuickSearchTarget).icon;
    }

    initUrgentNotificationsPolling() {
        this.fetchUrgentNotificationsSnapshot(false);
        this.notificationPollingSub = interval(10000).subscribe(() => {
            this.fetchUrgentNotificationsSnapshot(true);
        });
    }

    fetchUrgentNotificationsSnapshot(withDeltaNotification: boolean) {
        this.http.get('../rest/home?light=1').subscribe({
            next: (data: any) => {
                this.pruneOpenedMailNotifications();
                this.detectNewCourriersNotifications(data, withDeltaNotification);

                const priorityStats = Array.isArray(data?.statistics?.priority) ? data.statistics.priority : [];
                const urgentCount = priorityStats
                    .filter((item: any) => this.isUrgentLabel(item?.name))
                    .reduce((sum: number, item: any) => sum + Number(item?.value || 0), 0);

                this.urgentCurrentCount = urgentCount;

                if (this.lastUrgentTotal === null) {
                    this.lastUrgentTotal = urgentCount;
                    return;
                }

                const delta = urgentCount - this.lastUrgentTotal;
                if (withDeltaNotification && delta > 0) {
                    this.pushNotification({
                        type: 'urgent',
                        title: delta === 1 ? 'Nouveau courrier urgent' : `${delta} nouveaux courriers urgents`,
                        message: `Total urgent: ${urgentCount}`,
                        createdAt: new Date()
                    });
                }
                this.lastUrgentTotal = urgentCount;
                this.pruneOpenedMailNotifications();
            },
            error: () => {
                // Silent: header polling must not disturb UI
            }
        });
    }

    detectNewCourriersNotifications(data: any, withDeltaNotification: boolean) {
        const basketCounters: {[key: string]: number} = {};
        const baskets = this.extractHomeBaskets(data);

        baskets.forEach((basket: any) => {
            const key = this.getBasketNotificationKey(basket);
            basketCounters[key] = Number(basket?.resourceNumber || 0);
        });

        if (Object.keys(this.lastBasketCounters).length === 0) {
            this.seedBasketNotificationsSummary(baskets);
            this.refreshDetailedMailNotifications(baskets, false);
            this.lastBasketCounters = basketCounters;
            return;
        }

        if (!withDeltaNotification) {
            this.lastBasketCounters = basketCounters;
            return;
        }

        const hasIncrease = baskets.some((basket: any) => {
            const key = this.getBasketNotificationKey(basket);
            return (basketCounters[key] ?? 0) > (this.lastBasketCounters[key] ?? 0);
        });
        if (hasIncrease) {
            this.refreshDetailedMailNotifications(baskets, true);
        }

        this.lastBasketCounters = basketCounters;
    }

    seedBasketNotificationsSummary(baskets: any[]) {
        this.notificationItems = this.notificationItems.filter((item: any) => item.type === 'urgent');
        baskets
            .filter((basket: any) => Number(basket?.resourceNumber || 0) > 0)
            .sort((a: any, b: any) => Number(b?.resourceNumber || 0) - Number(a?.resourceNumber || 0))
            .slice(0, 6)
            .forEach((basket: any) => {
                const count = Number(basket?.resourceNumber || 0);
                this.notificationItems.push({
                    type: 'mail',
                    title: count > 1 ? 'Courriers en attente' : 'Courrier en attente',
                    message: `${basket.basket_name} (${count})`,
                    createdAt: new Date()
                });
            });
    }

    refreshDetailedMailNotifications(baskets: any[], onlyNew: boolean) {
        if (this.loadingNotificationsDetail) {
            return;
        }
        this.restoreOpenedResourceIds();
        this.loadingNotificationsDetail = true;
        const targetBaskets = baskets
            .filter((basket: any) => Number(basket?.resourceNumber || 0) > 0)
            .sort((a: any, b: any) => Number(b?.resourceNumber || 0) - Number(a?.resourceNumber || 0))
            .slice(0, 4);

        if (targetBaskets.length === 0) {
            this.loadingNotificationsDetail = false;
            return;
        }

        const requests = targetBaskets.map((basket: any) => {
            const groupId = basket.group_id ?? basket.__groupSerialId;
            const url = `../rest/resourcesList/users/${basket.owner_user_id}/groups/${groupId}/baskets/${basket.id}?limit=3&offset=0`;
            return this.http.get(url).pipe(
                catchError(() => of(null))
            );
        });

        forkJoin(requests).subscribe((responses: any[]) => {
            const newItems: any[] = [];

            responses.forEach((response: any, index: number) => {
                const basket = targetBaskets[index];
                const resources = Array.isArray(response?.resources) ? response.resources : [];
                resources.forEach((row: any) => {
                    const notifId = this.getMailNotificationId(basket, row);
                    if (!notifId) {
                        return;
                    }
                    if (this.dismissedMailNotificationIds.has(notifId)) {
                        return;
                    }

                    const alreadyKnown = this.knownMailNotificationIds.has(notifId);
                    this.knownMailNotificationIds.add(notifId);
                    const resId = Number(row?.resId ?? row?.res_id ?? 0);
                    if (resId > 0 && this.openedMailResourceIds.has(resId)) {
                        return;
                    }

                    if (onlyNew && alreadyKnown) {
                        return;
                    }

                    newItems.push({
                        id: notifId,
                        type: 'mail',
                        title: onlyNew ? 'Nouveau courrier reçu' : 'Courrier en attente',
                        message: row.subject || row.chrono || `Courrier #${row.resId}`,
                        subMessage: basket.basket_name,
                        priorityLevel: this.getNotificationPriorityLevel(row),
                        createdAt: this.parseNotifDate(row.creationDate || row.creation_date),
                        basket,
                        resource: row
                    });
                });
            });

            if (!onlyNew) {
                this.notificationItems = [
                    ...this.notificationItems.filter((item: any) => item.type === 'urgent'),
                    ...newItems
                ]
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 20);
                this.unreadNotificationCount = Math.min(this.notificationItems.length, 99);
                this.notificationsDetailLoaded = true;
            } else if (newItems.length > 0) {
                newItems
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .forEach((item: any) => this.pushNotification(item));
            }
            this.loadingNotificationsDetail = false;
        }, () => {
            this.loadingNotificationsDetail = false;
        });
    }

    extractHomeBaskets(data: any): any[] {
        const regrouped = Array.isArray(data?.regroupedBaskets) ? data.regroupedBaskets : [];
        const assigned = Array.isArray(data?.assignedBaskets) ? data.assignedBaskets : [];

        const regroupedBaskets = regrouped.reduce((acc: any[], group: any) => {
            const baskets = Array.isArray(group?.baskets) ? group.baskets : [];
            return acc.concat(baskets.map((basket: any) => ({
                ...basket,
                __groupSerialId: group.groupSerialId
            })));
        }, []);

        return [...regroupedBaskets, ...assigned];
    }

    getBasketNotificationKey(basket: any): string {
        return [
            basket?.id ?? '',
            basket?.owner_user_id ?? '',
            basket?.group_id ?? basket?.__groupSerialId ?? ''
        ].join(':');
    }

    getMailNotificationId(basket: any, row: any): string | null {
        const resId = row?.resId ?? row?.res_id;
        if (!resId) {
            return null;
        }
        return `${this.getBasketNotificationKey(basket)}:${resId}`;
    }

    parseNotifDate(value: any): Date {
        const date = value ? new Date(value) : new Date();
        return isNaN(date.getTime()) ? new Date() : date;
    }

    removeNotificationForOpenedResource(url: string) {
        const match = /\/resId\/(\d+)/.exec(url || '');
        if (!match || !match[1]) {
            return;
        }
        const openedResId = Number(match[1]);
        if (!openedResId) {
            return;
        }
        this.openedMailResourceIds.add(openedResId);
        this.persistOpenedResourceIds();

        const before = this.notificationItems.length;
        this.notificationItems = this.notificationItems.filter((notif: any) => {
            const resId = Number(notif?.resource?.resId ?? notif?.resource?.res_id ?? 0);
            const keep = !(notif?.type === 'mail' && resId === openedResId);
            if (!keep && notif?.id) {
                this.dismissedMailNotificationIds.add(notif.id);
            }
            return keep;
        });

        this.unreadNotificationCount = Math.min(this.notificationItems.length, 99);
    }

    pruneOpenedMailNotifications() {
        this.restoreOpenedResourceIds();
        if (this.openedMailResourceIds.size === 0 || this.notificationItems.length === 0) {
            return;
        }
        const before = this.notificationItems.length;
        this.notificationItems = this.notificationItems.filter((notif: any) => {
            if (notif?.type !== 'mail') {
                return true;
            }
            const resId = Number(notif?.resource?.resId ?? notif?.resource?.res_id ?? 0);
            const keep = !(resId > 0 && this.openedMailResourceIds.has(resId));
            if (!keep && notif?.id) {
                this.dismissedMailNotificationIds.add(notif.id);
            }
            return keep;
        });
        if (this.notificationItems.length !== before) {
            this.unreadNotificationCount = Math.min(this.notificationItems.length, 99);
        }
    }

    restoreOpenedResourceIds() {
        try {
            const ids: number[] = [];

            // Primary storage shared with basket list component.
            const rawLocal = localStorage.getItem('openedNotificationResIds');
            if (rawLocal) {
                const parsedLocal = JSON.parse(rawLocal);
                if (Array.isArray(parsedLocal)) {
                    parsedLocal.forEach((id: any) => ids.push(Number(id)));
                }
            }

            // Backward-compatibility for session-based localStorage service.
            const rawSession = this.localStorage.get('openedNotificationResIds');
            if (rawSession) {
                const parsedSession = JSON.parse(rawSession);
                if (Array.isArray(parsedSession)) {
                    parsedSession.forEach((id: any) => ids.push(Number(id)));
                }
            }

            ids.forEach((id: number) => {
                if (id > 0 && !Number.isNaN(id)) {
                    this.openedMailResourceIds.add(id);
                }
            });
        } catch (e) {
            // ignore malformed storage values
        }
    }

    persistOpenedResourceIds() {
        const values = Array.from(this.openedMailResourceIds).slice(-500);
        try {
            const payload = JSON.stringify(values);
            localStorage.setItem('openedNotificationResIds', payload);
            this.localStorage.save('openedNotificationResIds', payload);
        } catch (e) {
            // No-op if localStorage is unavailable.
        }
    }

    private markNotificationResourceAsOpened(resId: any): number {
        const parsed = Number(resId);
        if (!parsed || Number.isNaN(parsed)) {
            return 0;
        }
        this.openedMailResourceIds.add(parsed);
        this.persistOpenedResourceIds();
        return parsed;
    }

    private removeMailNotificationByResId(resId: number) {
        if (!resId) {
            return;
        }
        this.notificationItems = this.notificationItems.filter((notif: any) => {
            if (notif?.type !== 'mail') {
                return true;
            }
            const notifResId = Number(notif?.resource?.resId ?? notif?.resource?.res_id ?? 0);
            if (notifResId === resId) {
                if (notif?.id) {
                    this.dismissedMailNotificationIds.add(notif.id);
                }
                return false;
            }
            return true;
        });
        this.unreadNotificationCount = Math.min(this.notificationItems.length, 99);
    }

    getNotificationPriorityLevel(row: any): 'tres-urgent' | 'urgent' | 'normal' {
        const raw = `${row?.priorityLabel ?? ''} ${row?.priority ?? ''} ${row?.priority_label ?? ''}`.toLowerCase();
        const color = String(row?.priorityColor ?? row?.priority_color ?? '').toLowerCase();

        if (raw.includes('tres urgent') || raw.includes('très urgent')) {
            return 'tres-urgent';
        }
        if (raw.includes('urgent')) {
            return 'urgent';
        }
        if (['#ff0000', '#d32f2f', '#c62828'].includes(color)) {
            return 'tres-urgent';
        }
        if (['#ffa500', '#ff9800', '#f57c00'].includes(color)) {
            return 'urgent';
        }
        return 'normal';
    }

    getNotificationColorClass(item: any): string {
        const level = item?.priorityLevel || (item?.type === 'urgent' ? 'urgent' : 'normal');
        return `notif-${level}`;
    }

    isUrgentLabel(label: string): boolean {
        if (this.functions.empty(label)) {
            return false;
        }
        const value = String(label).toLowerCase();
        return value.includes('urgent');
    }

    pushNotification(notification: any) {
        this.notificationItems = [notification, ...this.notificationItems].slice(0, 15);
        this.unreadNotificationCount = Math.min(this.unreadNotificationCount + 1, 99);
    }

    markNotificationsAsRead() {
        this.unreadNotificationCount = 0;
    }

    onNotificationsMenuOpened() {
        this.markNotificationsAsRead();
        if (this.notificationsDetailLoaded || this.loadingNotificationsDetail) {
            return;
        }
        this.http.get('../rest/home?light=1').subscribe({
            next: (data: any) => {
                const baskets = this.extractHomeBaskets(data);
                this.refreshDetailedMailNotifications(baskets, false);
            },
            error: () => {
                this.loadingNotificationsDetail = false;
            }
        });
    }

    openNotification(item: any) {
        const openedResId = this.markNotificationResourceAsOpened(item?.resource?.resId ?? item?.resource?.res_id);
        if (openedResId) {
            this.removeMailNotificationByResId(openedResId);
        }

        if (item?.type === 'mail') {
            if (item?.id) {
                this.dismissedMailNotificationIds.add(item.id);
            }
            this.notificationItems = this.notificationItems.filter((notif: any) => notif !== item && (!item?.id || notif.id !== item.id));
            this.unreadNotificationCount = Math.min(this.notificationItems.length, 99);
        }

        if (item?.resource?.resId || item?.resource?.res_id) {
            const basket = item?.basket;
            const groupId = basket?.group_id ?? basket?.__groupSerialId;
            const resId = item.resource.resId ?? item.resource.res_id;
            if (groupId && basket?.owner_user_id && basket?.id && resId) {
                this.router.navigate([`/process/users/${basket.owner_user_id}/groups/${groupId}/baskets/${basket.id}/resId/${resId}`]);
                return;
            }
        }

        const basket = item?.basket;
        if (!basket) {
            return;
        }

        const groupId = basket.group_id ?? basket.__groupSerialId;
        if (!groupId || !basket.owner_user_id || !basket.id) {
            return;
        }

        this.router.navigate([`/basketList/users/${basket.owner_user_id}/groups/${groupId}/baskets/${basket.id}`]);
    }
}
