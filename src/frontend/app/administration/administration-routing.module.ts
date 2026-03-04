import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AdministrationComponent } from './home/administration.component';
import { UsersAdministrationComponent } from './user/users-administration.component';
import { UserAdministrationComponent } from './user/user-administration.component';
import { GroupsAdministrationComponent } from './group/groups-administration.component';
import { GroupAdministrationComponent } from './group/group-administration.component';
import { BasketsAdministrationComponent } from './basket/baskets-administration.component';
import { BasketAdministrationComponent } from './basket/basket-administration.component';
import { DoctypesAdministrationComponent } from './doctype/doctypes-administration.component';
import { DiffusionModelsAdministrationComponent } from './diffusionModel/diffusionModels-administration.component';
import { DiffusionModelAdministrationComponent } from './diffusionModel/diffusionModel-administration.component';
import { EntitiesAdministrationComponent } from './entity/entities-administration.component';
import { StatusesAdministrationComponent } from './status/statuses-administration.component';
import { StatusAdministrationComponent } from './status/status-administration.component';
import { ActionsAdministrationComponent } from './action/actions-administration.component';
import { ActionAdministrationComponent } from './action/action-administration.component';
import { ParameterAdministrationComponent } from './parameter/parameter-administration.component';
import { ParametersAdministrationComponent } from './parameter/parameters-administration.component';
import { PrioritiesAdministrationComponent } from './priority/priorities-administration.component';
import { PriorityAdministrationComponent } from './priority/priority-administration.component';
import { NotificationsAdministrationComponent } from './notification/notifications-administration.component';
import { NotificationAdministrationComponent } from './notification/notification-administration.component';
import { HistoryAdministrationComponent } from './history/history-administration.component';
import { HistoryBatchAdministrationComponent } from './history/batch/history-batch-administration.component';
import { UpdateStatusAdministrationComponent } from './updateStatus/update-status-administration.component';
import { ContactsGroupsAdministrationComponent } from './contact/group/contacts-groups-administration.component';
import { ContactsGroupAdministrationComponent } from './contact/group/contacts-group-administration.component';
import { ContactsParametersAdministrationComponent } from './contact/parameter/contacts-parameters-administration.component';
import { VersionsUpdateAdministrationComponent } from './versionUpdate/versions-update-administration.component';
import { DocserversAdministrationComponent } from './docserver/docservers-administration.component';
import { DocserverAdministrationComponent } from './docserver/docserver-administration.component';
import { TemplatesAdministrationComponent } from './template/templates-administration.component';
import { TemplateAdministrationComponent } from './template/template-administration.component';
import { SecuritiesAdministrationComponent } from './security/securities-administration.component';
import { SendmailAdministrationComponent } from './sendmail/sendmail-administration.component';
import { ShippingsAdministrationComponent } from './shipping/shippings-administration.component';
import { ShippingAdministrationComponent } from './shipping/shipping-administration.component';
import { CustomFieldsAdministrationComponent } from './customField/custom-fields-administration.component';
import { AppGuardAdmin } from '@service/app.guardAdmin';
import { IndexingModelAdministrationComponent } from './indexingModel/indexing-model-administration.component';
import { IndexingModelsAdministrationComponent } from './indexingModel/indexing-models-administration.component';
import { ContactsListAdministrationComponent } from './contact/list/contacts-list-administration.component';
import { ContactsCustomFieldsAdministrationComponent } from './contact/customField/contacts-custom-fields-administration.component';
import { ContactsPageAdministrationComponent } from './contact/page/contacts-page-administration.component';
import { TagsAdministrationComponent } from './tag/tags-administration.component';
import { TagAdministrationComponent } from './tag/tag-administration.component';
import { AlfrescoAdministrationComponent } from './alfresco/alfresco-administration.component';
import { AlfrescoListAdministrationComponent } from './alfresco/alfresco-list-administration.component';
import { ContactDuplicateComponent } from './contact/contact-duplicate/contact-duplicate.component';
import { IssuingSiteListComponent } from './registered-mail/issuing-site/issuing-site-list.component';
import { IssuingSiteComponent } from './registered-mail/issuing-site/issuing-site.component';
import { RegisteredMailListComponent } from './registered-mail/registered-mail-list.component';
import { RegisteredMailComponent } from './registered-mail/registered-mail.component';
import { SearchAdministrationComponent } from './search/search-administration.component';
import { SsoAdministrationComponent } from './connection/sso/sso-administration.component';
import { AttachmentTypeAdministrationComponent } from './attachment/attachment-type-administration.component';
import { AttachmentTypesAdministrationComponent } from './attachment/attachment-types-administration.component';
import { OrganizationEmailSignaturesAdministrationComponent } from './organizationEmailSignatures/organization-email-signatures-administration.component';
import { MultigestListAdministrationComponent } from './multigest/multigest-list-administration.component';
import { MultigestAdministrationComponent } from './multigest/multigest-administration.component';
import { LadAdministrationComponent } from './mercure/lad-administration.component';
import { LadContactsManagementComponent } from './mercure/ladContactsManagement/lad-contacts-management.component';
import { MwsAdministrationComponent } from './mercure/webservice/mws-administration.component';
import { MwsListDocsComponent } from './mercure/webservice/mws-list-docs.component';
import { MwsMonitoringComponent } from './mercure/webservice/mws-monitoring.component';

