import { Component, Input, OnInit } from '@angular/core';
import { ActionsService } from '@appRoot/actions/actions.service';

import { Attachment, AttachmentInterface } from '@models/attachment.model';
import { FunctionsService } from '@service/functions.service';
import { SignatureBookService } from "@appRoot/signatureBook/signature-book.service";

@Component({
    selector: 'app-maarch-sb-tabs',
    templateUrl: 'signature-book-tabs.component.html',
    styleUrls: ['signature-book-tabs.component.scss'],
})
export class MaarchSbTabsComponent implements OnInit {
    @Input() documents: Attachment[] = [];
    @Input() position: 'left' | 'right' = 'right';

    selectedId: number = 0;

    constructor(
        public functionsService: FunctionsService,
        private actionsService: ActionsService,
        public signatureBookService: SignatureBookService,
    ) {}

    ngOnInit(): void {
        if (this.position === 'left') {
            this.signatureBookService.selectedAttachment.index = this.selectedId;
        } else if (this.position === 'right') {
            this.signatureBookService.selectedDocToSign.index = this.selectedId;
        }
    }

    selectDocument(i: number, attachment: AttachmentInterface): void {
        this.selectedId = i;

        if (this.position === 'left') {
            this.signatureBookService.toolBarActive = false;
            this.signatureBookService.selectedAttachment.index = i;
            this.signatureBookService.selectedAttachment.attachment = attachment;
        } else if (this.position === 'right') {
            this.signatureBookService.selectedDocToSign.index = i;
            this.signatureBookService.selectedDocToSign.attachment = attachment;
        }

        this.actionsService.emitActionWithData({
            id: 'attachmentSelected',
            data: {
                attachment: attachment,
                position: this.position,
                resIndex: this.selectedId
            },
        });
    }
}
