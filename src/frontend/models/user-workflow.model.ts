export interface UserWorkflowInterface {
    /**
     * User identifier in the external signatory book
     */
    id?: number;

    /**
     * User identifier in Maarch Courrier
     */
    item_id?: number;

    /**
     * Object identifier
     */
    listinstance_id?: number;

    /**
     * Identifier of the delegating user
     */
    delegatedBy?: number;

    /**
     * Type of item: 'user', 'entity', ...
     */
    item_type: string;


    /**
     * Entity of the item: can be the processing entity or the email address
     */
    item_entity?: string;


    /**
     * Label to display : firstname + last name
     */
    labelToDisplay: string;


    /**
     * Role of item : 'visa', 'stamp', ...
     */
    role?: string;


    /**
     * Date the user made the visa/sign action
     */
    process_date?: string;

    /**
     * User avatar
     */
    picture?: string;

    /**
     * User status
     */
    status?: string;

    /**
     * Diffusion list type: 'VISA_CIRCUIT', 'AVIS_CIRCUIT', ...
     */
    difflist_type?: string;

    /**
     * External identifier
     */
    externalId?: object;

    /**
     * other external information
     */
    externalInformations?: object;

    /**
     * Available roles: 'visa', 'sign', 'inca_card', 'rgs_2stars', .
     */
    availableRoles?: string[];

    /**
     * Indicates whether the user must sign a mail or not
     */
    requested_signature?: boolean;

    /**
     * Indicates whether the user has signed or not
     */
    signatory?: boolean;

    /**
     * Indicates whether the user has the privilege
     */
    hasPrivilege: boolean;

    /**
     * Indicates if the user is valid
     */
    isValid: boolean;

    /**
     * Signature positions
     */
    signaturePositions?: any[];

    /**
     * Date positions
     */
    datePositions?: any[];

    /**
     * Signature modes : 'visa', 'sign'
     */
    signatureModes?: string[];
}

export class UserWorkflow implements UserWorkflowInterface {
    id = null;
    item_id = null;
    listinstance_id = null;
    delegatedBy = null;
    item_type = 'user';
    item_entity = '';
    labelToDisplay = '';
    role = '';
    process_date = '';
    picture = '';
    status = '';
    difflist_type = 'VISA_CIRCUIT';
    signatory = false;
    hasPrivilege = false;
    isValid = false;
    requested_signature = false;
    externalId = {};
    externalInformations = {};
    availableRoles = [];
    signaturePositions = [];
    datePositions = [];
    signatureModes = ['visa', 'sign'];

    constructor(json: any = null) {
        if (json) {
            Object.assign(this, json);
        }
    }
}
