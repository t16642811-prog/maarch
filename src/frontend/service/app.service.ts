import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from './notification/notification.service';
import { AuthService } from './auth.service';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { TranslateService } from '@ngx-translate/core';
import { CoreDialogComponent } from '@appRoot/core-dialog/core-dialog.component';
import { Observable, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AppService {

    sessionLoaded: boolean = false;
    coreLoaded: boolean = false;
    $coreLoaded = new Subject<boolean>;
    screenWidth: number = 1920;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        private notify: NotificationService,
        public authService: AuthService,
        private dialog: MatDialog,
    ) { }

    catchEvent(): Observable<any> {
        return this.$coreLoaded.asObservable();
    }

    setEvent(content: any) {
        return this.$coreLoaded.next(content);
    }

    loadAppCore(): void {
        this.openDialog();
    }

    openDialog(): void {
        const dialogRef = this.dialog.open(CoreDialogComponent, { disableClose: true });

        dialogRef.afterClosed().subscribe(() => {
            this.coreLoaded = true;
            this.setEvent(true);
        });
    }

    getViewMode() {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            return true;
        } else {
            return this.screenWidth <= 768;
        }
    }

    setScreenWidth(width: number) {
        this.screenWidth = width;
    }
}
