import { ComponentFixture, TestBed, fakeAsync, tick } from "@angular/core/testing"
import { ExportComponent } from "@appRoot/list/export/export.component";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from "@ngx-translate/core";
import { Observable, of } from "rxjs";
import { SharedModule } from '@appRoot/app-common.module';
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { RouterTestingModule } from "@angular/router/testing";
import { PrivilegeService } from '@service/privileges.service';
import { DatePipe } from "@angular/common";
import { FoldersService } from '@appRoot/folder/folders.service';
import * as langFrJson from '@langs/lang-fr.json';
import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from "@angular/material/legacy-dialog";


class FakeLoader implements TranslateLoader {
    getTranslation(): Observable<any> {
        return of({ lang: langFrJson });
    }
}

describe('ExportComponent', () => {
    let translateService: TranslateService;
    let component: ExportComponent;
    let fixture: ComponentFixture<ExportComponent>;
    let httpTestingController: HttpTestingController;

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
            ],
            declarations: [ExportComponent]
        }).compileComponents();

        translateService = TestBed.inject(TranslateService);
        translateService.setDefaultLang('fr');
    });

    beforeEach(() => {
        httpTestingController = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(ExportComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    describe('Create component', () => {
        it('should create', () => {
            expect(component).toBeDefined();
        });
    });

    describe('Resources, delimiter and format', () => {
        it('load resources, set delimiter, format and check available and selected elements', fakeAsync(() => {
            component.exportModel.resources = [101, 102];
            component.exportModel.format = 'pdf';

            fixture.detectChanges();
            tick(100);

            const nativeElement = fixture.nativeElement;
            const availableElements = nativeElement.querySelector('#availableElements').querySelectorAll('.columns');
            const selectedElements = nativeElement.querySelector('#selectedElements').querySelectorAll('.columns');
            const exportBtn = nativeElement.querySelector('button[name=export]');

            expect(availableElements.length).toBe(39);
            expect(selectedElements.length).toBe(0);
            expect(exportBtn.disabled).toBeTruthy();
        }));

        xit('select some elements and check export button status', fakeAsync(() => {
            component.exportModel.resources = [101, 102];
            component.exportModel.format = 'pdf';

            fixture.detectChanges();
            tick(100);

            const nativeElement = fixture.nativeElement;
            const availableElements = nativeElement.querySelector('#availableElements').querySelectorAll('.columns');
            const exportBtn = nativeElement.querySelector('button[name=export]');

            availableElements[0].querySelector('i').click();
            availableElements[3].querySelector('i').click();

            fixture.detectChanges();
            tick(100);
            expect(exportBtn.disabled).toBeFalsy();

            exportBtn.click();

            fixture.detectChanges();
            tick(300);

            // Create empty pdf
            const createEmptyPdf = () => {
                return '%PDF-1.4\n%%EOF\n';
            };
  
            // Generate blob
            const pdfContent = createEmptyPdf();
            const desiredSize = 50;
  
            // Create ArrayBuffer with desiredSize
            const buffer = new ArrayBuffer(desiredSize);
  
            // Create Unit8Array from ArrayBuffer and fill with 0
            const uintArray = new Uint8Array(buffer);
            uintArray.fill(0);
  
            // Set pdf in Uint8Array
            const pdfUintArray = new TextEncoder().encode(pdfContent);
            uintArray.set(pdfUintArray);
  
            // Create Blob from Uint8Array
            const blob = new Blob([uintArray], { type: 'application/pdf' });
  
            const req = httpTestingController.expectOne('../rest/resourcesList/exports');
            expect(req.request.method).toEqual('PUT');
            expect(req.request.body).toEqual(component.exportModel);
            expect(req.request.responseType).toEqual('blob');
            req.flush(blob);

            fixture.detectChanges();
            tick(300);
        }));
    });
});