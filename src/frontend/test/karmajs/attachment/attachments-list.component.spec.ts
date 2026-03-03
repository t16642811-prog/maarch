import { ComponentFixture, TestBed, fakeAsync, flush, flushMicrotasks, tick } from "@angular/core/testing";
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from "@ngx-translate/core";
import { Observable, of } from "rxjs";
import { AttachmentsListComponent } from "@appRoot/attachments/attachments-list.component";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { BrowserModule, By } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { RouterTestingModule } from "@angular/router/testing";
import { SharedModule } from "@appRoot/app-common.module";
import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { AdministrationService } from '@appRoot/administration/administration.service';
import { FoldersService } from '@appRoot/folder/folders.service';
import { PrivilegeService } from '@service/privileges.service';
import { ConfirmComponent } from "@plugins/modal/confirm.component";
import * as langFrJson from '@langs/lang-fr.json';
import { FiltersListService } from "@service/filtersList.service";

class FakeLoader implements TranslateLoader {
    getTranslation(): Observable<any> {
        return of({ lang: langFrJson });
    }
}

describe('AttachmentsListComponent', () => {
    let component: AttachmentsListComponent;
    let fixture: ComponentFixture<AttachmentsListComponent>;
    let httpTestingController: HttpTestingController;
    let translateService: TranslateService;
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
                TranslateStore,
                FoldersService,
                PrivilegeService,
                DatePipe,
                AdministrationService,
                HttpClient,
                ConfirmComponent,
                FiltersListService
            ],
            declarations: [AttachmentsListComponent]
        }).compileComponents();

        // Set lang
        translateService = TestBed.inject(TranslateService);
        translateService.use('fr');
    });

    beforeEach(fakeAsync(() => {
        httpTestingController = TestBed.inject(HttpTestingController); // Initialize HttpTestingController
        fixture = TestBed.createComponent(AttachmentsListComponent); // Initialize AttachmentsListComponent
        component = fixture.componentInstance;
        component.loading = false;
        fixture.detectChanges();
    }));

    describe('Create component',() => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });
    });

    describe('Trigger event mouseover : show and hide buttons', () => {
        it('should not show buttons initially', fakeAsync(() => {
            loadAttachments();
            fixture.detectChanges();
            tick(300);
            const buttons = fixture.debugElement.queryAll(By.css('.layout button'));
            expect(buttons.length).toBe(0);
        }));

        it('show and hide buttons', fakeAsync(() => {
            loadAttachments();

            const cardDebugElement = fixture.debugElement.query(By.css('mat-card'));

            // eslint-disable-next-line @typescript-eslint/no-empty-function
            cardDebugElement.triggerEventHandler('mouseover', { stopPropagation: () => {} }); // Trigger mouseover event

            tick(150);

            fixture.detectChanges();

            const buttons = fixture.debugElement.queryAll(By.css('.layout button'));
            expect(buttons.length).toBeGreaterThan(0);

            const attachDiv = fixture.debugElement.query(By.css('#attachDiv'));

            // eslint-disable-next-line @typescript-eslint/no-empty-function
            attachDiv.triggerEventHandler('mouseover', { stopPropagation: () => {} });

            fixture.detectChanges();
            tick(150);
        }));
    });

    describe('Show button and delete attachment', () => {
        it('delete attachment', fakeAsync(() => {
            loadAttachments();

            const cardDebugElement = fixture.debugElement.query(By.css('mat-card'));
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            cardDebugElement.triggerEventHandler('mouseover', { stopPropagation: () => {} }); // Trigger mouseover event

            fixture.detectChanges();

            const deleteButton = fixture.nativeElement.querySelector('button[name=delete]');
            expect(deleteButton).toBeDefined();
            deleteButton.click();

            fixture.detectChanges();
            tick(300);

            component.dialogRef.close('ok');

            fixture.detectChanges();
            tick(300);

            const req = httpTestingController.expectOne(`../rest/attachments/${component.attachments[0].resId}`);
            expect(req.request.method).toBe('DELETE');
            req.flush({});

            // expect success notification message
            const hasSuccessGritter = document.querySelectorAll('.mat-snack-bar-container.success-snackbar').length;
            expect(hasSuccessGritter).toEqual(1);
            const notifContent = document.querySelector('.notif-container-content-msg #message-content').innerHTML;
            expect(notifContent).toEqual(component.translate.instant('lang.attachmentDeleted'));

            component.attachments.shift();
            fixture.detectChanges();

            component.loading = false;
            fixture.detectChanges();
            flush();
        }));
    });

    describe('Attachment integration to signatory book', () => {
        it('Integrate attachment to signatorybook and show success notification', fakeAsync(() => {
            loadAttachments();

            const cardDebugElement = fixture.debugElement.queryAll(By.css('mat-card'));
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            cardDebugElement[1].triggerEventHandler('mouseover', { stopPropagation: () => {} }); // Trigger mouseover event

            fixture.detectChanges();
            tick(300);

            const menuPjAction = fixture.nativeElement.querySelectorAll('button[name=menuPjAction]')[1];
            menuPjAction.click();

            fixture.detectChanges();
            tick(300);

            const putInSignatureBook = document.getElementsByName('putInSignatureBook')[0];

            // Click the button inside the mat-menu
            putInSignatureBook.click();

            fixture.detectChanges();
            const req = httpTestingController.expectOne(`../rest/attachments/${component.attachments[1].resId}/inSignatureBook`);
            expect(req.request.method).toEqual('PUT');
            expect(req.request.body).toEqual({});
            req.flush({});
            component.attachments[1].inSignatureBook = true;

            fixture.detectChanges();

            // expect success notification message
            const hasSuccessGritter = document.querySelectorAll('.mat-snack-bar-container.success-snackbar').length;
            expect(hasSuccessGritter).toEqual(1);
            const notifContent = document.querySelector('.notif-container-content-msg #message-content').innerHTML;
            expect(notifContent).toEqual(component.translate.instant('lang.actionDone'));

            fixture.detectChanges();
            flush();
        }));

        it('display signTarget or annexTarget by signable boolean for each integrated attachment', fakeAsync(() => {
            loadAttachments();

            fixture.detectChanges();
            tick(100);

            const integrationTarget: any[] = fixture.nativeElement.querySelectorAll('span[name=integrationTarget]');
            expect(integrationTarget.length).toBeGreaterThan(0);

            component.attachments.filter((attachment: any) => attachment.inSignatureBook).forEach((attachment: any, index: number) => {
                if (attachment.signable) {
                    expect(integrationTarget[index].innerHTML.trim()).toEqual(component.translate.instant('lang.signTarget'));
                } else {
                    expect(integrationTarget[index].innerHTML.trim()).toEqual(component.translate.instant('lang.annexTarget'));
                }
            });
        }));
    })

    function loadAttachments() {
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

        component.filterAttachTypes = filterAttachTypesMock;

        Object.keys(attachmentsTypesMock).forEach((type: any) => {
            component.attachmentTypes.push({
                typeId: attachmentsTypesMock[type].typeId,
                signable: attachmentsTypesMock[type].signable
            });
        });

        component.attachments = attachmentsMock;

        fixture.detectChanges();
        flushMicrotasks(); // Ensure all microtasks are completed
    }
});

