import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { registerLocaleData } from '@angular/common';

import localeFr from '@angular/common/locales/fr';
import { DateAdapter } from '@angular/material/core';

@Injectable({
    providedIn: 'root'
})
export class LocaleService {
    constructor(
        private dateAdapter: DateAdapter<Date>
    ) { }

    initializeLocale(langISO: string): void {
        registerLocaleData(localeFr, langISO);
        this.dateAdapter.setLocale(langISO);
        moment.locale(langISO);
    }
}
