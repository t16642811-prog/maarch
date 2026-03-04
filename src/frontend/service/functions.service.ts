import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LatinisePipe } from 'ngx-pipes';
import { HeaderService } from './header.service';
import { DatePipe } from '@angular/common';
import { environment } from '../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class FunctionsService {
    constructor(
        public translate: TranslateService,
        private headerService: HeaderService,
        private latinisePipe: LatinisePipe,
        private datePipe: DatePipe
    ) {}

    empty(value: any): boolean {
        if (value === null || value === undefined) {
            return true;
        } else if (Array.isArray(value)) {
            if (value.length > 0) {
                return false;
            } else {
                return true;
            }
        } else if (String(value) !== '') {
            return false;
        } else {
            return true;
        }
    }

    isDate(value: any): boolean {
        return value instanceof Date && !isNaN(value.valueOf());
    }

    isNumber(evt: any): boolean {
        evt = evt ? evt : window.event;
        const charCode = evt.which ? evt.which : evt.keyCode;
        if (charCode > 31 && (charCode < 48 || charCode > 57)) {
            return false;
        }
        return true;
    }

    formatFrenchDateToTechnicalDate(date: string) {
        if (!this.empty(date)) {
            let arrDate = date.split('-');
            arrDate = arrDate.concat(arrDate[arrDate.length - 1].split(' '));
            arrDate.splice(2, 1);

            if (this.empty(arrDate[3])) {
                arrDate[3] = '00:00:00';
            }

            const formatDate = `${arrDate[2]}-${arrDate[1]}-${arrDate[0]} ${arrDate[3]}`;

            return formatDate;
        } else {
            return date;
        }
    }

    formatFrenchDateToObjectDate(date: string, delimiter: string = '-') {
        if (!this.empty(date)) {
            let arrDate = date.split(delimiter);
            arrDate = arrDate.concat(arrDate[arrDate.length - 1].split(' '));
            arrDate.splice(2, 1);

            if (this.empty(arrDate[3])) {
                arrDate[3] = '00:00:00';
            }

            const formatDate = `${arrDate[2]}-${arrDate[1]}-${arrDate[0]} ${arrDate[3]}`;

            return new Date(formatDate);
        } else {
            return date;
        }
    }

    formatDateObjectToDateString(date: Date, limitMode: boolean = false, format: string = 'dd-mm-yyyy') {
        if (date !== null) {
            const formatDate: any[] = [];
            const regex = /[^a-zA-Z0-9]/g;
            const delimiter: string = format.trim().match(regex)[0];
            format.split(delimiter).forEach((element: any) => {
                if (element === 'dd') {
                    let day: any = date.getDate();
                    day = ('00' + day).slice(-2);
                    formatDate.push(day);
                } else if (element === 'mm') {
                    let month: any = date.getMonth() + 1;
                    month = ('00' + month).slice(-2);
                    formatDate.push(month);
                } else if (element === 'yyyy') {
                    const year: any = date.getFullYear();
                    formatDate.push(year);
                }
            });

            let limit = '';
            if (limitMode) {
                limit = ' 23:59:59';
            }
            return `${formatDate.join(delimiter)}${limit}`;
        } else {
            return date;
        }
    }

    formatSerializedDateToDateString(date: string) {
        return this.formatDateObjectToDateString(new Date(date));
    }

    getFormatedFileName(filename: string = 'maarch', ext: string = '', format: string = 'dd-MM-yyyy') {
        const today = new Date();
        const formatedDate = this.datePipe.transform(today, format);
        const suffix = !this.empty(ext) ? `.${ext}` : '';
        return `${filename}_${formatedDate}${suffix}`;
    }

    listSortingDataAccessor(data: any, sortHeaderId: any) {
        if (typeof data[sortHeaderId] === 'string') {
            return data[sortHeaderId].toLowerCase();
        }
        return data[sortHeaderId];
    }

    filterUnSensitive(template: any, filter: string, filteredColumns: any) {
        let filterReturn = false;
        filter = this.latinisePipe.transform(filter);
        filteredColumns.forEach((column: any) => {
            let val = template[column];
            if (typeof template[column] !== 'string') {
                val = val === undefined || null ? '' : JSON.stringify(val);
            }
            filterReturn = filterReturn || this.latinisePipe.transform(val.toLowerCase()).includes(filter);
        });
        return filterReturn;
    }

    formatBytes(bytes: number, decimals = 2) {
        if (typeof bytes === 'number') {
            if (bytes === 0) {
                return '0 Octet';
            }

            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Octets', 'KO', 'MO', 'GO', 'TO', 'PO', 'EO', 'ZO', 'YO'];

            const i = Math.floor(Math.log(bytes) / Math.log(k));

            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        } else {
            return bytes;
        }
    }

    getDocBaseUrl() {
        return `https://docs.maarch.org/gitbook/html/MaarchCourrier/${environment.BASE_VERSION}`;
    }

    /**
     * Sanitizes HTML content to remove all script elements, event attributes, and external script URLs.
     * @param {string} html - The HTML content to be sanitized.
     * @returns {string} - The sanitized HTML content without any scripts or related elements.
     */
    sanitizeHtml(html: string): string {
        // Parse the input HTML string into a DOM object
        const domParser = new DOMParser().parseFromString(html, 'text/html');

        // Remove all <script> tags from the DOM
        const scripts = domParser.querySelectorAll('script');
        scripts.forEach((script: any) => {
            script.remove();
        });

        // Remove event attributes (such as onclick, onerror, etc.) from all elements
        const elementsWithEventAttributes = domParser.querySelectorAll('*');
        elementsWithEventAttributes.forEach((element) => {
            element.removeAttribute('onabort');
            element.removeAttribute('onblur');
            element.removeAttribute('onchange');
            element.removeAttribute('onclick');
            element.removeAttribute('ondblclick');
            element.removeAttribute('onerror');
            element.removeAttribute('onfocus');
            element.removeAttribute('onkeydown');
            element.removeAttribute('onkeypress');
            element.removeAttribute('onkeyup');
            element.removeAttribute('onload');
            element.removeAttribute('onmousedown');
            element.removeAttribute('onmousemove');
            element.removeAttribute('onmouseout');
            element.removeAttribute('onmouseover');
            element.removeAttribute('onmouseup');
            element.removeAttribute('onreset');
            element.removeAttribute('onresize');
            element.removeAttribute('onscroll');
            element.removeAttribute('onselect');
            element.removeAttribute('onsubmit');
            element.removeAttribute('onunload');
        });

        // Return the sanitized HTML content
        return domParser.body.innerHTML;
    }

    blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = (reader.result as string);
                resolve(base64String);
            };
            reader.onerror = () => {
                reject('Unable to read the blob as a Base64 string.');
            };
            reader.readAsDataURL(blob);
        });
    }
}
