import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { SharedModule } from '@appRoot/app-common.module';
import { HttpClient } from '@angular/common/http';
import * as langFrJson from '@langs/lang-fr.json';
import { ActionsService } from '@appRoot/actions/actions.service';
import { FoldersService } from '@appRoot/folder/folders.service';
import { DatePipe } from '@angular/common';
import { FiltersListService } from '@service/filtersList.service';
import { PrivilegeService } from '@service/privileges.service';
import { AdministrationService } from '@appRoot/administration/administration.service';
import { ActivatedRoute } from '@angular/router';
import { Injectable } from '@angular/core';
import { SignatureBookService } from '@appRoot/signatureBook/signature-book.service';
import { SignatureBookComponent } from '@appRoot/signatureBook/signature-book.component';
import { ResourcesListComponent } from '@appRoot/signatureBook/resourcesList/resources-list.component';
import { SignatureBookStampsComponent } from '@appRoot/signatureBook/stamps/signature-book-stamps.component';
import { SignatureBookHeaderComponent } from '@appRoot/signatureBook/header/signature-book-header.component';
import { MatIconRegistry } from '@angular/material/icon';
import { MaarchSbTabsComponent } from '@appRoot/signatureBook/tabs/signature-book-tabs.component';
import { ResourceToolbarComponent } from '@appRoot/signatureBook/resourceToolbar/resource-toolbar.component';
import { MaarchSbContentComponent } from '@appRoot/signatureBook/content/signature-book-content.component';
import { DocumentViewerComponent } from '@appRoot/viewer/document-viewer.component';

@Injectable()
export class ActivatedRouteStub
{
    private subject = new BehaviorSubject(this.testParams);
    params = this.subject.asObservable();

    private _testParams: object;
    get testParams() { return this._testParams; }
    set testParams(params: object) {
        this._testParams = params;
        this.subject.next(params);
    }
}

class FakeLoader implements TranslateLoader {
    getTranslation(): Observable<any> {
        return of({ lang: langFrJson });
    }
}

describe('SignatureBookComponent', () => {
    let component: SignatureBookComponent;
    let fixture: ComponentFixture<SignatureBookComponent>;
    let httpTestingController: HttpTestingController;
    let translateService: TranslateService;
    let signatureBookService: SignatureBookService;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                SharedModule,
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
                ActionsService,
                FoldersService,
                FiltersListService,
                PrivilegeService,
                AdministrationService,
                DatePipe,
                TranslateStore,
                HttpClient,
                SignatureBookService,
                { provide: ActivatedRoute, useValue: {
                    params: of({
                        resId: '100',
                        basketId: '1',
                        groupId: '1',
                        userId: '1',
                    }),
                }, }
            ],
            declarations: [
                SignatureBookComponent,
                ResourcesListComponent,
                SignatureBookStampsComponent,
                SignatureBookHeaderComponent,
                MaarchSbTabsComponent,
                ResourceToolbarComponent,
                MaarchSbContentComponent,
                DocumentViewerComponent
            ],
        }).compileComponents();

        // Set lang
        translateService = TestBed.inject(TranslateService);
        translateService.use('fr');

        signatureBookService = TestBed.inject(SignatureBookService);
        signatureBookService.config.isNewInternalParaph = true;

        //  TO DO : Set maarchLogoFull SVG
        const iconRegistry = TestBed.inject(MatIconRegistry);
        const sanitizer = TestBed.inject(DomSanitizer);
        const url: string = '../rest/images?image=logo';
        iconRegistry.addSvgIcon('maarchLogoFull', sanitizer.bypassSecurityTrustResourceUrl(url));
    });

    beforeEach((() => {
        httpTestingController = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(SignatureBookComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    describe('Create component', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });
        it('Toolbar should appears by default if no attachments', fakeAsync(() => {
            const res = httpTestingController.expectOne('../rest/signatureBook/users/1/groups/1/baskets/1/resources/100');
            expect(res.request.method).toBe('GET');
            res.flush({
                "resourcesToSign": [],
                "resourcesAttached": [],
                "canSignResources": true,
                "canUpdateResources": true,
                "hasActiveWorkflow": true,
                "isCurrentWorkflowUser": true
            });
            fixture.detectChanges();
            tick();
            fixture.detectChanges();
            const nativeElement = fixture.nativeElement;
            expect(nativeElement.querySelector('app-resource-toolbar')).toBeTruthy();
        }));
        it('First attachment should appears by default if attachments', fakeAsync(() => {
            const res = httpTestingController.expectOne('../rest/signatureBook/users/1/groups/1/baskets/1/resources/100');
            expect(res.request.method).toBe('GET');
            res.flush({
                "resourcesToSign": [],
                "resourcesAttached": [
                    {
                        "resId": 189,
                        "resIdMaster": 100,
                        "title": "test",
                        "chrono": "",
                        "signedResId": 1,
                        "type": "simple_attachment",
                        "typeLabel": "Pièce jointe",
                        "isConverted": true,
                        "canModify": true,
                        "canDelete": true
                    },
                    {
                        "resId": 190,
                        "resIdMaster": 100,
                        "title": "test 2",
                        "chrono": "",
                        "signedResId": 1,
                        "type": "simple_attachment",
                        "typeLabel": "Pièce jointe",
                        "isConverted": true,
                        "canModify": true,
                        "canDelete": true
                    }
                ],
                "canSignResources": true,
                "canUpdateResources": true,
                "hasActiveWorkflow": true,
                "isCurrentWorkflowUser": true
            });
            fixture.detectChanges();
            tick();
            fixture.detectChanges();
            tick();
            fixture.detectChanges();
            const nativeElement = fixture.nativeElement;
            expect(nativeElement.querySelector('app-document-viewer').attributes['ng-reflect-res-id'].value).toEqual('189');
        }));
    });

});
