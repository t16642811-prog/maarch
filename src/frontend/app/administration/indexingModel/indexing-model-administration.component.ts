import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '@service/notification/notification.service';
import { HeaderService } from '@service/header.service';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatSidenav } from '@angular/material/sidenav';
import { AppService } from '@service/app.service';
import { tap, catchError, finalize, exhaustMap } from 'rxjs/operators';
import { SortPipe } from '../../../plugins/sorting.pipe';
import { IndexingFormComponent } from '../../indexation/indexing-form/indexing-form.component';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { MaarchFlatTreeComponent } from '@plugins/tree/maarch-flat-tree.component';
import { FunctionsService } from '@service/functions.service';
import { LadService } from '@service/lad.service';

@Component({
    templateUrl: 'indexing-model-administration.component.html',
    styleUrls: [
        'indexing-model-administration.component.scss',
        '../../indexation/indexing-form/indexing-form.component.scss'
    ],
    providers: [AppService, SortPipe]
})

export class IndexingModelAdministrationComponent implements OnInit {

    @ViewChild('snav2', { static: true }) public sidenavRight: MatSidenav;

    @ViewChild('indexingForm', { static: false }) indexingForm: IndexingFormComponent;

    @ViewChild('maarchTree', { static: true }) maarchTree: MaarchFlatTreeComponent;

    loading: boolean = true;

    indexingModel: any = {
        id: 0,
        label: '',
        category: 'incoming',
        default: false,
        owner: 0,
        private: false,
        mandatoryFile: false,
        ladProcessing: false
    };

    indexingModelClone: any;

    indexingModelsCustomFields: any[] = [];

    creationMode: boolean = true;

    categoriesList: any[];

    allEntities: any[] = [];

    allEntitiesClone: any[] = [];

    keywordAllEntities: any = {
        id: 'ALL_ENTITIES',
        keyword: 'ALL_ENTITIES',
        entity_id: 'ALL_ENTITIES',
        parent: '#',
        icon: 'fa fa-hashtag',
        allowed: true,
        text: '- ' + this.translate.instant('lang.allEntities'),
        state: { selected: false }
    };

