export interface ListPropertiesInterface {
    'id': number;
    'groupId': number;
    'targetId': number;
    'page': string;
    'pageSize': number;
    'order': string;
    'orderDir': string;
    'search': string;
    'delayed': boolean;
    'categories': string[];
    'priorities': string[];
    'entities': string[];
    'subEntities': string[];
    'statuses': string[];
    'doctypes': string[];
    'folders': string[];
}