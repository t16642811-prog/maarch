import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { HttpClient } from '@angular/common/http';
import { DiffusionsListComponent } from '../../diffusions/diffusions-list.component';
import { UntypedFormControl } from '@angular/forms';
import { map, tap, finalize, catchError, startWith, exhaustMap } from 'rxjs/operators';
import { NoteEditorComponent } from '../../notes/note-editor.component';
import { FunctionsService } from '@service/functions.service';
import { Observable, of, firstValueFrom } from 'rxjs';
import { HeaderService } from '@service/header.service';
import { SessionStorageService } from '@service/session-storage.service';

@Component({
    templateUrl: 'redirect-action.component.html',
    styleUrls: ['redirect-action.component.scss'],
})
export class RedirectActionComponent implements OnInit {

    @ViewChild('appDiffusionsList', { static: false }) appDiffusionsList: DiffusionsListComponent;
    @ViewChild('noteEditor', { static: false }) noteEditor: NoteEditorComponent;

    loading: boolean = false;

    entities: any[] = [];
    injectDatasParam = {
        resId: 0,
        editable: true,
        keepDestForRedirection: false,
        keepCopyForRedirection: false,
        keepOtherRoleForRedirection: false
    };
    destUser: any = null;
    oldUser: any = null;
    ccUser: any[] = [];
    otherRole: any[] = [];
    keepDestForRedirection: boolean = false;
    keepCopyForRedirection: boolean = false;
    keepOtherRoleForRedirection: boolean = false;
    currentDiffusionListDestRedirect: any = [];
    diffusionListDestRedirect: any = [];
    currentEntity: any = {
        'serialId': 0,
        'entity_label': ''
    };
    redirectMode: string = '';
    userListRedirect: any[] = [];
    userRedirectCtrl = new UntypedFormControl();
    filteredUserRedirect: Observable<any[]>;
    isDestinationChanging: boolean = false;

    actionKeyword: string = '';
    autoSelectedEntities: any[] = [];
    autoSelectedEntityLabels: string[] = [];
    private forcedRedirectMode: 'user' | 'entity' | '' = '';
    private forcedRedirectUserId: number | null = null;

