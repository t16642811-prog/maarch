import { StampInterface } from "@models/signature-book.model";

export interface AttachmentInterface {
    /**
     * identifier for the attachment
     */
    resId: number;

    /**
     * identifier for the master resource (main document)
     */
    resIdMaster: number;

    /**
     * identifier for the signed version of the attachment.
     */
    signedResId: number;

    /**
     * chrono for the attachment
     */
    chrono: string;

    /**
     * Title or name of the attachment
     */
    title: string;

    /**
     * Type of the attachment
     */
    type: string;

    /**
     * Human-readable label for the attachment type
     */
    typeLabel: string;

    /**
     * Boolean indicating whether the attachment can be converted
     */
    canConvert: boolean;

    /**
     * Boolean indicating whether the attachment can be deleted
     */
    canDelete: boolean;

    /**
     * Boolean indicating whether the attachment can be updated
     */
    canUpdate: boolean;

    /**
     * Urn of document content
     */
    resourceUrn: string;

    stamps?: StampInterface[];

    isAttachment: boolean;
}

export class Attachment implements AttachmentInterface {

    resId: number = null;
    resIdMaster: number = null;
    signedResId: number = null;
    chrono: string = null;
    title: string = '';
    type: string = '';
    typeLabel: string = null;
    canConvert: boolean = false;
    canDelete: boolean = false;
    canUpdate: boolean = false;
    resourceUrn: string = '';
    stamps: StampInterface[] = [];
    isAttachment: boolean = false;

    constructor(json: any = null) {
        if (json) {
            Object.assign(this, json);
            if (this.resId) {
                const type = json.isAttachment ? 'attachments' : 'resources';
                this.resourceUrn = `rest/${type}/${json.resId}/content`;
            }
        }
    }
}
