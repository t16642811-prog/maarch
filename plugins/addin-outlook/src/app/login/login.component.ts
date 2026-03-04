import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../service/notification/notification.service';
import { AuthService } from '../service/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { FunctionsService } from '../service/functions.service';
import { FormControl, FormGroup, UntypedFormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';


@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

    loginForm: UntypedFormGroup;

    loading: boolean = true;

    urlProfile: string = '';
    tutoStep1Msg: SafeHtml = '';

    @Output() success = new EventEmitter<boolean>();

    constructor(
        public http: HttpClient,
        private notificationService: NotificationService,
        public authService: AuthService,
        public translate: TranslateService,
        public functions: FunctionsService,
        private sanitizer: DomSanitizer,
    ) { }

    ngOnInit() {
        this.urlProfile = `${this.authService.appUrl}/dist/index.html#/profile`;
        this.loginForm = new FormGroup({
            login: new FormControl('', Validators.required),
            password: new FormControl('', Validators.required),
        });
        this.loading = false;
    }

    setToken(event: ClipboardEvent) {
        this.loading = true;
        const clipboardData = event.clipboardData;
        const pastedText = clipboardData.getData('text');
        try {
            const tokens = JSON.parse(pastedText);
            if (tokens?.token && tokens?.refreshToken) {
                this.authService.saveTokens(tokens.token, tokens.refreshToken);
                this.authService.updateUserInfo(tokens.token);
                this.success.emit(true);
            } else {
                this.notificationService.error(this.translate.instant('lang.badTokens'));
                this.loading = false;
            }
        } catch (error) {
            this.notificationService.error(this.translate.instant('lang.badTokens'));
            this.loading = false;
        }
    }
}
