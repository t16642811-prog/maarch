import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CoreDialogComponent } from '@appRoot/core-dialog/core-dialog.component';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AppService } from '@service/app.service';
import { AuthService } from '@service/auth.service';
import { HeaderService } from '@service/header.service';
import { TranslateService, TranslateStore } from '@ngx-translate/core';
import { InternationalizationModule } from '@service/translate/internationalization.module';
import { FoldersService } from '@appRoot/folder/folders.service';
import { AppMaterialModule } from '@appRoot/app-material.module';
import { NotificationService } from '@service/notification/notification.service';
import { PrivilegeService } from '@service/privileges.service';
import { LatinisePipe } from 'ngx-pipes';
import { DatePipe } from '@angular/common';
import { AdministrationService } from '@appRoot/administration/administration.service';
import { SharedModule } from '@appRoot/app-common.module';
import { FiltersListService } from '@service/filtersList.service';

describe('CoreDialogComponent', () => {
    let component: CoreDialogComponent;
    let fixture: ComponentFixture<CoreDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                SharedModule,
                InternationalizationModule,
                AppMaterialModule,
                RouterTestingModule,
                BrowserAnimationsModule,
                HttpClientTestingModule
            ],
            providers: [
                AuthService,
                HeaderService,
                TranslateService,
                TranslateStore,
                AppService,
                FoldersService,
                NotificationService,
                PrivilegeService,
                LatinisePipe,
                DatePipe,
                AdministrationService,
                FiltersListService,
                { provide: MatDialogRef, useValue: {} }
            ],
            declarations: [CoreDialogComponent]
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CoreDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
