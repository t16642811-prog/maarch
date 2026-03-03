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
import { SharedModule } from "@appRoot/app-common.module";
import { Router } from '@angular/router';
import { ResetPasswordComponent } from '@appRoot/login/resetPassword/reset-password.component';
import { MatIconRegistry } from '@angular/material/icon';
import * as langFrJson from '@langs/lang-fr.json';

class FakeLoader implements TranslateLoader {
    getTranslation(): Observable<any> {
        return of({ lang: langFrJson });
    }
}

describe('Reset password component', () => {
    let translateService: TranslateService;
    let component: ResetPasswordComponent;
    let fixture: ComponentFixture<ResetPasswordComponent>;
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
                TranslateService,
                TranslateStore,
                FoldersService,
                PrivilegeService,
                DatePipe,
                AdministrationService,
            ],
            declarations: [ResetPasswordComponent],
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
        const url: string = '../../../../assets/logo_white.svg';
        tick(300);
        iconRegistry.addSvgIcon('maarchLogoWhiteFull', sanitizer.bypassSecurityTrustResourceUrl(url));

        fixture = TestBed.createComponent(ResetPasswordComponent); // Initialize ResetPasswordComponent
        component = fixture.componentInstance;

        fixture.detectChanges();
        tick(300);
        expect(component).toBeTruthy();
    }));

    describe('Focus on inputs and set password', () => {
        it('focus on password', fakeAsync(() => {
            const nativeElement = fixture.nativeElement;
            const newPassword = nativeElement.querySelector('input[name=newPassword]');
            const passwordConfirmation = nativeElement.querySelector('input[name=passwordConfirmation]');
            fixture.detectChanges();
            tick(100);

            component.getPassRules();

            expect(newPassword).toBeTruthy();
            expect(passwordConfirmation).toBeTruthy();
            expect(newPassword.getAttributeNode('autofocus')).toBeTruthy();
            expect(newPassword.getAttributeNode('autofocus').specified).toBeTrue();
        }));

        it('set password', fakeAsync(() => {
            const nativeElement = fixture.nativeElement;
            const newPassword = nativeElement.querySelector('input[name=newPassword]');
            const passwordConfirmation = nativeElement.querySelector('input[name=passwordConfirmation]');

            fixture.detectChanges();

            expect(newPassword).toBeTruthy();
            expect(passwordConfirmation).toBeTruthy();

            // Set the value of the password input fields
            newPassword.value = 'maarch';
            passwordConfirmation.value = 'maarch';

            // Trigger an input event to notify Angular of the value change
            newPassword.dispatchEvent(new Event('input'));
            passwordConfirmation.dispatchEvent(new Event('input'));

            fixture.detectChanges();

            // Verify that the login input field now has the expected value
            expect(newPassword.value).toBe('maarch');
            expect(passwordConfirmation.value).toBe('maarch');

            component.updatePassword();

            // Use whenStable() to wait for all pending asynchronous activities to complete
            fixture.whenStable().then(() => {
                // Check that the navigation was triggered
                const router = TestBed.inject(Router);
                const navigateSpy = spyOn(router, 'navigate');

                // Handle the POST request and provide a mock response
                httpTestingController = TestBed.inject(HttpTestingController);
                const req = httpTestingController.expectOne('../rest/password');

                expect(req.request.method).toBe('PUT');
                expect(req.request.body).toEqual({ token: component.token, password: newPassword.value }); // Add the request body
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
    });

    describe('Check password rules', () => {
        it('display error message if newPassword or passwordConfirmation includes spaces', fakeAsync(() => {
            const submit = fixture.nativeElement.querySelector('button[type=submit]');

            component.password.newPassword = '      ';

            fixture.detectChanges();

            component.containsSpaces(component.password.newPassword);

            expect(component.handlePassword.error).toBe(true);
            expect(submit.disabled).toBeTruthy();
        }));

        it('display error message if the password does not contain capital letters', () => {
            const submit = fixture.nativeElement.querySelector('button[type=submit]');
            component.password.newPassword = 'password';
            component.passwordRules = {
                complexityUpper: { enabled: true, value: 0 }
            };

            fixture.detectChanges();

            component.checkPasswordValidity(component.password.newPassword);

            fixture.detectChanges();

            const matHint: any = fixture.nativeElement.querySelectorAll('.errorMsg')[0];

            expect((matHint.innerHTML as string).trim()).toBe(component.translate.instant('lang.passwordcomplexityUpperRequired'));
            expect(component.handlePassword.error).toBe(true);
            expect(component.handlePassword.errorMsg).toContain(component.translate.instant('lang.passwordcomplexityUpperRequired'));
            expect(submit.disabled).toBeTruthy();
        });

        it('display error message if the password does not contain any digits', () => {
            const submit = fixture.nativeElement.querySelector('button[type=submit]');
            component.password.newPassword = 'password';
            component.passwordRules = {
                complexityNumber: { enabled: true, value: 0 },
            };

            fixture.detectChanges();

            component.checkPasswordValidity(component.password.newPassword);

            fixture.detectChanges();

            const matHint: any = fixture.nativeElement.querySelectorAll('.errorMsg')[0];

            expect((matHint.innerHTML as string).trim()).toBe(component.translate.instant('lang.passwordcomplexityNumberRequired'));
            expect(component.handlePassword.error).toBe(true);
            expect(component.handlePassword.errorMsg).toContain(component.translate.instant('lang.passwordcomplexityNumberRequired'));
            expect(submit.disabled).toBeTruthy();
        });

        it('display error message if the password does not contain special characters', () => {
            const submit = fixture.nativeElement.querySelector('button[type=submit]');
            component.password.newPassword = 'Password123';
            component.passwordRules = {
                complexitySpecial: { enabled: true, value: 0 },
            };

            fixture.detectChanges();

            component.checkPasswordValidity(component.password.newPassword);

            fixture.detectChanges();

            const matHint: any = fixture.nativeElement.querySelectorAll('.errorMsg')[0];

            expect((matHint.innerHTML as string).trim()).toBe(component.translate.instant('lang.passwordcomplexitySpecialRequired'))
            expect(component.handlePassword.error).toBe(true);
            expect(component.handlePassword.errorMsg).toBe(component.translate.instant('lang.passwordcomplexitySpecialRequired'));
            expect(submit.disabled).toBeTruthy();
        });

        it('display error message when password length is less than minimum length', () => {
            const submit = fixture.nativeElement.querySelector('button[type=submit]');
            component.password.newPassword = 'pAsswor';
            component.passwordRules = {
                minLength: { enabled: true, value: 8 }
            };

            fixture.detectChanges();

            component.checkPasswordValidity(component.password.newPassword );

            fixture.detectChanges();

            const matHint: any = fixture.nativeElement.querySelectorAll('.errorMsg')[0];

            expect((matHint.innerHTML as string).trim()).toBe(`${component.passwordRules.minLength.value} ${component.translate.instant('lang.passwordminLength')} !`); 
            expect(component.handlePassword.error).toBe(true);
            expect(component.handlePassword.errorMsg).toBe(`${component.passwordRules.minLength.value} ${component.translate.instant('lang.passwordminLength')} !`);
            expect(submit.disabled).toBeTruthy();
        });

        it('display error message when newPassword and passwordConfirmation are not identical', fakeAsync(() => {
            const submit = fixture.nativeElement.querySelector('button[type=submit]');

            component.password.newPassword = 'newPassword';
            component.password.passwordConfirmation = 'newPasswordConfirm';

            fixture.detectChanges();

            const matHint: any = fixture.nativeElement.querySelectorAll('.passwordNotMatch')[0];

            expect((matHint.innerHTML as string).trim()).toBe(component.translate.instant('lang.passwordNotMatch'));
            expect(submit.disabled).toBeTruthy();
        }));

        it('Red gritter must apear with message when body token is empty', fakeAsync(() => {
            component.token = '';

            component.password.newPassword = 'newPassword123';
            component.updatePassword();

            const req = httpTestingController.expectOne('../rest/password');

            req.flush({ errors: 'Body token is empty' }, { status: 401, statusText: 'Unauthorized' });
            fixture.detectChanges();

            const hasErrorGritter = document.querySelectorAll('.mat-snack-bar-container.error-snackbar').length;
            const notifContent = document.querySelector('.notif-container-content-msg #message-content').innerHTML;

            expect(hasErrorGritter).toEqual(1);
            expect(notifContent).toEqual('Body token is empty');

            flush();
        }));
    });
});
