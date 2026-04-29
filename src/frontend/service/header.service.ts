import { Injectable, ComponentFactoryResolver, Injector, ApplicationRef, ViewContainerRef, TemplateRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';
import { MatSidenav } from '@angular/material/sidenav';
import { FoldersService } from '../app/folder/folders.service';
import { DomPortalOutlet, TemplatePortal } from '@angular/cdk/portal';

@Injectable({
    providedIn: 'root'
})
export class HeaderService {
    private readonly defaultTheme = {
        primary: '#0893a9',
        secondary: '#f99830',
        success: '#006841',
        danger: '#8e3e52'
    };

    sideBarForm: boolean = false;
    sideBarAdmin: boolean = false;
    hideSideBar: boolean = false;
    showhHeaderPanel: boolean = true;
    showMenuShortcut: boolean = true;
    showMenuNav: boolean = true;

    sideNavLeft: MatSidenav | null = null;
    sideBarButton: any = null;

    currentBasketInfo: any = {
        ownerId: 0,
        groupId: 0,
        basketId: ''
    };
    folderId: number = 0;
    headerMessageIcon: string = '';
    headerMessage: string = '';
    subHeaderMessage: string = '';
    user: any = { firstname: '', lastname: '', groups: [], privileges: [], preferences: [], featureTour: [], externalId: null };
    nbResourcesFollowed: number = 0;
    base64: string | null = null;

    private portalHost!: DomPortalOutlet;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        public foldersService: FoldersService,
        private readonly componentFactoryResolver: ComponentFactoryResolver,
        private readonly injector: Injector,
        private readonly appRef: ApplicationRef,
    ) { }

    resfreshCurrentUser() {
        return new Promise((resolve) => {
            this.http.get('../rest/currentUser/profile')
                .pipe(
                    map((data: any) => {
                        this.user = {
                            mode: data.mode,
                            id: data.id,
                            userId: data.user_id,
                            mail: data.mail,
                            firstname: data.firstname,
                            lastname: data.lastname,
                            entities: data.entities,
                            groups: data.groups,
                            preferences: data.preferences,
                            privileges: data.privileges[0] === 'ALL_PRIVILEGES' ? this.user.privileges : data.privileges,
                            featureTour: data.featureTour,
                            externalId: data.external_id
                        };
                        this.nbResourcesFollowed = data.nbFollowedResources;
                        this.applyUserTheme();
                        resolve(data);
                    })
                ).subscribe();
        });

    }

    setUser(user: any = { firstname: '', lastname: '', groups: [], privileges: [] }) {
        this.user = user;
        this.applyUserTheme();
    }

    applyUserTheme() {
        const root = document.documentElement;
        if (!root) {
            return;
        }

        const primary = this.isMinisterUser() ? this.defaultTheme.primary : '#691743';

        this.setThemeColors(root, {
            primary,
            secondary: this.defaultTheme.secondary,
            success: this.defaultTheme.success,
            danger: this.defaultTheme.danger
        });
    }

    private setThemeColors(root: HTMLElement, colors: { primary: string, secondary: string, success: string, danger: string }) {
        this.setColorFamily(root, 'primary', colors.primary);
        this.setColorFamily(root, 'secondary', colors.secondary);
        this.setColorFamily(root, 'success', colors.success);
        this.setColorFamily(root, 'danger', colors.danger);
    }

    private isMinisterUser() {
        const ministerLogins = ['SUPERADMIN', 'BOUACHOUR.HOURIA', 'SAMIA.TRABELSI'];
        const userLogin = (this.user?.userId || '').toString().toUpperCase();

        return ministerLogins.includes(userLogin);
    }

    useMinisterLogo() {
        const ministerLogins = ['BOUACHOUR.HOURIA', 'SAMIA.TRABELSI'];
        const ministerGroups = new Set(['BOG MINISTRE', 'SECMINISTRE', 'SECRÉTARIAT DU MINISTRE', 'SECRETARIAT DU MINISTRE']);
        const userLogin = (this.user?.userId || '').toString().toUpperCase();
        const groups = Array.isArray(this.user?.groups) ? this.user.groups : [];

        return ministerLogins.includes(userLogin) || groups.some((group: any) => {
            const groupValues = [
                group?.id,
                group?.group_id,
                group?.label,
                group?.description,
                group?.groupDesc,
                group?.group_desc
            ];

            return groupValues.some((value: any) => ministerGroups.has((value || '').toString().toUpperCase()));
        });
    }

    private setColorFamily(root: HTMLElement, family: string, hex: string) {
        root.style.setProperty(`--maarch-color-${family}`, hex);
        root.style.setProperty(`--maarch-color-${family}-light`, this.adjustColor(hex, 0.1));
        root.style.setProperty(`--maarch-color-${family}-dark`, this.adjustColor(hex, -0.1));
        [0.1, 0.2, 0.3, 0.4, 0.5, 0.6].forEach((opacity) => {
            root.style.setProperty(
                `--maarch-color-${family}-opacity-${Math.round(opacity * 100)}`,
                this.hexToRgba(hex, opacity)
            );
        });
    }

    private adjustColor(hex: string, amount: number) {
        const rgb = this.hexToRgb(hex);
        const ratio = amount >= 0 ? amount : 1 + amount;
        const adjusted = {
            r: Math.round(amount >= 0 ? rgb.r + (255 - rgb.r) * ratio : rgb.r * ratio),
            g: Math.round(amount >= 0 ? rgb.g + (255 - rgb.g) * ratio : rgb.g * ratio),
            b: Math.round(amount >= 0 ? rgb.b + (255 - rgb.b) * ratio : rgb.b * ratio)
        };

        return this.rgbToHex(
            this.clampColor(adjusted.r),
            this.clampColor(adjusted.g),
            this.clampColor(adjusted.b)
        );
    }

    private hexToRgba(hex: string, opacity: number) {
        const rgb = this.hexToRgb(hex);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    }

    private hexToRgb(hex: string) {
        const normalized = hex.replace('#', '');
        const safeHex = normalized.length === 3
            ? normalized.split('').map((char) => char + char).join('')
            : normalized;

        return {
            r: Number.parseInt(safeHex.substring(0, 2), 16),
            g: Number.parseInt(safeHex.substring(2, 4), 16),
            b: Number.parseInt(safeHex.substring(4, 6), 16)
        };
    }

    private rgbToHex(r: number, g: number, b: number) {
        return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
    }

    private clampColor(value: number) {
        return Math.max(0, Math.min(255, value));
    }

    getLastLoadedFile() {
        return this.base64;
    }

    setLoadedFile(base64: string) {
        this.base64 = base64;
    }

    setHeader(maintTitle: string, subTitle: any = '', icon = '') {
        this.headerMessage = maintTitle;
        this.subHeaderMessage = subTitle;
        this.headerMessageIcon = icon;
    }

    resetSideNavSelection() {
        this.currentBasketInfo = {
            ownerId: 0,
            groupId: 0,
            basketId: ''
        };
        this.foldersService.setFolder({ id: 0 });
        this.sideBarForm = false;
        this.showhHeaderPanel = true;
        this.showMenuShortcut = true;
        this.showMenuNav = true;
        this.sideBarAdmin = false;
        this.sideBarButton = null;
        this.hideSideBar = true;
    }

    injectInSideBarLeft(template: TemplateRef<any>, viewContainerRef: ViewContainerRef, id: string = 'adminMenu', mode: string = '') {

        if (mode === 'form') {
            this.sideBarForm = true;
            this.showhHeaderPanel = true;
            this.showMenuShortcut = false;
            this.showMenuNav = false;
            this.sideBarAdmin = true;
        } else {
            this.showhHeaderPanel = true;
            this.showMenuShortcut = true;
            this.showMenuNav = true;
        }

        const division = document.querySelector(`#${id}`)
        if (division !== null) {
            // Create a portalHost from a DOM element
            this.portalHost = new DomPortalOutlet(
                division,
                this.componentFactoryResolver,
                this.appRef,
                this.injector
            );

            // Create a template portal
            const templatePortal = new TemplatePortal(
                template,
                viewContainerRef
            );

            // Attach portal to host
            this.portalHost.attach(templatePortal);
        }

    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    initTemplate(template: TemplateRef<any>, viewContainerRef: ViewContainerRef, id: string = 'adminMenu', mode: string = '') {
        const division = document.querySelector(`#${id}`);
        if (division === null) {
            return;
        }

        // Create a portalHost from a DOM element
        this.portalHost = new DomPortalOutlet(
            division,
            this.componentFactoryResolver,
            this.appRef,
            this.injector
        );

        // Create a template portal
        const templatePortal = new TemplatePortal(
            template,
            viewContainerRef
        );

        // Attach portal to host
        this.portalHost.attach(templatePortal);
    }
}