    canGoToNextRes: boolean = false;
    showToggle: boolean = false;
    inLocalStorage: boolean = false;
    orphanEntitySerialIds: number[] = [];

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        private notify: NotificationService,
        public dialogRef: MatDialogRef<RedirectActionComponent>,
        public headerService: HeaderService,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private functionsService: FunctionsService,
        private sessionStorage: SessionStorageService
    ) { }

    async ngOnInit(): Promise<void> {
        this.loading = true;
        this.showToggle = this.data.additionalInfo.showToggle;
        this.canGoToNextRes = this.data.additionalInfo.canGoToNextRes;
        this.inLocalStorage = this.data.additionalInfo.inLocalStorage;
        await this.getEntities();
        await this.getDefaultEntity();
        this.setForcedRedirectModeFromAction();

        if (this.forcedRedirectMode === 'user') {
            this.loadDestUser();
        } else if (this.forcedRedirectMode === 'entity') {
            this.loadEntities();
        } else if (this.actionKeyword === 'autoRedirectToUser') {
            this.redirectMode = this.entities.filter((entity: any) => entity.allowed).length > 0 ? '' : 'user';
            this.changeDest({ option: { value: this.formatUser() } });
            this.loading = false;
        } else if (this.userListRedirect.length === 0 && this.entities.filter((entity: any) => entity.allowed).length === 0) {
            this.redirectMode = 'none';
            this.loading = false;
        } else if (this.userListRedirect.length === 0 && this.entities.filter((entity: any) => entity.allowed).length > 0) {
            this.loadEntities();
        } else if (this.userListRedirect.length > 0 && this.entities.filter((entity: any) => entity.allowed).length === 0) {
            this.loadDestUser();
        } else {
            this.loading = false;
        }
    }

    private setForcedRedirectModeFromAction(): void {
        const params = this.data?.action?.parameters;
        let actionParams: any = {};
        if (params) {
            if (typeof params === 'string') {
                try {
                    actionParams = JSON.parse(params);
                } catch (e) {
                    actionParams = {};
                }
            } else {
                actionParams = params;
            }
        }
        const forced = (actionParams?.forceRedirectMode || '').toString().toLowerCase();
        if (forced === 'user' || forced === 'entity') {
            this.forcedRedirectMode = forced as 'user' | 'entity';
        } else {
            this.forcedRedirectMode = '';
        }
        if (actionParams?.forceRedirectUserId !== undefined && actionParams?.forceRedirectUserId !== null) {
            const parsed = parseInt(actionParams.forceRedirectUserId, 10);
            this.forcedRedirectUserId = Number.isNaN(parsed) ? null : parsed;
        } else {
            this.forcedRedirectUserId = null;
        }
    }

    private async tryAutoSelectAnamEntities(): Promise<void> {
        if (!this.data?.resIds || this.data.resIds.length !== 1) {
            return;
        }
        try {
            const resId = this.data.resIds[0];
            let data: any = await firstValueFrom(this.http.get(`../rest/resources/${resId}?light=true`));
            if (this.functionsService.empty(data?.custom_fields) && this.functionsService.empty(data?.customFields)) {
                data = await firstValueFrom(this.http.get(`../rest/resources/${resId}`));
            }
            const customFieldsDef: any = await firstValueFrom(this.http.get(`../rest/customFields?resId=${resId}`));
            let customFields: any = {};
            if (!this.functionsService.empty(data?.customFields)) {
                customFields = data.customFields;
            } else if (!this.functionsService.empty(data?.custom_fields)) {
                if (typeof data.custom_fields === 'string') {
                    customFields = JSON.parse(data.custom_fields);
                } else {
                    customFields = data.custom_fields;
                }
            }
            const selectedColumns = [
                ...(customFields['12'] ?? []),
                ...(customFields['13'] ?? []),
                ...(customFields['14'] ?? [])
            ].map((val: any) => String(val));
            const valueLabelMap = this.buildCustomFieldValueLabelMap(customFieldsDef?.customFields || []);
            const selectedLabels = selectedColumns
                .map((val: string) => valueLabelMap.get(val) ?? val)
                .filter((label: any) => !!label) as string[];
            const mappedLabels = this.mapAnamColumnsToEntities(selectedLabels);
            this.autoSelectedEntityLabels = mappedLabels;
            this.autoSelectedEntities = this.findEntitiesByLabels(mappedLabels);
        } catch (e) {
            this.autoSelectedEntities = [];
            this.autoSelectedEntityLabels = [];
        }
    }

    private buildCustomFieldValueLabelMap(customFields: any[]): Map<string, string> {
        const map = new Map<string, string>();
        customFields.forEach((field: any) => {
            (field.values || []).forEach((value: any) => {
                if (value?.id !== undefined && value?.label !== undefined) {
                    map.set(String(value.id), value.label);
                }
            });
        });
        return map;
    }


    private mapAnamColumnsToEntities(columns: string[]): string[] {
        const map: Record<string, string> = {
            'Recherche': 'DIRECTION RECHERCHE MINIERE',
            'Promotion': 'DIRECTION PROMOTION & DEVELOPPEMENT MINIER',
            'Permis miniers': 'DIRECTION PERMIS MINIER',
            'Controle minier': 'DIRECTION CONTROLE MINIER',
            'DRHL': 'Direction des Ressources Humaines',
            'DFC': 'DEPARTEMENT FINANCES & COMPTABILITE',
            'Dcx': 'DEPARTEMENT CONTENCIEUX ET AFFAIRES JURIDIQUES'
        };
        const labels = columns.map((col) => map[col]).filter((label) => !!label);
        return Array.from(new Set(labels));
    }

    private normalizeLabel(value: string): string {
        const base = (value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '');
        return base.toUpperCase().replace(/\s+/g, ' ').trim();
    }

    private findEntitiesByLabels(labels: string[]): any[] {
        const normalizedLabels = labels.map((label) => this.normalizeLabel(label));
        return this.entities.filter((entity: any) => {
            const label = this.normalizeLabel(entity.entity_label || entity.text || '');
            return normalizedLabels.includes(label);
        });
    }

    getEntities() {
        return new Promise((resolve) => {
            this.http.get(`../rest/resourcesList/users/${this.data.userId}/groups/${this.data.groupId}/baskets/${this.data.basketId}/actions/${this.data.action.id}/getRedirect`).pipe(
                tap((data: any) => {
                    this.userListRedirect = data.users;
                    if (data.autoRedirectToUser) {
                        this.actionKeyword = 'autoRedirectToUser';
                        this.userListRedirect.push(this.formatUser());
                    }
                    this.entities = data['entities'];
                    /**
                     * browse the array of entities to check if entity_parent_id of children is defined
                     */
                    this.entities.forEach((entity: any) => {
                        if (!this.functionsService.empty(entity.parent_entity_id) && this.functionsService.empty(this.entities.find((item: any) => item.entity_id === entity.parent_entity_id))) {
                            this.orphanEntitySerialIds.push(entity.entity_id);
                            this.getEntityChildren(entity.entity_id);
                        }
                    });
                    this.entities = this.entities.filter((entity: any) => this.orphanEntitySerialIds.indexOf(entity.entity_id) === -1);
                    this.keepDestForRedirection = data.keepDestForRedirection;
                    this.keepCopyForRedirection = data.keepCopyForRedirection;
                    this.keepOtherRoleForRedirection = data.keepOtherRoleForRedirection;
                    this.injectDatasParam.keepDestForRedirection = data.keepDestForRedirection;
                    this.injectDatasParam.keepCopyForRedirection = data.keepCopyForRedirection;
                    this.injectDatasParam.keepOtherRoleForRedirection = data.keepOtherRoleForRedirection;
                    resolve(true);
                }),
                catchError((err: any) => {
                    this.notify.handleSoftErrors(err);
                    return of(false);
                })
            ).subscribe();
        });
    }

    getEntityChildren(entityId: string) {
        const entityChildren = this.entities.filter((entity: any) => entity.parent_entity_id === entityId);

        if (!this.functionsService.empty(entityChildren)) {
            entityChildren.forEach((entityChild: any) => {
                this.orphanEntitySerialIds.push(entityChild.entity_id);
                this.getEntityChildren(entityChild.entity_id);
            });
        }
    }

    getDefaultEntity() {
        return new Promise((resolve) => {
            if (this.data.resIds.length === 1) {
                this.http.get(`../rest/resources/${this.data.resIds[0]}/fields/destination?alt=true`).pipe(
                    tap((data: any) => {
                        if (!this.functionsService.empty(data.field)) {
                            this.currentEntity = this.entities.filter((entity: any) => entity.serialId === data.field)[0];
                            this.entities = this.entities.map((entity: any) => ({
                                ...entity,
                                state : {
                                    selected : false,
                                    opened: false,
                                    disabled: entity.state.disabled
                                }
                            }));
                        } else {
                            if (this.entities.filter((entity: any) => entity.state.selected).length > 0) {
                                this.currentEntity = this.entities.filter((entity: any) => entity.state.selected)[0];
                            }
                        }
                        resolve(true);
                    }),
                    catchError((err: any) => {
                        this.notify.handleSoftErrors(err);
                        return of(false);
                    })
                ).subscribe();
            } else {
                this.currentEntity = this.entities.filter((entity: any) => entity.state.selected)[0];
                resolve(true);
            }
        });
    }

    async loadEntities() {
        this.redirectMode = 'entity';
        if (this.data.resIds.length === 1) {
            this.injectDatasParam.resId = this.data.resIds[0];
        }
        this.loading = false;
        await this.tryAutoSelectAnamEntities();
        setTimeout(() => {
            $('#jstree').jstree({
                'checkbox': {
                    'deselect_all': false,
                    'three_state': false // no cascade selection
                },
                'core': {
                    force_text: true,
                    'themes': {
                        'name': 'proton',
                        'responsive': true
                    },
                    'multiple': true,
                    'data': this.entities,
                },
                'plugins': ['checkbox', 'search', 'sort']
            });
            let to: any = false;
            $('#jstree_search').keyup(function () {
                if (to) {
                    clearTimeout(to);
                }
                to = setTimeout(function () {
                    const v: any = $('#jstree_search').val();
                    $('#jstree').jstree(true).search(v);
                }, 250);
            });
            $('#jstree')
                // listen for event
                .on('loaded.jstree', () => {
                    const tree = $('#jstree').jstree(true);
                    const labelSet = new Set(this.autoSelectedEntityLabels.map((label) => this.normalizeLabel(label)));
                    if (labelSet.size > 0) {
                        const nodes: any[] = tree.get_json('#', { flat: true }) || [];
                        nodes.forEach((node: any) => {
                            const nodeLabel = this.normalizeLabel(node.text || '');
                            if (labelSet.has(nodeLabel)) {
                                tree.check_node(node.id, null);
                            }
                        });
                    }
                    if (this.autoSelectedEntities.length === 0) {
                        return;
                    }
                    const primary = this.autoSelectedEntities[0];
                    if (primary?.serialId && this.appDiffusionsList) {
                        this.currentEntity = primary;
                        $('#jstree').jstree('select_node', primary);
                        this.appDiffusionsList.loadListModel(primary.serialId, true).then(() => {
                            this.autoSelectedEntities.forEach((entity: any) => {
                                const nodeId = entity.id ?? entity.entity_id ?? entity.serialId;
                                if (nodeId !== undefined && nodeId !== null) {
                                    tree.check_node(nodeId, null);
                                }
                                this.appDiffusionsList.addEntityDest({
                                    serialId: entity.serialId,
                                    id: entity.id,
                                    idToDisplay: entity.entity_label || entity.text,
                                    descriptionToDisplay: ''
                                });
                            });
                        });
                    } else if (primary?.serialId) {
                        this.selectEntity(primary, true);
                    } else if (this.currentEntity.serialId > 0) {
                        $('#jstree').jstree('select_node', this.currentEntity);
                        this.selectEntity(this.currentEntity, true);
                    }
                }).on('select_node.jstree', (e: any, data: any) => {
                    this.selectEntity(data.node.original);
                    if (this.appDiffusionsList) {
                        this.appDiffusionsList.addEntityDest({
                            serialId: data.node.original.serialId,
                            id: data.node.original.id,
                            idToDisplay: data.node.original.entity_label || data.node.original.text,
                            descriptionToDisplay: ''
                        });
                    }
                })
                // create the instance
                .jstree();
        }, 0);
    }

    loadDestUser() {
        this.redirectMode = 'user';
        this.filteredUserRedirect = this.userRedirectCtrl.valueChanges
            .pipe(
                startWith(''),
                map(user => user ? this._filterUserRedirect(user) : this.userListRedirect.slice())
            );

        this.loading = false;
        if (this.data.resIds.length === 1) {
            this.http.get('../rest/resources/' + this.data.resIds[0] + '/listInstance').subscribe((data: any) => {
                this.diffusionListDestRedirect = data.listInstance;
                data.listInstance.forEach((line: any) => {
                    if (line.item_mode === 'dest') {
                        this.oldUser = line;
                    }
                });
                if (this.forcedRedirectUserId !== null) {
                    const forcedUser = this.userListRedirect.find((user: any) => user.id === this.forcedRedirectUserId);
                    if (forcedUser) {
                        this.userListRedirect = [forcedUser];
                        this.changeDest({ option: { value: forcedUser } });
                    }
                }
                $('.searchUserRedirect').click();
            }, (err: any) => {
                this.notify.handleErrors(err);
            });
        } else {
            this.keepDestForRedirection = false;
            if (this.forcedRedirectUserId !== null) {
                const forcedUser = this.userListRedirect.find((user: any) => user.id === this.forcedRedirectUserId);
                if (forcedUser) {
                    this.userListRedirect = [forcedUser];
                    this.changeDest({ option: { value: forcedUser } });
                }
            }
            setTimeout(() => {
                $('.searchUserRedirect').click();
            }, 200);
        }
    }

    changeDest(event: any) {
        this.currentDiffusionListDestRedirect = this.diffusionListDestRedirect;
        const user = event.option.value;

        this.destUser = {
            difflist_type: 'entity_id',
            item_mode: 'dest',
            item_type: 'user_id',
            item_id: user.user_id,
            itemSerialId: user.id,
            labelToDisplay: user.labelToDisplay,
            descriptionToDisplay: user.descriptionToDisplay
        };

        if (this.data.resIds.length === 1) {
            this.isDestinationChanging = false;
            this.http.get('../rest/resources/' + this.data.resIds[0] + '/users/' + user.id + '/isDestinationChanging')
                .subscribe((data: any) => {
                    this.isDestinationChanging = data.isDestinationChanging;
                }, (err: any) => {
                    this.notify.handleErrors(err);
                });

            if (this.keepDestForRedirection && this.currentDiffusionListDestRedirect.length > 0) {
                let isInCopy = false;
                let newCopy = null;
                this.currentDiffusionListDestRedirect.forEach((element: any) => {
                    if (element.item_mode === 'cc' && element.itemSerialId === this.oldUser.itemSerialId) {
                        isInCopy = true;
                    }
                });

                if (!isInCopy) {
                    newCopy = this.oldUser;
                    newCopy.item_mode = 'cc';
                    this.currentDiffusionListDestRedirect.push(newCopy);
                }
            }
            this.currentDiffusionListDestRedirect.splice(this.currentDiffusionListDestRedirect.map((e: any) => e.item_mode).indexOf('dest'), 1);
        } else {
            this.isDestinationChanging = true;
        }
        this.currentDiffusionListDestRedirect.push(this.destUser);

        this.userRedirectCtrl.reset();
        $('.searchUserRedirect').blur();
    }

    selectEntity(entity: any, initLoad: boolean = false) {
        this.currentEntity = entity;
        this.appDiffusionsList.loadListModel(entity.serialId, initLoad);
    }

    onSubmit() {
        this.loading = true;
        if (!this.data.resIds || this.data.resIds.length === 0) {
            this.saveAndExecuteIndexingAction();
            return;
        }
        this.sessionStorage.checkSessionStorage(this.inLocalStorage, this.canGoToNextRes, this.data);
        this.executeAction();
    }

    executeAction() {
        const actionData = this.getRedirectData();
        this.http.put(this.data.processActionRoute, { resources: this.data.resIds, data: actionData, note: this.noteEditor.getNote() }).pipe(
            tap((data: any) => {
                if (data && data.errors != null) {
                    this.notify.error(data.errors);
                }
                this.dialogRef.close(this.data.resIds);
            }),
            finalize(() => this.loading = false),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    private saveAndExecuteIndexingAction() {
        const actionData = this.getRedirectData();
        this.http.post('../rest/resources', this.data.resource).pipe(
            tap((data: any) => {
                this.data.resIds = [data.resId];
                this.sessionStorage.checkSessionStorage(this.inLocalStorage, this.canGoToNextRes, this.data);
            }),
            exhaustMap(() => this.http.put(this.data.indexActionRoute, {
                resource: this.data.resIds[0],
                data: actionData,
                note: this.noteEditor.getNote()
            })),
            tap((data: any) => {
                if (data && data.errors != null) {
                    this.notify.error(data.errors);
                }
                this.dialogRef.close(this.data.resIds);
            }),
            finalize(() => this.loading = false),
            catchError((err: any) => {
                this.notify.handleSoftErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    private getRedirectData() {
        if (this.redirectMode === 'user') {
            return { onlyRedirectDest: true, listInstances: this.formatDiffusionList() };
        }
        const listInstances = this.appDiffusionsList ? this.appDiffusionsList.getCurrentListinstance() : [];
        return { destination: this.currentEntity.serialId, listInstances };
    }

    // WORKAROUND TO SEND SERIAL ID IN ITEM_ID (TO DO : REFACTOR TO ONLY USE SERIAL ID)
    formatDiffusionList() {
        return this.currentDiffusionListDestRedirect.map((item: any) => ({
            ...item,
            item_id : item.itemSerialId
        }));
    }

    checkValidity() {
        if (this.redirectMode === 'entity' && this.appDiffusionsList && this.appDiffusionsList.getDestUser().length > 0 && this.currentEntity.serialId > 0 && !this.loading) {
            return false;
        } else if (this.redirectMode === 'user' && this.currentDiffusionListDestRedirect.length > 0 && this.destUser != null && !this.loading) {
            return false;
        } else {
            return true;
        }
    }

    formatUser() {
        return {
            difflist_type: 'entity_id',
            item_mode: 'dest',
            item_type: 'user_id',
            id: this.headerService.user.id,
            item_id: this.headerService.user.id,
            itemSerialId: this.headerService.user.id,
            labelToDisplay: `${this.headerService.user.firstname} ${this.headerService.user.lastname}`,
            descriptionToDisplay: this.headerService.user.entities.find((entity: any) => entity.primary_entity === 'Y').entity_label
        };
    }

    private _filterUserRedirect(value: string): any[] {
        if (typeof value === 'string') {
            const filterValue = value.toLowerCase();
            return this.userListRedirect.filter(user => user.labelToDisplay.toLowerCase().indexOf(filterValue) >= 0);
        }
    }
}
