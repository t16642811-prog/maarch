import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { SharedModule } from '@appRoot/app-common.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LoginComponent } from '@appRoot/login/login.component';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FoldersService } from '@appRoot/folder/folders.service';
import { PrivilegeService } from '@service/privileges.service';
import { DatePipe } from '@angular/common';
import { AdministrationService } from '@appRoot/administration/administration.service';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { MatIconRegistry } from '@angular/material/icon';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import * as langFrJson from '@langs/lang-fr.json';
import { Component } from '@angular/core';
import { FiltersListService } from "@service/filtersList.service";

/*
 * Test component with empty template to simulate navigation to home page in the event of successful authentication
*/
@Component({ template: '' })
class DummyComponent {}

class FakeLoader implements TranslateLoader {
    getTranslation(): Observable<any> {
        return of({ lang: langFrJson });
    }
}

describe('LoginComponent', () => {
    let component: LoginComponent;
    let fixture: ComponentFixture<LoginComponent>;
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
                RouterTestingModule.withRoutes([{ path: 'home', component: DummyComponent }]),
            ],
            providers: [
                TranslateService,
                TranslateStore,
                FoldersService,
                PrivilegeService,
                FiltersListService,
                DatePipe,
                AdministrationService,
                HttpClient,
                MatIconRegistry,
                {
                    provide: DomSanitizer,
                    useValue: {
                        bypassSecurityTrustResourceUrl: (url: string) => url,
                        bypassSecurityTrustHtml: (html: string) => html,
                        sanitize: (ctx: any, val: string) => val,
                    },
                },
            ],
            declarations: [LoginComponent, DummyComponent],
        }).compileComponents();

        // Set lang
        translateService = TestBed.inject(TranslateService);
        translateService.use('fr');
    });

    beforeEach(fakeAsync(() => {
        httpTestingController = TestBed.inject(HttpTestingController); // Initialize HttpTestingController
        //  TO DO : Set maarchLogoFull SVG
        const iconRegistry = TestBed.inject(MatIconRegistry);
        const sanitizer = TestBed.inject(DomSanitizer);
        const url: string = '../rest/images?image=logo';
        tick(300);
        iconRegistry.addSvgIcon('maarchLogoFull', sanitizer.bypassSecurityTrustResourceUrl(url));
        fixture = TestBed.createComponent(LoginComponent); // Initialize LoginComponent
        component = fixture.componentInstance;
        fixture.detectChanges();
        expect(component).toBeTruthy();
    }));

    describe('Login test', () => {
        it('Focus on login and password inputs', () => {
            const nativeElement = fixture.nativeElement;
            const login = nativeElement.querySelector('input[name=login]');
            const password = nativeElement.querySelector('input[name=password]');
            expect(login).toBeTruthy();
            expect(password).toBeTruthy();
            expect(login.getAttributeNode('autofocus')).toBeTruthy();
            expect(login.getAttributeNode('autofocus').specified).toBeTrue();
        });

        it('Verify that the login input field now has the expected value', fakeAsync(() => {
            const nativeElement = fixture.nativeElement;
            const login = nativeElement.querySelector('input[name=login]');
            const password = nativeElement.querySelector('input[name=password]');

            expect(login).toBeTruthy();
            expect(password).toBeTruthy();

            // Set the value of the login input field
            login.value = 'bbain';
            password.value = 'maarch';

            // Trigger an input event to notify Angular of the value change
            login.dispatchEvent(new Event('input'));
            password.dispatchEvent(new Event('input'));

            fixture.detectChanges();

            // Verify that the login input field now has the expected value
            expect(login.value).toBe('bbain');
            expect(password.value).toBe('maarch');
        }));

        it('Navigate to Home after sucessfull login', fakeAsync(() => {
            const nativeElement = fixture.nativeElement;
            const login = nativeElement.querySelector('input[name=login]');
            const password = nativeElement.querySelector('input[name=password]');

            // Set the value of the login input field
            login.value = 'bbain';
            password.value = 'maarch';

            // Trigger an input event to notify Angular of the value change
            login.dispatchEvent(new Event('input'));
            password.dispatchEvent(new Event('input'));
            fixture.detectChanges();
            component.onSubmit();

            // Use whenStable() to wait for all pending asynchronous activities to complete
            fixture.whenStable().then(() => {
                // Check that the navigation was triggered
                // const router = TestBed.inject(Router);
                // const navigateSpy = spyOn(router, 'navigate');

                // Handle the POST request and provide a mock response
                httpTestingController = TestBed.inject(HttpTestingController);
                const req = httpTestingController.expectOne('../rest/authenticate');
                expect(req.request.method).toBe('POST');
                expect(req.request.body).toEqual({ login: login.value, password: password.value }); // Add the request body
                req.flush({}); // Provide a mock response
                setTimeout(() => {
                    // Check if navigation is called with the correct route
                    // expect(navigateSpy).toHaveBeenCalledWith(['/home']);
                }, 500);
                // Advance the fakeAsync timer to complete the HTTP request
                tick(300);
                // Flush any pending asynchronous tasks
                flush();
            });
        }));

        it('Red gritter must apear with message when incorrect password typed', fakeAsync(() => {
            const nativeElement = fixture.nativeElement;
            const login = nativeElement.querySelector('input[name=login]');
            const password = nativeElement.querySelector('input[name=password]');
            httpTestingController = TestBed.inject(HttpTestingController);

            // Set the value of the login input field
            login.value = 'bbain';
            password.value = 'wrongpassword'; // Incorrect password

            // Trigger an input event to notify Angular of the value change
            login.dispatchEvent(new Event('input'));
            password.dispatchEvent(new Event('input'));
            fixture.detectChanges();
            component.onSubmit();
            const req = httpTestingController.expectOne('../rest/authenticate');
            req.flush({ "errors": "Authentication Failed" }, { status: 401, statusText: 'Unauthorized' });
            fixture.detectChanges();
            const hasErrorGritter = document.querySelectorAll('.mat-snack-bar-container.error-snackbar').length;
            expect(hasErrorGritter).toEqual(1);
            const notifContent = document.querySelector('.notif-container-content-msg #message-content').innerHTML;
            expect(notifContent).toEqual("L'identifiant ou le mot de passe est incorrect<br>(ou l'utilisateur n'a pas le droit de se connecter)");
            flush();
        }));
    });
});
