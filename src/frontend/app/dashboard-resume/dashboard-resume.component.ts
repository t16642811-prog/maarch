import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateService } from "@ngx-translate/core";

@Component({
    selector: 'app-dashboard-resume',
    templateUrl: 'dashboard-resume.component.html',
    styleUrls: ['../indexation/indexing-form/indexing-form.component.scss', 'dashboard-resume.component.scss'],
})
export class DashboardResumeComponent {
    @Input() resId: number;
    @Input() currentTool: string;

    @Output() goToEvent = new EventEmitter<string>;

    constructor(
        public translate: TranslateService
    ) { }

    goTo(id: string) {
        this.goToEvent.emit(id);
    }

}
