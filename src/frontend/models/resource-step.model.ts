export interface ResourceStepInterface {
    /**
     * Resource id
    */
    resId: number;

    /**
     * Indicates whether the the main document
    */
    mainDocument: boolean;

    /**
     * The identifier of the user in the external signatory book
    */
    externalId: string | number;

    /**
     * The order of the user in the workflow
    */
    sequence: number;

    /**
     * User role : 'visa', 'vign'
    */
    action: string;

    /**
     * Signature mode
    */
    signatureMode: string;

    /**
     * Signature positions
    */
    signaturePositions?: any[];

    /**
     * Date positions
    */
    datePositions?: any[];

    /**
     * Information related to OTP users
     */
    externalInformations: object;
}

export class ResourceStep implements ResourceStepInterface {
    resId = null;
    mainDocument = false;
    externalId = null;
    sequence = null;
    action = '';
    signatureMode = '';
    signaturePositions = [];
    datePositions = [];
    externalInformations = {};

    constructor(json: any = null) {
        if (json) {
            Object.assign(this, json);
        }
    }
}
