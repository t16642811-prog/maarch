import { ComponentFixture, TestBed, fakeAsync, flush, tick } from "@angular/core/testing"
import { SendExternalSignatoryBookActionComponent } from "@appRoot/actions/send-external-signatory-book-action/send-external-signatory-book-action.component";
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from "@ngx-translate/core";
import { Observable, of } from "rxjs";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { RouterTestingModule } from "@angular/router/testing";
import { SharedModule } from "@appRoot/app-common.module";
import { DatePipe } from "@angular/common";
import { AdministrationService } from '@appRoot/administration/administration.service';
import { FoldersService } from '@appRoot/folder/folders.service';
import { PrivilegeService } from '@service/privileges.service';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogModule as MatDialogModule , MatLegacyDialogRef as MatDialogRef } from "@angular/material/legacy-dialog";
import { ExternalSignatoryBookManagerService } from "@service//externalSignatoryBook/external-signatory-book-manager.service";
import { AuthService } from "@service//auth.service";
import { IParaphComponent } from "@appRoot/actions/send-external-signatory-book-action/i-paraph/i-paraph.component";
import { AttachmentsListComponent } from "@appRoot/attachments/attachments-list.component";
import * as langFrJson from '@langs/lang-fr.json';
import { FiltersListService } from "@service/filtersList.service";

class FakeLoader implements TranslateLoader {
    getTranslation(): Observable<any> {
        return of({ lang: langFrJson });
    }
}

describe('SendExternalSignatoryBookActionComponent', () => {
    let component: SendExternalSignatoryBookActionComponent;
    let fixture: ComponentFixture<SendExternalSignatoryBookActionComponent>;
    let translateService: TranslateService;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                MatDialogModule,
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
                {
                    provide: MatDialogRef,
                    useValue: {}
                },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {}
                },
                TranslateService,
                TranslateStore,
                FoldersService,
                PrivilegeService,
                DatePipe,
                AdministrationService,
                ExternalSignatoryBookManagerService,
                AttachmentsListComponent,
                FiltersListService
            ],
            declarations: [SendExternalSignatoryBookActionComponent, IParaphComponent]
        }).compileComponents();

        // Set lang
        translateService = TestBed.inject(TranslateService);
        translateService.use('fr');
    });

    beforeEach(fakeAsync(() => {
        TestBed.inject(AuthService).externalSignatoryBook = { id: 'iParapheur', from: 'pastell', integratedWorkflow: false };
        fixture = TestBed.createComponent(SendExternalSignatoryBookActionComponent); // Initialize AttachmentsListComponent
        component = fixture.componentInstance;
        expect(component).toBeTruthy();
        component.data = {
            action: {
                component: 'sendExternalSignatoryBookAction',
                id: 527,
                label: 'Envoyer au parapheur externe'
            },
            additionalInfo: {
                canGoToNextRes: false,
                inLocalStorage: false,
                showToggle: false
            },
            basketId: '26',
            groupId: '2',
            indexActionRoute: '../rest/indexing/groups/2/actions/527',
            processActionRoute: '../rest/resourcesList/users/19/groups/2/baskets/26/actions/527',
            resIds: [100],
            resource: { resId: 100, chrono: 'MAARCH/2023A/1', subject: 'Courrier de test', integrations: { inSignatureBook: true } },
            usrId: '19'
        };
    }));

    describe('Load external signatory book id and set attachments', () => {
        it('Set attachments and show integrationTarget filter', fakeAsync(() => {
            spyOn(component.externalSignatoryBook, 'checkExternalSignatureBook').and.returnValue(Promise.resolve({ availableResources: [], additionalsInfos: { attachments: [], noAttachment: [] }, errors: [] }));

            component.attachmentsList = TestBed.inject(AttachmentsListComponent);

            tick(300);
            expect(component.loading).toBe(false);

            fixture.detectChanges();
            tick(300);
            flush();

            loadAttachments(component, fixture);
        }));
    });

    it('Check if filters are loaded and currentIntegrationTarget equal to inSignatureBook', fakeAsync(() => {
        spyOn(component.externalSignatoryBook, 'checkExternalSignatureBook').and.returnValue(Promise.resolve({ availableResources: [], additionalsInfos: { attachments: [], noAttachment: [] }, errors: [] }));

        component.attachmentsList = TestBed.inject(AttachmentsListComponent);
        component.attachmentsList.isModal = true;

        fixture.detectChanges();

        tick(300);
        expect(component.loading).toBe(false);

        fixture.detectChanges();
        tick(300);
        flush();

        fixture.whenStable().finally(() => {
            loadAttachments(component, fixture);
            fixture.detectChanges();
            tick(300);

            // Show filters
            const matButtonToggleGroup = fixture.nativeElement.querySelector('#integrationTarget');
            const matButtonToggle = matButtonToggleGroup.querySelectorAll('mat-button-toggle');
            expect(matButtonToggle.length).toEqual(4);

            fixture.detectChanges();
            tick(300);

            // Check if filter selected by default is : inSignatureBook 
            const matButtonToggleChecked = matButtonToggleGroup.querySelector('mat-button-toggle[ng-reflect-checked = true]');
            expect(matButtonToggleChecked.getAttribute('title')).toEqual(component.translate.instant('lang.attachInSignatureBookDesc'))
            flush();
        });
    }));
});

