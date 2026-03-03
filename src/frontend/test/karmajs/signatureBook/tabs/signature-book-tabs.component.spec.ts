import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserModule } from '@angular/platform-browser';
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
import { MaarchSbTabsComponent } from '@appRoot/signatureBook/tabs/signature-book-tabs.component';
import { Attachment } from '@models/attachment.model';

class FakeLoader implements TranslateLoader {
    getTranslation(): Observable<any> {
        return of({ lang: langFrJson });
    }
}

describe('SignatureBookTabsComponent', () => {
    let component: MaarchSbTabsComponent;
    let fixture: ComponentFixture<MaarchSbTabsComponent>;
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
                ActionsService,
                FoldersService,
                FiltersListService,
                PrivilegeService,
                AdministrationService,
                DatePipe,
                TranslateStore,
                HttpClient,
            ],
            declarations: [MaarchSbTabsComponent],
        }).compileComponents();

        // Set lang
        translateService = TestBed.inject(TranslateService);
        translateService.use('fr');
    });

    beforeEach(fakeAsync(() => {
        fixture = TestBed.createComponent(MaarchSbTabsComponent);
        component = fixture.componentInstance;
        // Is normally set in signatureBookComponent init
        component.signatureBookService.selectedAttachment.index = 0;
        component.signatureBookService.selectedDocToSign.index = 0;
        fixture.detectChanges();
    }));

    describe('Create component', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });
    });

    describe('Select tabs', () => {
        it('set attachments && check selected id and color on init', fakeAsync(() => {
            component.documents = getAttachments();

            fixture.detectChanges();
            tick();

            const tabs = fixture.nativeElement.querySelector('.book-mark-container').querySelectorAll('.book-mark-item');
            expect(tabs.length).toEqual(3); // equal to attachments length
            expect(component.selectedId).toEqual(0); // first tab is selected

            const firstTab = tabs[0];
            expect(firstTab.classList.contains('book-mark-item-selected')).toBeTrue(); // the first tab should be selected and have the corresponding class
            expect(tabs[tabs.length - 1].classList.contains('book-mark-item-selected')).toBeFalse(); // the last tab should not be selected

            // click on another tab and check the change of index and color
            const secondTab = tabs[1];
            secondTab.click();

            fixture.detectChanges();
            tick(100);

            expect(component.selectedId).toEqual(1);
            expect(firstTab.classList.contains('book-mark-item-selected')).toBeFalse();
            expect(secondTab.classList.contains('book-mark-item-selected')).toBeTrue();
        }));

        it('selected id and color should be changed after tab selection', fakeAsync(() => {
            component.documents = getAttachments();

            fixture.detectChanges();
            tick();

            const tabs = fixture.nativeElement.querySelector('.book-mark-container').querySelectorAll('.book-mark-item');
            expect(tabs.length).toEqual(3); // equal to attachments length
            expect(component.selectedId).toEqual(0); // first tab is selected

            // click on another tab and check the change of index and color
            tabs[1].click();

            fixture.detectChanges();
            tick(100);

            expect(component.selectedId).toEqual(1);
            expect(tabs[0].classList.contains('book-mark-item-selected')).toBeFalse();
            expect(tabs[1].classList.contains('book-mark-item-selected')).toBeTrue();

        }));
    })
});

function getAttachments(): Attachment[] {
    return [
        new Attachment({
            resId: 100,
            resIdMaster: null,
            resourceUrn: '',
            canConvert: true,
            canDelete: false,
            canUpdate: false,
            chrono: 'MAARCH/2024A/23',
            title: 'Courrier de test',
            type: 'main_document',
            typeLabel: 'Document principal',
            signedResId: null,
        }),
        new Attachment({
            resId: 120,
            resIdMaster: 100,
            canConvert: true,
            canDelete: false,
            canUpdate: false,
            chrono: 'MAARCH/2024A/24',
            title: 'Pièce jointe test',
            type: 'simple_attachment',
            typeLabel: 'Pièce jointe',
            signedResId: 1,
        }),
        new Attachment({
            resId: 121,
            resIdMaster: 100,
            canConvert: true,
            canDelete: false,
            canUpdate: false,
            chrono: 'MAARCH/2024A/25',
            title: 'Pièce joibte capturée',
            typeLabel: 'Pièce joibte capturée',
            type: 'incoming_mail_attachment',
            signedResId: 2,
        }),
    ];
}