    ladEnabled: boolean = false;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        public dialog: MatDialog,
        public appService: AppService,
        public functions: FunctionsService,
        private headerService: HeaderService,
        private route: ActivatedRoute,
        private router: Router,
        private notify: NotificationService,
        private ladService: LadService
    ) {

    }

    ngOnInit(): void {
        this.route.params.subscribe(async (params) => {
            this.ladEnabled = await this.ladService.isEnabled();
            if (typeof params['id'] === 'undefined') {
                this.creationMode = true;

                await this.getEntities();

                this.headerService.setHeader(this.translate.instant('lang.indexingModelCreation'));

                this.http.get('../rest/categories').pipe(
                    tap((data: any) => {
                        this.categoriesList = data.categories;

                    }),
                    tap(() => {
                        this.loading = false;
                        setTimeout(() => {
                            this.indexingForm.changeCategory(this.indexingModel.category);
                        }, 0);
                    }),
                    catchError((err: any) => {
                        this.notify.handleErrors(err);
                        return of(false);
                    })
                ).subscribe();
                this.indexingModelClone = JSON.parse(JSON.stringify(this.indexingModel));

            } else {
                this.creationMode = false;

                this.http.get('../rest/indexingModels/' + params['id']).pipe(
                    tap((data: any) => {
                        this.indexingModel = data.indexingModel;

                        this.headerService.setHeader(this.translate.instant('lang.indexingModelModification'), this.indexingModel.label);

                        this.indexingModelClone = JSON.parse(JSON.stringify(this.indexingModel));

                        this.allEntities = this.indexingModel.entities;

                        if (this.functions.empty(this.allEntities.find((entity: any) => entity.entity_id === 'ALL_ENTITIES'))) {
                            this.indexingModel.entities.unshift(this.keywordAllEntities);
                        } else {
                            this.allEntities.find((entity: any) => entity.entity_id === 'ALL_ENTITIES').text = this.keywordAllEntities.text;
                        }

                        this.allEntitiesClone = JSON.parse(JSON.stringify(this.allEntities));

                        if (this.indexingModel.default === true) {
                            (this.allEntities as any []).forEach((entity: any) => {
                                entity.state.disabled = true;
                            });
                        }

                        this.maarchTree.initData(this.allEntities.map(ent => ({
                            ...ent,
                            id : ent.serialId,
                        })));
                    }),
                    exhaustMap(() => this.http.get('../rest/categories')),
                    tap((data: any) => {
                        this.categoriesList = data.categories;
                    }),
                    finalize(() => this.loading = false),
                    catchError((err: any) => {
                        this.notify.handleErrors(err);
                        return of(false);
                    })
                ).subscribe();
            }
        });
    }

    onSubmit() {
        const fields = this.indexingForm.getDatas();
        fields.forEach((element, key) => {
            fields[key].default_value = ['string', 'integer', 'date'].indexOf(fields[key].type) > -1 && fields[key].SQLMode ? null : fields[key].default_value;
            delete fields[key].event;
            delete fields[key].label;
            delete fields[key].system;
            delete fields[key].type;
            delete fields[key].values;
        });
        this.indexingModel.fields = fields;
        this.indexingModel = {
            ...this.indexingModel,
            allDoctypes: this.indexingForm.allDoctypes,
            entities: this.maarchTree.getSelectedNodes().map((ent: any) => ent.entity_id)
        };

        if (this.creationMode) {
            this.http.post('../rest/indexingModels', this.indexingModel).pipe(
                tap(() => {
                    this.indexingForm.setModification();
                    this.setModification();
                    this.router.navigate(['/administration/indexingModels']);
                    this.notify.success(this.translate.instant('lang.indexingModelAdded'));
                }),
                finalize(() => this.loading = false),
                catchError((err: any) => {
                    this.notify.handleErrors(err);
                    return of(false);
                })
            ).subscribe();
        } else {
            this.http.put('../rest/indexingModels/' + this.indexingModel.id, this.indexingModel).pipe(
                tap(() => {
                    this.indexingForm.setModification();
                    this.setModification();
                    this.router.navigate(['/administration/indexingModels']);
                    this.notify.success(this.translate.instant('lang.indexingModelUpdated'));
                }),
                finalize(() => this.loading = false),
                catchError((err: any) => {
                    this.notify.handleErrors(err);
                    return of(false);
                })
            ).subscribe();
        }

    }

    isModified() {
        let compare: string = '';
        let compareClone: string = '';

        compare = JSON.stringify(this.indexingModel);
        compareClone = JSON.stringify(this.indexingModelClone);

        if (compare !== compareClone) {
            return true;
        } else {
            return false;
        }
    }

    setModification() {
        this.indexingModelClone = JSON.parse(JSON.stringify(this.indexingModel));
    }

    changeCategory(ev: any) {
        this.indexingForm.changeCategory(ev.value);
    }

    getEntities() {
        return new Promise((resolve) => {
            this.http.get('../rest/indexingModels/entities?allEntities=true').pipe(
                tap((data: any) => {
                    this.allEntities = data.entities;
                    this.allEntities.unshift(this.keywordAllEntities);
                    this.allEntities.forEach((entity: any) => {
                        if (entity?.keyword === 'ALL_ENTITIES') {
                            entity.state.selected = true;
                        }
                    });
                    this.allEntitiesClone = JSON.parse(JSON.stringify(this.allEntities));
                    this.maarchTree.initData(this.allEntities.map(ent => ({
                        ...ent,
                        id : ent.serialId,
                    })));
                    resolve(this.allEntities);
                }),
                catchError((err: any) => {
                    this.notify.handleSoftErrors(err);
                    return of(false);
                })
            ).subscribe();
        });
    }

    toggleEntities(isDefault: boolean) {
        /**
         * If the model is default: all entities are selected and modification is not possible
         */
        if (isDefault) {
            this.allEntities.forEach((entity: any) => {
                if (entity?.keyword !== 'ALL_ENTITIES') {
                    entity.state.disabled = true;
                    entity.state.selected = false;
                } else {
                    entity.state.disabled = true;
                    entity.state.selected = true;
                }
            });
        } else {
            this.allEntities.forEach((entity: any) => {
                entity.state.disabled = false;
            });
        }

        /**
         * if you are editing
         * we keep the initial selection of entities for the model when 'isDefault' is false
         */
        if (!this.creationMode && !isDefault) {
            this.maarchTree.initData(this.allEntitiesClone.map(ent => ({
                ...ent,
                id : ent.serialId,
            })));
        } else {
            this.maarchTree.initData(this.allEntities.map(ent => ({
                ...ent,
                id : ent.serialId,
            })));
        }
    }
}