function loadAttachments(component: SendExternalSignatoryBookActionComponent, fixture: ComponentFixture<SendExternalSignatoryBookActionComponent>) {
    const attachmentsTypesMock: any =  {
        response_project: {
            id: 3,
            typeId: 'response_project',
            label: 'Projet de réponse',
            visible: true,
            emailLink: true,
            signable: true,
            signedByDefault: false,
            icon: 'R',
            chrono: true,
            versionEnabled: true,
            newVersionDefault: true
        },
        simple_attachment: {
            id: 4,
            typeId: 'simple_attachment',
            label: 'Pièce jointe',
            visible: true,
            emailLink: true,
            signable: false,
            signedByDefault: false,
            icon: 'PJ',
            chrono: true,
            versionEnabled: false,
            newVersionDefault: false
        }
    };

    const filterAttachTypesMock: any[] = [
        {
            id: 'response_project',
            label: 'Projet de réponse'
        },
        {
            id: 'simple_attachment',
            label: 'Pièce jointe simple'
        }
    ]

    const attachmentsMock: any[] = [
        {
            resId: 68,
            resIdMaster: 100,
            chrono: 'Chrono-PJ-68',
            typist: 19,
            title: 'Projet de réponse',
            modifiedBy: '',
            creationDate: '2023-09-26 11:19:16.882836',
            modificationDate: null,
            relation: 1,
            status: 'A_TRA',
            type: 'response_project',
            inSignatureBook: true,
            inSendAttach: false,
            external_state: [],
            typistLabel: 'Barbara BAIN',
            typeLabel: 'Projet de réponse',
            canConvert: true,
            canUpdate: true,
            canDelete: true,
            signable: true,
            hideMainInfo: false,
            thumbnail: '../rest/attachments/' + 68 + '/thumbnail'
        },
        {
            resId: 67,
            resIdMaster: 100,
            chrono: 'Chrono-PJ-67',
            title: 'Pièce jointe de test',
            typist: 19,
            modifiedBy: '',
            creationDate: '2023-09-26 11:19:16.859478',
            modificationDate: null,
            relation: 1,
            status: 'A_TRA',
            type: 'simple_attachment',
            inSignatureBook: false,
            inSendAttach: false,
            external_state: [],
            typistLabel: 'Barbara BAIN',
            typeLabel: 'Pièce jointe simple',
            canConvert: true,
            canUpdate: true,
            canDelete: true,
            signable: false,
            hideMainInfo: false,
            thumbnail: '../rest/attachments/' + 67 + '/thumbnail'
        }
    ];

    component.attachmentsList.attachmentTypes = attachmentsTypesMock;
    component.attachmentsList.attachments = attachmentsMock;
    component.attachmentsList.attachmentsClone = component.attachmentsList.attachments;
    component.attachmentsList.filterAttachTypes = filterAttachTypesMock;
    component.attachmentsList.loading = false;

    fixture.detectChanges();
    tick(300);
    flush();
}