import { ComponentFixture, TestBed, fakeAsync, flush, tick } from "@angular/core/testing"
import { FolderDocumentListComponent } from "@appRoot/folder/document-list/folder-document-list.component";
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from "@ngx-translate/core";
import { Observable, of } from "rxjs";
import { RouterTestingModule } from "@angular/router/testing";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { DatePipe } from "@angular/common";
import { AdministrationService } from '@appRoot/administration/administration.service';
import { PrivilegeService } from '@service/privileges.service';
import { FoldersService } from '@appRoot/folder/folders.service';
import { FiltersListService } from "@service/filtersList.service";
import { AppListModule } from "@appRoot/app-list.module";
import { PanelListComponent } from "@appRoot/list/panel/panel-list.component";
import * as langFrJson from '@langs/lang-fr.json';

class FakeLoader implements TranslateLoader {
    getTranslation(): Observable<any> {
        return of({ lang: langFrJson });
    }
}

describe('Folder Document List Component', async () => {
    let translateService: TranslateService;
    let component: FolderDocumentListComponent;
    let fixture: ComponentFixture<FolderDocumentListComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                AppListModule,
                RouterTestingModule,
                BrowserAnimationsModule,
                TranslateModule,
                HttpClientTestingModule,
                BrowserModule,
                TranslateModule.forRoot({
                    loader: { provide: TranslateLoader, useClass: FakeLoader },
                }),
            ],
            providers: [
                TranslateService,
                TranslateStore,
                FoldersService,
                PrivilegeService,
                DatePipe,
                AdministrationService,
                FiltersListService
            ],
            declarations: [FolderDocumentListComponent, PanelListComponent]
        }).compileComponents();

        translateService = TestBed.inject(TranslateService);
        translateService.use('fr');
    });


    beforeEach(() => {
        fixture = TestBed.createComponent(FolderDocumentListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    describe('Create component', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });
    });

    describe('Folder info and resources', () => {
        it('Load folder info and resources and check table length, export data button and not allowed resource', fakeAsync(() => {
            loadResources(component, fixture);
            const nativeElement = fixture.nativeElement;
            const tabelCells: any[] = nativeElement.querySelectorAll('.mat-cell');
            const exportBtn = nativeElement.querySelector('button[id=exportDatas]');
            const mainInfo: any[] = Array.from(nativeElement.querySelectorAll('.main-info-action'));

            expect(tabelCells.length).toEqual(5); // should display 5 resources
            expect(exportBtn.disabled).toBeTruthy(); // export data button should be disabled

            // check authorized resources
            expect(mainInfo.some((element: any) => element.innerText.trim() === 'Ce document est en dehors de votre périmètre')).toBeTruthy();
        }));
    });

    describe('Select resources, check export data button and call ExportComponent', () => {
        it('Select allowed and not allowed resources and export data button should not be disabled', fakeAsync(() => {
            loadResources(component, fixture);
            
            component.data[1].checked = true;
            component.data[2].checked = true;
            component.selectedRes = [101, 102];

            fixture.detectChanges();
            tick(100);
            
            const nativeElement = fixture.nativeElement;
            const exportBtn = nativeElement.querySelector('button[id=exportDatas]');
            const checkboxElements = nativeElement.querySelectorAll('mat-checkbox[ng-reflect-checked=true]');

            expect(checkboxElements.length).toBe(2);
            expect(exportBtn.disabled).toBeFalse();
            
            flush();

            exportBtn.click();

            fixture.detectChanges();
            tick(300);
        }));
    })

});

