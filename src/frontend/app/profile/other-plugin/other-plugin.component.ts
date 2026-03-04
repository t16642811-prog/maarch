import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HeaderService } from '@service/header.service';
import { AddinOutlookConfigurationModalComponent } from './configuration/addin-outlook-configuration-modal.component';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { AuthService } from '@service/auth.service';

@Component({
    selector: 'app-other-plugin',
    templateUrl: './other-plugin.component.html',
    styleUrls: ['./other-plugin.component.scss'],
})

export class ProfileOtherPluginComponent {


    constructor(
        public translate: TranslateService,
        public headerService: HeaderService,
        public dialog: MatDialog,
        private authService: AuthService
    ) {}

    openAddinOutlookConfiguration() {
        this.dialog.open(AddinOutlookConfigurationModalComponent, {
            panelClass: 'maarch-modal',
            width: '99%',
        });
    }

    isAppSecure() {
        return this.authService.maarchUrl.split(':')[0] === 'https';
    }
}
