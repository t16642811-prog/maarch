import { Attachment } from "@models/attachment.model";

// Helper function to map attachment data
export function mapAttachment(data: any): Attachment {
    return new Attachment({
        resId: data.resId,
        resIdMaster: data.resIdMaster ?? data.resId,
        signedResId: data.signedResId,
        chrono: data.chrono,
        title: data.title,
        type: data.type,
        typeLabel: data.typeLabel,
        canConvert: data.isConverted,
        canDelete: data.canDelete,
        canUpdate: data.canModify,
        stamps: [],
        isAttachment: data.resIdMaster !== null
    });
}
