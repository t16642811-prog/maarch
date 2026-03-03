import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { SharedModule } from '@appRoot/app-common.module';
import { HttpClient } from '@angular/common/http';
import * as langFrJson from '@langs/lang-fr.json';
import { SignatureBookActionsComponent } from '@appRoot/signatureBook/actions/signature-book-actions.component';
import { ActionsService } from '@appRoot/actions/actions.service';
import { FoldersService } from '@appRoot/folder/folders.service';
import { DatePipe } from '@angular/common';
import { FiltersListService } from '@service/filtersList.service';
import { PrivilegeService } from '@service/privileges.service';
import { AdministrationService } from '@appRoot/administration/administration.service';
import { SignatureBookService } from '@appRoot/signatureBook/signature-book.service';
import { Action } from '@models/actions.model';
import { BasketGroupListActionInterface } from '@appRoot/administration/basket/list/list-administration.component';

class FakeLoader implements TranslateLoader {
    getTranslation(): Observable<any> {
        return of({ lang: langFrJson });
    }
}

describe('SignatureBookActionsComponent', () => {
    let component: SignatureBookActionsComponent;
    let fixture: ComponentFixture<SignatureBookActionsComponent>;
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
                SignatureBookService,
                DatePipe,
                TranslateStore,
                HttpClient,
            ],
            declarations: [SignatureBookActionsComponent],
        }).compileComponents();

        // Set lang
        translateService = TestBed.inject(TranslateService);
        translateService.use('fr');
    });

    beforeEach(fakeAsync(() => {
        httpTestingController = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(SignatureBookActionsComponent);
        component = fixture.componentInstance;
        component.resId = 100;
        component.userId = 1;
        component.basketId = 1;
        component.groupId = 1;
        fixture.detectChanges();
    }));

    describe('Create component', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });
    });

    describe('Stamp block', () => {
        it('Stamp is empty', fakeAsync(() => {
            const req = httpTestingController.expectOne(
                '../rest/resourcesList/users/1/groups/1/baskets/1/actions?resId=100'
            );

            const mockActions: Action[] = [
                {
                    id: 100,
                    label: 'test',
                    categories: [],
                    component: 'testComponent',
                },
                {
                    id: 101,
                    label: 'test2',
                    categories: [],
                    component: 'test2Component',
                },
            ];

            component.userStamp = null;
            req.flush({
                actions: mockActions,
            });

            spyOn(component, 'loadActions').and.returnValue(Promise.resolve(mockActions));

            fixture.detectChanges();
            tick(300);

            expect(component.loading).toBe(false);
            expect(fixture.debugElement.nativeElement.querySelector('.no-stamp')).toBeTruthy();
            expect(fixture.debugElement.nativeElement.querySelector('.sign-button')).toBeFalsy();
        }));
    });

    describe('More actions selection', () => {
        it ('the action must appear in the initial button when I choose it from the menu', fakeAsync(() => {
            TestBed.inject(SignatureBookService).basketGroupActions = [
                {
                    id: 100,
                    type: 'valid'
                },
                {
                    id: 101,
                    type: 'valid'
                },
                {
                    id: 102,
                    type: 'valid'
                },
                {
                    id: 103,
                    type: 'valid'
                },
                {
                    id: 104,
                    type: 'reject'
                }
            ] as BasketGroupListActionInterface[];

            const req = httpTestingController.expectOne(
                `../rest/resourcesList/users/${component.userId}/groups/${component.groupId}/baskets/${component.groupId}/actions?resId=100`
            );
            component.userStamp = null;
            const mockActions: Action[] = [
                {
                    id: 100,
                    label: 'test',
                    categories: [],
                    component: 'testComponent',
                },
                {
                    id: 101,
                    label: 'test2',
                    categories: [],
                    component: 'test2Component',
                },
                {
                    id: 102,
                    label: 'test3',
                    categories: [],
                    component: 'test3Component',
                },
                {
                    id: 103,
                    label: 'test4',
                    categories: [],
                    component: 'test4Component',
                },
                {
                    id: 104,
                    label: 'test5',
                    categories: [],
                    component: 'test5Component',
                },
            ];
            req.flush({ actions: mockActions });

            spyOn(component, 'loadActions').and.returnValue(Promise.resolve(mockActions));

            fixture.detectChanges();
            tick(300);

            expect(component.loading).toBe(false);

            fixture.detectChanges();
            tick(300);

            // Should return 2 actions buttons
            const actionButtons = fixture.nativeElement.querySelectorAll('.action-button');
            expect(actionButtons.length).toEqual(2);

            // Should return 1 button for validation and one more for reject
            expect(fixture.nativeElement.querySelectorAll('.action-button-valid').length).toEqual(1);
            expect(fixture.nativeElement.querySelectorAll('.action-button-valid')[0].title).toBe('test')
            expect(fixture.nativeElement.querySelectorAll('.action-button-reject').length).toEqual(1);

            expect(fixture.nativeElement.querySelectorAll('.more-actions-valid').length).toEqual(1);

            fixture.nativeElement.querySelector('.more-actions-valid').click();

            fixture.detectChanges();
            tick(300);

            // Should return 3 more action buttons for validation
            expect(document.querySelectorAll('.more-actions-valid-item').length).toEqual(3);

            const firstItem = document.querySelectorAll('.more-actions-valid-item')[0] as HTMLElement;
            expect(firstItem.title).toBe('test2');

            firstItem.click();


            fixture.detectChanges();
            tick(500);

            // After click, the main button should be 'test3'
            expect(fixture.nativeElement.querySelector('.action-button-valid').title).toBe('test2');
        }));
    });
});
