import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FoldersService } from '@appRoot/folder/folders.service';
import { PrivilegeService } from '@service/privileges.service';
import { DatePipe } from '@angular/common';
import { AdministrationService } from '@appRoot/administration/administration.service';
import { Observable, of } from 'rxjs';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { SharedModule } from '@appRoot/app-common.module';
import { ForgotPasswordComponent } from '@appRoot/login/forgotPassword/forgotPassword.component';
import { Router } from '@angular/router';
import { MatIconRegistry } from '@angular/material/icon';
import * as langFrJson from '@langs/lang-fr.json';

class FakeLoader implements TranslateLoader {
    getTranslation(): Observable<any> {
        return of({ lang: langFrJson });
    }
}

describe('Forgot password component', () => {
    let translateService: TranslateService;
    let component: ForgotPasswordComponent;
    let fixture: ComponentFixture<ForgotPasswordComponent>;
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
                })
            ],
            providers: [
                TranslateService,
                TranslateStore,
                FoldersService,
                PrivilegeService,
                DatePipe,
                AdministrationService
            ],
            declarations: [ForgotPasswordComponent]
        }).compileComponents();

        // Set lang
        translateService = TestBed.inject(TranslateService);
        translateService.use('fr');
    });

    beforeEach(fakeAsync(() => {
        httpTestingController = TestBed.inject(HttpTestingController); // Initialize HttpTestingController
        // maarchLogoWhiteFull SVG 
        const iconRegistry = TestBed.inject(MatIconRegistry);
        const sanitizer = TestBed.inject(DomSanitizer);
        const url: string = '../../../../assets/logo_white.svg';
        tick(300);
        iconRegistry.addSvgIcon('maarchLogoWhiteFull', sanitizer.bypassSecurityTrustResourceUrl(url));

        fixture = TestBed.createComponent(ForgotPasswordComponent); // Initialize ForgotPasswordComponent
        component = fixture.componentInstance;

        fixture.detectChanges();
        expect(component).toBeTruthy();
    }));

    describe('Set on input, set login and check if login value is empty', () => {
        it('focus on login', () => {
            const nativeElement = fixture.nativeElement;
            const login = nativeElement.querySelector('input[name=login]');
            expect(login).toBeTruthy();
            expect(login.getAttributeNode('autofocus')).toBeTruthy();
            expect(login.getAttributeNode('autofocus').specified).toBeTrue();
        });

        it('set login', fakeAsync(() => {
            // get login input
            const nativeElement = fixture.nativeElement;
            const login = nativeElement.querySelector('input[name=login]');

            fixture.detectChanges();

            expect(login).toBeTruthy();

            login.value = 'bbain';

            // Trigger an input event to notify Angular of the value change
            login.dispatchEvent(new Event('input'));

            fixture.detectChanges();

            // Verify that the login input field now has the expected value
            expect(login.value).toBe('bbain');

            component.generateLink();

            // Use whenStable() to wait for all pending asynchronous activities to complete
            fixture.whenStable().then(() => {
                // Now, check that the navigation was triggered
                const router = TestBed.inject(Router);
                const navigateSpy = spyOn(router, 'navigate');

                // Handle the POST request and provide a mock response
                httpTestingController = TestBed.inject(HttpTestingController);
                const req = httpTestingController.expectOne('../rest/password');
                expect(req.request.method).toBe('POST');
                expect(req.request.body).toEqual({ login: login.value }); // Add the request body
                req.flush({}); // Provide a mock response

                setTimeout(() => {
                    // Check if navigation is called with the correct route
                    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
                }, 500);
                // Advance the fakeAsync timer to complete the HTTP request
                tick(300);
                // Flush any pending asynchronous tasks
                flush();
            });
        }));

        it('check if submit button is disabled when login input contains only spaces', fakeAsync(() => {
            const nativeElement = fixture.nativeElement;
            const login = nativeElement.querySelector('input[name=login]');
            const submit = nativeElement.querySelector('button[type=submit]');

            expect(login).toBeTruthy();

            login.value = '    '; // login with only spaces

            fixture.detectChanges();

            component.containsSpaces(login.value);

            expect(submit.disabled).toBeTruthy();
        }));
    });
});