import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
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
import { SignatureBookStampsComponent } from '@appRoot/signatureBook/stamps/signature-book-stamps.component';

class FakeLoader implements TranslateLoader {
    getTranslation(): Observable<any> {
        return of({ lang: langFrJson });
    }
}

describe('SignatureBookStampsComponent', () => {
    let component: SignatureBookStampsComponent;
    let fixture: ComponentFixture<SignatureBookStampsComponent>;
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
                ActionsService,
                FoldersService,
                FiltersListService,
                PrivilegeService,
                AdministrationService,
                DatePipe,
                TranslateStore,
                HttpClient,
            ],
            declarations: [SignatureBookStampsComponent],
        }).compileComponents();

        // Set lang
        translateService = TestBed.inject(TranslateService);
        translateService.use('fr');
    });

    beforeEach(fakeAsync(() => {
        httpTestingController = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(SignatureBookStampsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    describe('Create component', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });
    });

    describe('Stamp List', () => {
        it('Stamp List is empty', fakeAsync(() => {
            const req = httpTestingController.expectOne(
                `../rest/users/${component.userId}/visaSignatures`
            );
            req.flush([]);
            fixture.detectChanges();
            expect(fixture.debugElement.nativeElement.querySelector('.no-stamp')).toBeTruthy();
            flush();
        }));
    });
});
