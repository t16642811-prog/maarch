import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { UntypedFormControl } from '@angular/forms';
import { startWith, map, tap, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { FunctionsService } from '@service/functions.service';
import { DndDropEvent } from 'ngx-drag-drop';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { SignatureBookService } from '@appRoot/signatureBook/signature-book.service';

declare let $: any;

@Component({
    selector: 'app-list-administration',
    templateUrl: 'list-administration.component.html',
    styleUrls: ['list-administration.component.scss'],
})
export class ListAdministrationComponent implements OnInit {
    @Input() currentBasketGroup: any;
    @Output() refreshBasketGroup = new EventEmitter<any>();

    loading: boolean = false;

    displayedMainData: any = [
        {
            'value': 'chronoNumberShort',
            'label': this.translate.instant('lang.chronoNumberShort'),
            'sample': 'MAARCH/2019A/1',
            'cssClasses': ['align_centerData', 'normalData'],
            'icon': ''
        },
        {
            'value': 'object',
            'label': this.translate.instant('lang.object'),
            'sample': this.translate.instant('lang.objectSample'),
            'cssClasses': ['longData'],
            'icon': ''
        }
    ];

    availableData: any = [
        {
            'value': 'getPriority',
            'label': this.translate.instant('lang.getPriority'),
            'sample': this.translate.instant('lang.getPrioritySample'),
            'cssClasses': ['align_leftData'],
            'icon': 'fa-traffic-light'
        },
        {
            'value': 'getCategory',
            'label': this.translate.instant('lang.getCategory'),
            'sample': this.translate.instant('lang.incoming'),
            'cssClasses': ['align_leftData'],
            'icon': 'fa-exchange-alt'
        },
        {
            'value': 'getDoctype',
            'label': this.translate.instant('lang.getDoctype'),
            'sample': this.translate.instant('lang.getDoctypeSample'),
            'cssClasses': ['align_leftData'],
            'icon': 'fa-suitcase'
        },
        {
            'value': 'getAssignee',
            'label': this.translate.instant('lang.getAssignee'),
            'sample': this.translate.instant('lang.getAssigneeSample'),
            'cssClasses': ['align_leftData'],
            'icon': 'fa-sitemap'
        },
        {
            'value': 'getRecipients',
            'label': this.translate.instant('lang.getRecipients'),
            'sample': 'Patricia PETIT',
            'cssClasses': ['align_leftData'],
            'icon': 'fa-user'
        },
        {
            'value': 'getSenders',
            'label': this.translate.instant('lang.getSenders'),
            'sample': 'Alain DUBOIS (MAARCH)',
            'cssClasses': ['align_leftData'],
            'icon': 'fa-book'
        },
        {
            'value': 'getCreationAndProcessLimitDates',
            'label': this.translate.instant('lang.getCreationAndProcessLimitDates'),
            'sample': this.translate.instant('lang.getCreationAndProcessLimitDatesSample'),
            'cssClasses': ['align_leftData'],
            'icon': 'fa-calendar'
        },
        {
            'value': 'getCreationDate',
            'label': this.translate.instant('lang.getCreationDate'),
            'sample': this.translate.instant('lang.getCreationDateSample'),
            'cssClasses': ['align_leftData'],
            'icon': 'fa-calendar'
        },
        {
            'value': 'getProcessLimitDate',
            'label': this.translate.instant('lang.getProcessLimitDate'),
            'sample': this.translate.instant('lang.getProcessLimitDateSample'),
            'cssClasses': ['align_leftData'],
            'icon': 'fa-stopwatch'
        },
        {
            'value': 'getVisaWorkflow',
            'label': this.translate.instant('lang.getVisaWorkflow'),
            'sample': '<i color="accent" class="fa fa-check"></i> Barbara BAIN -> <i class="fa fa-hourglass-half"></i> <b>Bruno BOULE</b> -> <i class="fa fa-hourglass-half"></i> Patricia PETIT',
            'cssClasses': ['align_leftData'],
            'icon': 'fa-list-ol'
        },
        {
            'value': 'getSignatories',
            'label': this.translate.instant('lang.getSignatories'),
            'sample': 'Denis DAULL, Patricia PETIT',
            'cssClasses': ['align_leftData'],
            'icon': 'fa-certificate'
        },
        {
            'value': 'getModificationDate',
            'label': this.translate.instant('lang.getModificationDate'),
            'sample': '01-01-2019',
            'cssClasses': ['align_leftData'],
            'icon': 'fa-calendar-check'
        },
        {
            'value': 'getOpinionLimitDate',
            'label': this.translate.instant('lang.getOpinionLimitDate'),
            'sample': '01-01-2019',
            'cssClasses': ['align_leftData'],
            'icon': 'fa-stopwatch'
        },
        {
            'value': 'getParallelOpinionsNumber',
            'label': this.translate.instant('lang.getParallelOpinionsNumber'),
            'sample': this.translate.instant('lang.getParallelOpinionsNumberSample'),
            'cssClasses': ['align_leftData'],
            'icon': 'fa-comment-alt'
        },
        {
            'value': 'getFolders',
            'label': this.translate.instant('lang.getFolders'),
            'sample': this.translate.instant('lang.getFoldersSample'),
            'cssClasses': ['align_leftData'],
            'icon': 'fa-folder'
        },
        {
            'value': 'getResId',
            'label': this.translate.instant('lang.getResId'),
            'sample': this.translate.instant('lang.getResIdSample'),
            'cssClasses': ['align_leftData'],
            'icon': 'fa-envelope'
        }, {
            'value': 'getBarcode',
            'label': this.translate.instant('lang.getBarcode'),
            'sample': this.translate.instant('lang.getBarcodeSample'),
            'cssClasses': ['align_leftData'],
            'icon': 'fa-barcode'
        }, {
            'value': 'getRegisteredMailRecipient',
            'label': this.translate.instant('lang.registeredMailRecipient'),
            'sample': this.translate.instant('lang.registeredMailRecipientSample'),
            'cssClasses': ['align_leftData'],
            'icon': 'fa-user'
        }, {
            'value': 'getRegisteredMailReference',
            'label': this.translate.instant('lang.registeredMailReference'),
            'sample': this.translate.instant('lang.registeredMailReferenceSample'),
            'cssClasses': ['align_leftData'],
            'icon': 'fa-hashtag'
        }, {
            'value': 'getRegisteredMailIssuingSite',
            'label': this.translate.instant('lang.issuingSite'),
            'sample': this.translate.instant('lang.issuingSiteSample'),
            'cssClasses': ['align_leftData'],
            'icon': 'fas fa-warehouse'
        }
    ];
    availableDataClone: any = [];

    displayedSecondaryData: any = [];
    displayedSecondaryDataClone: any = [];

    displayMode: string = 'label';
    dataControl = new UntypedFormControl();
    filteredDataOptions: Observable<string[]>;
    listEvent: any[] = [
        {
            id: 'detailDoc',
            value: 'documentDetails'
        },
        {
            id: 'eventVisaMail',
            value: 'signatureBookAction'
        },
        {
            id: 'eventProcessDoc',
            value: 'processDocument'
        },
        {
            id: 'eventViewDoc',
            value: 'viewDoc'
        }
    ];

    templateDisplayedSecondaryData: number[] = [2, 3, 4, 5, 6, 7];
    selectedTemplateDisplayedSecondaryData: number = 7;
    selectedTemplateDisplayedSecondaryDataClone: number = 7;

    selectedListEvent: string = null;
    selectedListEventClone: string = null;

    processTool: any[] = [
        {
            id: 'dashboard',
            icon: 'fas fa-columns',
            label: this.translate.instant('lang.newsFeed'),
        },
        {
            id: 'history',
            icon: 'fas fa-history',
            label: this.translate.instant('lang.history'),
        },
        {
            id: 'notes',
            icon: 'fas fa-pen-square',
            label: this.translate.instant('lang.notesAlt'),
        },
        {
            id: 'attachments',
            icon: 'fas fa-paperclip',
            label: this.translate.instant('lang.attachments'),
        },
        {
            id: 'linkedResources',
            icon: 'fas fa-link',
            label: this.translate.instant('lang.links'),
        },
        {
            id: 'diffusionList',
            icon: 'fas fa-share-alt',
            label: this.translate.instant('lang.diffusionList'),
        },
        {
            id: 'emails',
            icon: 'fas fa-envelope',
            label: this.translate.instant('lang.mailsSentAlt'),
        },
        {
            id: 'visaCircuit',
            icon: 'fas fa-list-ol',
            label: this.translate.instant('lang.visaWorkflow'),
        },
        {
            id: 'opinionCircuit',
            icon: 'fas fa-comment-alt',
            label: this.translate.instant('lang.avis'),
        },
        {
            id: 'info',
            icon: 'fas fa-info-circle',
            label: this.translate.instant('lang.informations'),
        }
    ];
    selectedProcessTool: any = {
        defaultTab: null,
        canUpdateData: false,
        canUpdateModel: false,
        canUpdateDocuments: false,
        goToNextDocument: false,
        canGoToNextRes: false,
    };
    selectedProcessToolClone: string = null;

    actionsChosen: any[]= [];

    availableValidationsActions: any[] = [];
    availableValidationsActionsClone: any[] = [];

    availableRefusalActions: any[] = [];
    availableRefusalActionsClone: any[] = [];

    refusalActionsId: string [] = ['interrupt_visa', 'rejection_visa_redactor', 'rejection_visa_previous', 'redirect_visa_entity'];


    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        public signatureBookService: SignatureBookService,
        private notify: NotificationService,
        private functions: FunctionsService
    ) { }

    async ngOnInit(): Promise<void> {
        await this.initCustomFields();
        this.filteredDataOptions = this.dataControl.valueChanges
            .pipe(
                startWith(''),
                map(value => this._filterData(value))
            );

        this.availableDataClone = JSON.parse(JSON.stringify(this.availableData));
        this.displayedSecondaryData = [];
        this.selectedTemplateDisplayedSecondaryData = this.currentBasketGroup.list_display.templateColumns;
        this.selectedTemplateDisplayedSecondaryDataClone = this.selectedTemplateDisplayedSecondaryData;

        this.currentBasketGroup.list_display.subInfos.forEach((element: any, index: number) => {
            if (element !== undefined) {
                this.addData(element.value);
                this.displayedSecondaryData[this.displayedSecondaryData.length - 1].cssClasses = element.cssClasses;
                this.displayedSecondaryData[index]['position'] = index;
            }
        });

        this.selectedListEvent = this.currentBasketGroup.list_event;
        this.selectedListEventClone = this.selectedListEvent;

        if (this.currentBasketGroup.list_event === 'processDocument') {
            this.selectedProcessTool.defaultTab = this.currentBasketGroup.list_event_data === null ? 'dashboard' : this.currentBasketGroup.list_event_data.defaultTab;
            this.selectedProcessTool.canUpdateData = this.currentBasketGroup.list_event_data === null ? false : this.currentBasketGroup.list_event_data.canUpdateData;
            this.selectedProcessTool.canUpdateModel = this.currentBasketGroup.list_event_data === null ? false : this.currentBasketGroup.list_event_data.canUpdateModel;
            this.selectedProcessTool.canGoToNextRes = this.currentBasketGroup.list_event_data === null ? false : this.currentBasketGroup.list_event_data.canGoToNextRes;
        } else if (this.currentBasketGroup.list_event === 'signatureBookAction') {
            this.selectedProcessTool.canUpdateDocuments = this.currentBasketGroup.list_event_data === null ? false : this.currentBasketGroup.list_event_data.canUpdateDocuments;
            this.selectedProcessTool.goToNextDocument = this.currentBasketGroup.list_event_data === null ? false : this.currentBasketGroup.list_event_data.goToNextDocument;
        }

        this.selectedProcessToolClone = JSON.parse(JSON.stringify(this.selectedProcessTool));
        this.displayedSecondaryDataClone = JSON.parse(JSON.stringify(this.displayedSecondaryData));

        if (this.signatureBookService.config.isNewInternalParaph && this.selectedListEvent === 'signatureBookAction') {
            await this.setActionsChosen();
        }
    }

    initCustomFields() {
        return new Promise((resolve) => {
            this.http.get('../rest/customFields').pipe(
                map((data: any) => {
                    data.customFields = data.customFields.map((info: any) => ({
                        'value': 'indexingCustomField_' + info.id,
                        'label': info.label,
                        'sample': this.translate.instant('lang.customField') + info.id,
                        'cssClasses': ['align_leftData'],
                        'icon': 'fa-hashtag'
                    }));
                    return data.customFields;
                }),
                tap((customs) => {
                    this.availableData = this.availableData.concat(customs);
                    resolve(true);
                }),
                catchError((err: any) => {
                    this.notify.handleErrors(err);
                    return of(false);
                })
            ).subscribe();
        });
    }

    toggleData() {
        if (this.dataControl.disabled) {
            this.dataControl.enable();
        } else {
            this.dataControl.disable();
        }

        if (this.displayMode === 'label') {
            this.displayMode = 'sample';
        } else {
            this.displayMode = 'label';
        }

    }

    setStyle(item: any, value: string) {
        const typeFont = value.split('_');

        if (typeFont.length === 2) {
            item.cssClasses.forEach((element: any, it: number) => {
                if (element.includes(typeFont[0]) && element !== value) {
                    item.cssClasses.splice(it, 1);
                }
            });
        }

        const index = item.cssClasses.indexOf(value);

        if (index === -1) {
            item.cssClasses.push(value);
        } else {
            item.cssClasses.splice(index, 1);
        }
    }

    addData(id: any) {
        const i = this.availableData.map((e: any) => e.value).indexOf(id);

        this.displayedSecondaryData.push(this.availableData.filter((item: any) => item.value === id)[0]);
        this.availableData.splice(i, 1);

        $('#availableData').blur();
        this.dataControl.setValue('');
    }

    removeData(data: any, i: number) {
        this.availableData.push(data);
        this.displayedSecondaryData.splice(i, 1);
        this.dataControl.setValue('');
    }

    removeAllData() {
        this.displayedSecondaryData = this.displayedSecondaryData.concat();
        this.availableData = this.availableData.concat(this.displayedSecondaryData);
        this.dataControl.setValue('');
        this.displayedSecondaryData = [];
    }

    onDrop(dndDrop: DndDropEvent) {
        let index = dndDrop.index;

        if (typeof index === 'undefined') {
            index = this.displayedSecondaryData.length;
        }

        this.displayedSecondaryData.splice(index, 0, dndDrop.data);
    }

    onDragged(item: any, data: any[]) {
        const index = data.indexOf(item);
        data.splice(index, 1);
    }

    saveTemplate(withNotif: boolean = true): void {
        const objToSend = {
            templateColumns: this.selectedTemplateDisplayedSecondaryData,
            subInfos: this.displayedSecondaryData
        };
        if ((this.selectedListEvent === 'signatureBookAction' || this.currentBasketGroup.list_event === 'signatureBookAction') && this.signatureBookService.config.isNewInternalParaph) {
            if (this.functions.empty(this.selectedListEvent)) {
                this.selectedListEvent = this.currentBasketGroup.list_event;
            }

            const allSelectedActions: BasketGroupListActionInterface[] = this.availableValidationsActions.concat(this.availableRefusalActions);
            this.selectedProcessTool = {
                ... this.selectedProcessTool,
                actions: allSelectedActions.map((action: BasketGroupListActionInterface) => ({
                    id: action.id,
                    type: action.type
                }))
            }
        } else {
            delete this.selectedProcessTool.actions;
        }

        this.http.put('../rest/baskets/' + this.currentBasketGroup.basket_id + '/groups/' + this.currentBasketGroup.group_id, { 'list_display': objToSend, 'list_event': this.selectedListEvent, 'list_event_data': this.selectedProcessTool }).pipe(
            tap(() => {
                this.currentBasketGroup.list_display = objToSend;
                this.currentBasketGroup.list_event = this.selectedListEvent;
                this.currentBasketGroup.list_event_data = this.selectedProcessTool;
                this.displayedSecondaryDataClone = JSON.parse(JSON.stringify(this.displayedSecondaryData));
                this.selectedListEventClone = this.selectedListEvent;
                this.selectedProcessToolClone = JSON.parse(JSON.stringify(this.selectedProcessTool));
                this.selectedTemplateDisplayedSecondaryDataClone = JSON.parse(JSON.stringify(this.selectedTemplateDisplayedSecondaryData));
                this.availableValidationsActionsClone = JSON.parse(JSON.stringify(this.availableValidationsActions));
                this.availableRefusalActionsClone = JSON.parse(JSON.stringify(this.availableRefusalActions));
                if (withNotif) {
                    this.notify.success(this.translate.instant('lang.modificationsProcessed'));
                }
                this.refreshBasketGroup.emit(this.currentBasketGroup);
            }),
            catchError((err: any) => {
                this.notify.handleErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    checkModif() {
        if (
            JSON.stringify(this.displayedSecondaryData) === JSON.stringify(this.displayedSecondaryDataClone) &&
            this.selectedListEvent === this.selectedListEventClone &&
            JSON.stringify(this.selectedProcessTool) === JSON.stringify(this.selectedProcessToolClone) &&
            JSON.stringify(this.selectedTemplateDisplayedSecondaryData) === JSON.stringify(this.selectedTemplateDisplayedSecondaryDataClone) &&
            JSON.stringify(this.availableValidationsActions) === JSON.stringify(this.availableValidationsActionsClone) &&
            JSON.stringify(this.availableRefusalActions) === JSON.stringify(this.availableRefusalActionsClone)
        ) {
            return true;
        } else {
            return false;
        }
    }

    cancelModification() {
        this.displayedSecondaryData = JSON.parse(JSON.stringify(this.displayedSecondaryDataClone));
        this.selectedListEvent = this.selectedListEventClone;
        this.selectedProcessTool = JSON.parse(JSON.stringify(this.selectedProcessToolClone));
        this.availableData = JSON.parse(JSON.stringify(this.availableDataClone));
        this.selectedTemplateDisplayedSecondaryData = JSON.parse(JSON.stringify(this.selectedTemplateDisplayedSecondaryDataClone));
        this.dataControl.setValue('');
        this.availableRefusalActions = JSON.parse(JSON.stringify(this.availableRefusalActionsClone));
        this.availableValidationsActions = JSON.parse(JSON.stringify(this.availableValidationsActionsClone))
    }

    hasFolder() {
        if (this.displayedSecondaryData.map((data: any) => data.value).indexOf('getFolders') > -1) {
            return true;
        } else {
            return false;
        }
    }

    async changeEventList(ev: any) {
        if (ev.value === 'processDocument') {
            this.selectedProcessTool = {
                defaultTab: 'dashboard'
            };
        } else {
            this.selectedProcessTool = {};
            if (ev.value === 'signatureBookAction' && this.signatureBookService.config.isNewInternalParaph) {
                await this.setActionsChosen();
            }
        }
    }

    toggleCanUpdate(state: boolean) {
        if (!state) {
            this.selectedProcessTool.canUpdateModel = state;
        }
    }

    moveAllActions(source: string, target: string, type: string, ): void {
        this[source].forEach((action: any) => {
            action['type'] = type;
            this[target].push(action);
        })
        this[source] = [];
    }

    drop(event: CdkDragDrop<string[]>, type: string = 'reject' || 'valid'): void {
        if (event.previousContainer === event.container) {
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            transferArrayItem(
                event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex
            );
            event.container.data[event.currentIndex]['type'] = type;
        }
    }

    moveAction(action: any, arraySource: string, arrayTarget: string, type: string): void {
        action.type = type;
        this[arrayTarget].push(action);
        const index: number = this[arraySource].indexOf(action);
        this[arraySource].splice(index, 1);
    }

    setActionsChosen(action: BasketGroupListActionInterface = null): Promise<boolean> {
        return new Promise((resolve) => {
            this.actionsChosen = [];
            this.availableValidationsActions = [];
            this.availableRefusalActions = [];
            this.availableValidationsActionsClone = [];
            this.availableRefusalActionsClone = [];
            this.loading = true;

            this.actionsChosen = this.currentBasketGroup?.groupActions.filter((action: any) => action.checked);
            this.actionsChosen = this.formatActions(this.actionsChosen);

            // Check if the 'actions' list in 'list_event_data' is empty, and if so, initialize it as an empty array
            if (this.functions.empty(this.currentBasketGroup?.list_event_data?.actions)) {
                this.currentBasketGroup = {
                    ... this.currentBasketGroup,
                    list_event_data: {
                        actions: []
                    }
                }
            }

            // For each action in 'actionsChosen', set the 'type' to 'reject' if the actionPage is found in 'refusalActionsId', otherwise set it to 'valid'
            this.actionsChosen.forEach((action) => {
                action['type'] = this.refusalActionsId.indexOf(action.actionPage) > -1 ? 'reject' : 'valid';
            });

            // Concatenate 'actionsChosen' with the existing actions in 'currentBasketGroup.list_event_data.actions'
            this.actionsChosen = this.currentBasketGroup.list_event_data.actions.concat(this.actionsChosen);

            this.actionsChosen = this.actionsChosen.map((action: BasketGroupListActionInterface) => ({
                ...action,
                actionLabel: this.currentBasketGroup?.groupActions.find((item: BasketGroupListActionInterface) => item.id === action.id).label_action
            }));

            // Filter 'actionsChosen' to remove duplicates based on the 'id' property
            this.actionsChosen = this.actionsChosen.filter((action: BasketGroupListActionInterface, index: number, self: BasketGroupListActionInterface[]) =>
                index === self.findIndex((t) => t.id === action.id)
            );

            if (action !== null) {
                this.actionsChosen = this.actionsChosen.filter((item: BasketGroupListActionInterface) => action.id !== item.id);
            }

            // Filter 'actionsChosen' to get all actions of type 'valid' and assign them to 'availableValidationsActions'
            this.availableValidationsActions = this.actionsChosen.filter((action: BasketGroupListActionInterface) => action.type === 'valid');

            // Filter 'actionsChosen' to get all actions of type 'reject' and assign them to 'availableRefusalActions'
            this.availableRefusalActions = this.actionsChosen.filter((action: BasketGroupListActionInterface) => action.type === 'reject');

            // Create deep clones of 'availableValidationsActions' and 'availableRefusalActions'
            this.availableValidationsActionsClone = JSON.parse(JSON.stringify(this.availableValidationsActions));
            this.availableRefusalActionsClone = JSON.parse(JSON.stringify(this.availableRefusalActions));

            this.loading = false;

            resolve(true);
        });
    }

    async refreshData(event: string, data: any): Promise<void> {
        await this.setActionsChosen(event === 'actionAdded' ? null : data).then(() => {
            this.saveTemplate(false);
        });
    }

    formatActions(actions: any[]): BasketGroupListActionInterface[] {
        return actions.map((action) => ({
            id: action.id,
            type: action.type ?? '',
            actionPage: action.action_page,
            defaultActionList: action.default_action_list === 'Y' ? true : false
        }));
    }

    private _filterData(value: any): string[] {
        let filterValue = '';

        if (typeof value === 'string') {
            filterValue = value.toLowerCase();
        } else if (value !== null) {
            filterValue = value.label.toLowerCase();
        }
        return this.availableData.filter((option: any) => option.label.toLowerCase().includes(filterValue));
    }
}

export interface BasketGroupListActionInterface {
    id: number;
    type: string;
    actionPage: string;
    defaultActionList: boolean;
}
