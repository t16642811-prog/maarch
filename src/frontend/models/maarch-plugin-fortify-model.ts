import { TranslateService } from "@ngx-translate/core";
import { FunctionsService } from "@service/functions.service";
import { NotificationService } from "@service/notification/notification.service";
import { Attachment } from "./attachment.model";
import { SignatureBookConfigInterface } from "./signature-book.model";

export interface MaarchPluginFortifyInterface {
    functions: FunctionsService;
    notification: NotificationService;
    translate: TranslateService;
    pluginUrl: string;
    additionalInfo: {
        resources: Attachment[];
        sender: string;
        externalUserId: number;
        signatureBookConfig: SignatureBookConfigInterface,
        digitalCertificate: boolean
    };
}