function loadResources(component: FolderDocumentListComponent, fixture: ComponentFixture<FolderDocumentListComponent>) {
    const resourcesMock: any[] = [
        {
            "resId": 100,
            "chrono": "MAARCH/2023A/1",
            "barcode": null,
            "subject": "Courrier de test - 1",
            "confidentiality": null,
            "statusLabel": "A e-viser",
            "statusImage": "fm-letter-status-aval",
            "priorityColor": "#ff0000",
            "closing_date": null,
            "countAttachments": 7,
            "hasDocument": true,
            "mailTracking": false,
            "integrations": [],
            "retentionFrozen": false,
            "binding": null,
            "countNotes": 1,
            "countSentResources": 2,
            "folders": [
                {
                    "id": 39,
                    "label": "MAARCH"
                }
            ],
            "display": [],
            "allowed": true
        },
        {
            "resId": 101,
            "chrono": "MAARCH/2023A/2",
            "barcode": null,
            "subject": "Courrier de test - 2",
            "confidentiality": null,
            "statusLabel": "A e-viser",
            "statusImage": "fm-letter-status-aval",
            "priorityColor": "#009dc5",
            "closing_date": null,
            "countAttachments": 6,
            "hasDocument": true,
            "mailTracking": false,
            "integrations": [],
            "retentionFrozen": false,
            "binding": null,
            "countNotes": 1,
            "countSentResources": 0,
            "folders": [
                {
                    "id": 39,
                    "label": "MAARCH"
                }
            ],
            "display": [],
            "allowed": true
        },
        {
            "resId": 102,
            "chrono": "MAARCH/2023A/3",
            "barcode": null,
            "subject": "Courrier de test - 3",
            "confidentiality": null,
            "statusLabel": "A e-viser",
            "statusImage": "fm-letter-status-aval",
            "priorityColor": "#009dc5",
            "closing_date": null,
            "countAttachments": 3,
            "hasDocument": true,
            "mailTracking": false,
            "integrations": [],
            "retentionFrozen": false,
            "binding": null,
            "countNotes": 1,
            "countSentResources": 0,
            "folders": [
                {
                    "id": 39,
                    "label": "MAARCH"
                }
            ],
            "display": [],
            "allowed": false
        },
        {
            "resId": 103,
            "chrono": "MAARCH/2023A/4",
            "barcode": null,
            "subject": "Courrier de test - 4",
            "confidentiality": null,
            "statusLabel": "A e-viser",
            "statusImage": "fm-letter-status-aval",
            "priorityColor": "#009dc5",
            "closing_date": null,
            "countAttachments": 3,
            "hasDocument": true,
            "mailTracking": false,
            "integrations": [],
            "retentionFrozen": false,
            "binding": null,
            "countNotes": 3,
            "countSentResources": 0,
            "folders": [
                {
                    "id": 39,
                    "label": "MAARCH"
                }
            ],
            "display": [],
            "allowed": false
        },
        {
            "resId": 104,
            "chrono": "MAARCH/2023A/5",
            "barcode": null,
            "subject": "Courrier de test - 5",
            "confidentiality": null,
            "statusLabel": "A e-viser",
            "statusImage": "fm-letter-status-aval",
            "priorityColor": "#009dc5",
            "closing_date": null,
            "countAttachments": 1,
            "hasDocument": true,
            "mailTracking": false,
            "integrations": [],
            "retentionFrozen": false,
            "binding": null,
            "countNotes": 1,
            "countSentResources": 0,
            "folders": [
                {
                    "id": 39,
                    "label": "MAARCH"
                }
            ],
            "display": [],
            "allowed": false
        }
    ];

    component.loading = false;
    component.isLoadingResults = false;

    fixture.detectChanges();
    tick(100);

    component.folderInfo = {
        id: 10,
        label: 'Folder test',
        ownerDisplayName: 'Barbara BAIN',
        parent_id: null,
        pinned: false,
        public: true,
        entitiesSharing: [],
        sharing: {
            entities: [],
            user_id: 19
        }
    };

    component.allResInBasket = [100, 101, 102, 103, 104];
    component.resultsLength = component.allResInBasket.length;
    component.notAllowedResources = resourcesMock.filter((resource: any) => !resource.allowed).map((item: any) => item.resId);    
    component.data = component.processPostData({ resources: resourcesMock }).resources;

    fixture.detectChanges();
    tick(300);
}