@NgModule({
    imports: [
        RouterModule.forChild([
            { path: 'administration', canActivate: [AppGuardAdmin], component: AdministrationComponent },
            { path: 'administration/users', canActivate: [AppGuardAdmin], component: UsersAdministrationComponent },
            { path: 'administration/users/new', canActivate: [AppGuardAdmin], component: UserAdministrationComponent },
            { path: 'administration/users/:id', canActivate: [AppGuardAdmin], component: UserAdministrationComponent },
            { path: 'administration/groups', canActivate: [AppGuardAdmin], component: GroupsAdministrationComponent },
            { path: 'administration/groups/new', canActivate: [AppGuardAdmin], component: GroupAdministrationComponent },
            { path: 'administration/groups/:id', canActivate: [AppGuardAdmin], component: GroupAdministrationComponent },
            { path: 'administration/baskets', canActivate: [AppGuardAdmin], component: BasketsAdministrationComponent },
            { path: 'administration/baskets/new', canActivate: [AppGuardAdmin], component: BasketAdministrationComponent },
            { path: 'administration/baskets/:id', canActivate: [AppGuardAdmin], component: BasketAdministrationComponent },
            { path: 'administration/doctypes', canActivate: [AppGuardAdmin], component: DoctypesAdministrationComponent },
            { path: 'administration/diffusionModels', canActivate: [AppGuardAdmin], component: DiffusionModelsAdministrationComponent },
            { path: 'administration/diffusionModels/new', canActivate: [AppGuardAdmin], component: DiffusionModelAdministrationComponent },
            { path: 'administration/diffusionModels/:id', canActivate: [AppGuardAdmin], component: DiffusionModelAdministrationComponent },
            { path: 'administration/entities', canActivate: [AppGuardAdmin], component: EntitiesAdministrationComponent },
            { path: 'administration/statuses', canActivate: [AppGuardAdmin], component: StatusesAdministrationComponent },
            { path: 'administration/statuses/new', canActivate: [AppGuardAdmin], component: StatusAdministrationComponent },
            { path: 'administration/statuses/:identifier', canActivate: [AppGuardAdmin], component: StatusAdministrationComponent },
            { path: 'administration/parameters', canActivate: [AppGuardAdmin], component: ParametersAdministrationComponent },
            { path: 'administration/parameters/new', canActivate: [AppGuardAdmin], component: ParameterAdministrationComponent },
            { path: 'administration/parameters/:id', canActivate: [AppGuardAdmin], component: ParameterAdministrationComponent },
            { path: 'administration/priorities', canActivate: [AppGuardAdmin], component: PrioritiesAdministrationComponent },
            { path: 'administration/priorities/new', canActivate: [AppGuardAdmin], component: PriorityAdministrationComponent },
            { path: 'administration/priorities/:id', canActivate: [AppGuardAdmin], component: PriorityAdministrationComponent },
            { path: 'administration/actions', canActivate: [AppGuardAdmin], component: ActionsAdministrationComponent },
            { path: 'administration/actions/new', canActivate: [AppGuardAdmin], component: ActionAdministrationComponent },
            { path: 'administration/actions/:id', canActivate: [AppGuardAdmin], component: ActionAdministrationComponent },
            { path: 'administration/notifications', canActivate: [AppGuardAdmin], component: NotificationsAdministrationComponent },
            { path: 'administration/notifications/new', canActivate: [AppGuardAdmin], component: NotificationAdministrationComponent },
            { path: 'administration/notifications/:identifier', canActivate: [AppGuardAdmin], component: NotificationAdministrationComponent },
            { path: 'administration/history', canActivate: [AppGuardAdmin], component: HistoryAdministrationComponent },
            { path: 'administration/history-batch', canActivate: [AppGuardAdmin], component: HistoryBatchAdministrationComponent },
            { path: 'administration/update-status', canActivate: [AppGuardAdmin], component: UpdateStatusAdministrationComponent },
            { path: 'administration/contacts', canActivate: [AppGuardAdmin], component: ContactsListAdministrationComponent },
            { path: 'administration/contacts/duplicates', canActivate: [AppGuardAdmin], component: ContactDuplicateComponent },
            { path: 'administration/contacts/list', redirectTo: 'contacts', pathMatch: 'full' },
            { path: 'administration/contacts/list/new', canActivate: [AppGuardAdmin], component: ContactsPageAdministrationComponent },
            { path: 'administration/contacts/list/:id', canActivate: [AppGuardAdmin], component: ContactsPageAdministrationComponent },
            { path: 'administration/contacts/contactsCustomFields', canActivate: [AppGuardAdmin], component: ContactsCustomFieldsAdministrationComponent },
            { path: 'administration/contacts/contacts-groups', canActivate: [AppGuardAdmin], component: ContactsGroupsAdministrationComponent },
            { path: 'administration/contacts/contacts-groups/new', canActivate: [AppGuardAdmin], component: ContactsGroupAdministrationComponent },
            { path: 'administration/contacts/contacts-groups/:id', canActivate: [AppGuardAdmin], component: ContactsGroupAdministrationComponent },
            { path: 'administration/contacts/contacts-parameters', canActivate: [AppGuardAdmin], component: ContactsParametersAdministrationComponent },
            { path: 'administration/versions-update', canActivate: [AppGuardAdmin], component: VersionsUpdateAdministrationComponent },
            { path: 'administration/docservers', canActivate: [AppGuardAdmin], component: DocserversAdministrationComponent },
            { path: 'administration/docservers/new', canActivate: [AppGuardAdmin], component: DocserverAdministrationComponent },
            { path: 'administration/templates', canActivate: [AppGuardAdmin], component: TemplatesAdministrationComponent },
            { path: 'administration/templates/new', canActivate: [AppGuardAdmin], component: TemplateAdministrationComponent },
            { path: 'administration/templates/:id', canActivate: [AppGuardAdmin], component: TemplateAdministrationComponent },
            { path: 'administration/securities', canActivate: [AppGuardAdmin], component: SecuritiesAdministrationComponent },
            { path: 'administration/sendmail', canActivate: [AppGuardAdmin], component: SendmailAdministrationComponent },
            { path: 'administration/organizationEmailSignatures', canActivate: [AppGuardAdmin], component: OrganizationEmailSignaturesAdministrationComponent },
            { path: 'administration/shippings', canActivate: [AppGuardAdmin], component: ShippingsAdministrationComponent },
            { path: 'administration/shippings/new', canActivate: [AppGuardAdmin], component: ShippingAdministrationComponent },
            { path: 'administration/shippings/:id', canActivate: [AppGuardAdmin], component: ShippingAdministrationComponent },
            { path: 'administration/customFields', canActivate: [AppGuardAdmin], component: CustomFieldsAdministrationComponent },
            { path: 'administration/indexingModels', canActivate: [AppGuardAdmin], component: IndexingModelsAdministrationComponent },
            { path: 'administration/indexingModels/new', canActivate: [AppGuardAdmin], component: IndexingModelAdministrationComponent },
            { path: 'administration/indexingModels/:id', canActivate: [AppGuardAdmin], component: IndexingModelAdministrationComponent },
            { path: 'administration/tags', canActivate: [AppGuardAdmin], component: TagsAdministrationComponent },
            { path: 'administration/tags/new', canActivate: [AppGuardAdmin], component: TagAdministrationComponent },
            { path: 'administration/tags/:id', canActivate: [AppGuardAdmin], component: TagAdministrationComponent },
            { path: 'administration/alfresco', canActivate: [AppGuardAdmin], component: AlfrescoListAdministrationComponent },
            { path: 'administration/alfresco/new', canActivate: [AppGuardAdmin], component: AlfrescoAdministrationComponent },
            { path: 'administration/alfresco/:id', canActivate: [AppGuardAdmin], component: AlfrescoAdministrationComponent },
            { path: 'administration/multigest', canActivate: [AppGuardAdmin], component: MultigestListAdministrationComponent },
            { path: 'administration/multigest/new', canActivate: [AppGuardAdmin], component: MultigestAdministrationComponent },
            { path: 'administration/multigest/:id', canActivate: [AppGuardAdmin], component: MultigestAdministrationComponent },
            { path: 'administration/registeredMails', canActivate: [AppGuardAdmin], component: RegisteredMailListComponent },
            { path: 'administration/registeredMails/new', canActivate: [AppGuardAdmin], component: RegisteredMailComponent },
            { path: 'administration/registeredMails/:id', canActivate: [AppGuardAdmin], component: RegisteredMailComponent },
            { path: 'administration/issuingSites', canActivate: [AppGuardAdmin], component: IssuingSiteListComponent },
            { path: 'administration/issuingSites/new', canActivate: [AppGuardAdmin], component: IssuingSiteComponent },
            { path: 'administration/issuingSites/:id', canActivate: [AppGuardAdmin], component: IssuingSiteComponent },
            { path: 'administration/search', canActivate: [AppGuardAdmin], component: SearchAdministrationComponent },
            { path: 'administration/connections/sso', canActivate: [AppGuardAdmin], component: SsoAdministrationComponent },
            { path: 'administration/attachments/types', canActivate: [AppGuardAdmin], component: AttachmentTypesAdministrationComponent },
            { path: 'administration/attachments/types/new', canActivate: [AppGuardAdmin], component: AttachmentTypeAdministrationComponent },
            { path: 'administration/attachments/types/:id', canActivate: [AppGuardAdmin], component: AttachmentTypeAdministrationComponent },
            { path: 'administration/attachments', redirectTo: 'attachments/types', pathMatch: 'full' },
            { path: 'administration/mercure', canActivate: [AppGuardAdmin], component: LadAdministrationComponent },
            { path: 'administration/mercure/contacts', canActivate: [AppGuardAdmin], component: LadContactsManagementComponent },
            { path: 'administration/mercure/webservice', canActivate: [AppGuardAdmin], component: MwsAdministrationComponent },
            { path: 'administration/mercure/webservice/listDocs', canActivate: [AppGuardAdmin], component: MwsListDocsComponent },
            { path: 'administration/mercure/webservice/monitoring', canActivate: [AppGuardAdmin], component: MwsMonitoringComponent },
        ]),
    ],
    exports: [
        RouterModule
    ]
})
export class AdministrationRoutingModule { }
