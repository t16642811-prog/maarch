import { TestBed, ComponentFixture, fakeAsync, tick, flushMicrotasks, flush } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { ActionsAdministrationComponent } from '@appRoot/administration/action/actions-administration.component';
import { ActivatedRoute } from '@angular/router';
import { ConfirmComponent } from '@plugins/modal/confirm.component';
import { BrowserModule } from '@angular/platform-browser';
import { HeaderService } from '@service/header.service';
import { AppService } from '@service/app.service';
import { ActionPagesService } from '@service/actionPages.service';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from '@appRoot/app-common.module';
import { FoldersService } from '@appRoot/folder/folders.service';
import { PrivilegeService } from '@service/privileges.service';
import { DatePipe } from '@angular/common';
import { AdministrationService } from '@appRoot/administration/administration.service';
import * as langFrJson from '@langs/lang-fr.json'

class FakeLoader implements TranslateLoader {
    getTranslation(): Observable<any> {
        return of({ lang: langFrJson });
    }
}


describe('ActionsAdministrationComponent', () => {
    let httpTestingController: HttpTestingController;
    let component: ActionsAdministrationComponent;
    let fixture: ComponentFixture<ActionsAdministrationComponent>;
    let translateService: TranslateService;
    const params = new BehaviorSubject({ id: 21 });

    beforeEach(() => {
        TestBed.configureTestingModule({
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
                { provide: ActivatedRoute, useValue: { params: params.asObservable() } },
                HeaderService,
                AppService,
                ActionPagesService,
                FoldersService,
                PrivilegeService,
                DatePipe,
                AdministrationService,
                ConfirmComponent
            ],
            declarations: [ActionsAdministrationComponent]
        }).compileComponents();

        // Set lang
        translateService = TestBed.inject(TranslateService);
        translateService.use('fr');
    });

    beforeEach(() => {
        httpTestingController = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(ActionsAdministrationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create component', async () => {
        expect(component).toBeTruthy();
    });

    it('Set header, actions values and check rows', fakeAsync(() => {
        const actionsReq = httpTestingController.expectOne('../rest/actions');
        expect(actionsReq.request.method).toBe('GET');
        actionsReq.flush(setActions());

        fixture.detectChanges();
        tick(300);
        flush();
        expect(fixture.nativeElement.querySelector('.card-app-content')).toBeDefined();
    }));

    it('delete action and show succes notification', fakeAsync(() => {
        const actionsReq = httpTestingController.expectOne('../rest/actions');
        expect(actionsReq.request.method).toBe('GET');
        actionsReq.flush(setActions());

        fixture.detectChanges();
        tick(300);
        flush();

        fixture.detectChanges();
        tick(300);
        // should load 4 actions
        const row = fixture.nativeElement.querySelectorAll('.mat-row');
        expect(row.length).toEqual(4);

        // get the 1st action
        const secondActionId = row[0].querySelector('.cdk-column-id');
        const secondActionLabel = row[0].querySelector('.cdk-column-label_action');
        const secondActionDelBtn = row[0].querySelector('.cdk-column-actions').querySelector('button');

        fixture.detectChanges();

        // expect values and button status
        expect(secondActionId.innerHTML.trim()).toEqual('21');
        expect(secondActionLabel.innerHTML.trim()).toEqual('Envoyer le courrier en validation');
        expect(secondActionDelBtn.disabled).toBeFalse();

        flushMicrotasks(); // Ensure microtasks are executed

        secondActionDelBtn.click();

        fixture.detectChanges();
        tick(300);

        const submitBtn: any = document.querySelector('.mat-dialog-content-container').querySelector('button[name=ok]');
        submitBtn.click()

        fixture.detectChanges();
        tick(300);

        httpTestingController = TestBed.inject(HttpTestingController);
        const req = httpTestingController.expectOne(`../rest/actions/${component.actions[0].id}`);
        expect(req.request.method).toBe('DELETE');
        req.flush({});

        // expect success notification message
        const hasSuccessGritter = document.querySelectorAll('.mat-snack-bar-container.success-snackbar').length;
        expect(hasSuccessGritter).toEqual(1);
        const notifContent = document.querySelector('.notif-container-content-msg #message-content').innerHTML;
        expect(notifContent).toEqual(component.translate.instant('lang.actionDeleted'));
        flush();
    }));
});

function setActions() {
    return {
        actions: [
            {
                "id": 21,
                "keyword": "",
                "label_action": "Envoyer le courrier en validation",
                "id_status": "VAL",
                "is_system": "N",
                "action_page": null,
                "component": "confirmAction",
                "history": "Y",
                "parameters": []
            },
            {
                "id": 22,
                "keyword": "",
                "label_action": "Attribuer au service",
                "id_status": "NEW",
                "is_system": "N",
                "action_page": "confirm_status",
                "component": "confirmAction",
                "history": "Y",
                "parameters": []
            },
            {
                "id": 24,
                "keyword": "indexing",
                "label_action": "Remettre en validation",
                "id_status": "VAL",
                "is_system": "N",
                "action_page": "confirm_status",
                "component": "confirmAction",
                "history": "Y",
                "parameters": []
            },
            {
                "id": 36,
                "keyword": "",
                "label_action": "Envoyer pour avis",
                "id_status": "EAVIS",
                "is_system": "N",
                "action_page": "send_docs_to_recommendation",
                "component": "sendToParallelOpinion",
                "history": "Y",
            }
        ]
    };
}