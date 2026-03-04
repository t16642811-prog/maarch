import { Component, Input, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { MatLegacyAutocompleteTrigger as MatAutocompleteTrigger } from '@angular/material/legacy-autocomplete';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Observable } from 'rxjs';
import { ExportComponent } from '../export/export.component';
import { SummarySheetComponent } from '../summarySheet/summary-sheet.component';
import { PrintedFolderModalComponent } from '@appRoot/printedFolder/printed-folder-modal.component';


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
        public dialog: MatDialog
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
                    multiple: this.selectedRes.length > 1
                }
            });
    }
}
