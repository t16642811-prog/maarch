import { Component, Input, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { MatLegacyAutocompleteTrigger as MatAutocompleteTrigger } from '@angular/material/legacy-autocomplete';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Observable, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { ExportComponent } from '../export/export.component';
import { SummarySheetComponent } from '../summarySheet/summary-sheet.component';
import { PrintedFolderModalComponent } from '@appRoot/printedFolder/printed-folder-modal.component';
import { NotificationService } from '@service/notification/notification.service';
import { FunctionsService } from '@service/functions.service';


export interface StateGroup {
    letter: string;
    names: any[];
}

@Component({
    selector: 'app-tools-list',
    templateUrl: 'tools-list.component.html',
    styleUrls: ['tools-list.component.scss'],
})
export class ToolsListComponent {

    @ViewChild(MatAutocompleteTrigger, { static: true }) autocomplete: MatAutocompleteTrigger;

    @Input() listProperties: any;
    @Input() currentBasketInfo: any;

    @Input() selectedRes: any;
    @Input() totalRes: number;

    @Input() from: string;

    @Input() notAllowedResources: number[] = [];

    toolsListButtons: any[] = [
        {
            id: 'summarySheets',
            label: this.translate.instant('lang.summarySheets'),
            icon: 'fas fa-scroll',
            allowedSources: ['basket', 'search'],
            click: () => this.openSummarySheet(),
        },
        {
            id: 'exportDatas',
            label: this.translate.instant('lang.exportDatas'),
            icon: 'fa fa-file-download',
            allowedSources: ['basket', 'search', 'folder'],
            click: () => this.openExport()
        },
        {
            id: 'exportCsv',
            label: `${this.translate.instant('lang.exportDatas')} CSV`,
            icon: 'fas fa-file-csv',
            allowedSources: ['basket', 'search', 'folder'],
            click: () => this.exportCsv()
        },
        {
            id: 'printedFolder',
            label: this.translate.instant('lang.printedFolder'),
            icon: 'fa fa-print',
            allowedSources: ['basket', 'search'],
            click: () => this.openPrintedFolderPrompt()
        }
    ];

    priorities: any[] = [];
    categories: any[] = [];
    entitiesList: any[] = [];
    statuses: any[] = [];
    metaSearchInput: string = '';

    stateGroups: StateGroup[] = [];
    stateGroupOptions: Observable<StateGroup[]>;

    isLoading: boolean = false;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        public dialog: MatDialog,
        private notify: NotificationService,
        private functionsService: FunctionsService
    ) { }

    openExport(): void {
        const elementsNotAllowed = this.notAllowedResources.some((id: number) => this.selectedRes.includes(id));
        this.dialog.open(ExportComponent, {
            panelClass: 'maarch-modal',
            width: '800px',
            data: {
                selectedRes: this.selectedRes,
                elementsNotAllowed: elementsNotAllowed
            }
        });
    }

    openSummarySheet(): void {
        this.dialog.open(SummarySheetComponent, {
            panelClass: 'maarch-full-height-modal',
            width: '800px',
            data: {
                selectedRes: this.selectedRes
            }
        });
    }

    openPrintedFolderPrompt() {
        this.dialog.open(
            PrintedFolderModalComponent, {
                panelClass: 'maarch-modal',
                width: '800px',
                data: {
                    resId: this.selectedRes,
                    multiple: this.selectedRes.length > 1,
                    currentBasketInfo: this.currentBasketInfo
                }
            });
    }

    exportCsv(): void {
        if (!Array.isArray(this.selectedRes) || this.selectedRes.length === 0) {
            return;
        }

        this.isLoading = true;
        this.http.put('../rest/resourcesList/exports', this.buildCsvExportModel(), { responseType: 'blob' }).pipe(
            tap((data: Blob) => {
                if (data.type === 'text/html') {
                    alert(this.translate.instant('lang.tooMuchDatas'));
                    return;
                }
                const downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(data);
                downloadLink.setAttribute('download', this.functionsService.getFormatedFileName('export_courriers', 'csv'));
                document.body.appendChild(downloadLink);
                downloadLink.click();
                downloadLink.remove();
            }),
            finalize(() => this.isLoading = false),
            catchError((err: any) => {
                this.notify.handleBlobErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    private buildCsvExportModel(): any {
        const partyField = this.isMinisterOutgoingBasket()
            ? {
                value: 'getRecipients',
                label: this.translate.instant('lang.getRecipients'),
                isFunction: true
            }
            : {
                value: 'getSenders',
                label: this.translate.instant('lang.getSenders'),
                isFunction: true
            };

        const dateField = this.isMinisterIncomingBasket()
            ? {
                value: 'admission_date',
                label: this.translate.instant('lang.arrivalDate'),
                isFunction: false
            }
            : {
                value: 'doc_date',
                label: this.translate.instant('lang.docDate'),
                isFunction: false
            };

        return {
            format: 'csv',
            delimiter: ';',
            resources: this.selectedRes,
            data: [
                {
                    value: 'alt_identifier',
                    label: this.translate.instant('lang.chronoNumber'),
                    isFunction: false
                },
                partyField,
                {
                    value: 'subject',
                    label: this.translate.instant('lang.subject'),
                    isFunction: false
                },
                dateField
            ]
        };
    }

    private isMinisterIncomingBasket(): boolean {
        return this.currentBasketInfo?.basketId === 'IncomingMinistre' || this.currentBasketInfo?.basket_id === 'IncomingMinistre';
    }

    private isMinisterOutgoingBasket(): boolean {
        return this.currentBasketInfo?.basketId === 'OutgoingExternalMinistre' || this.currentBasketInfo?.basket_id === 'OutgoingExternalMinistre';
    }
}
