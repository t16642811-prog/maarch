export interface BinaryFile {
    contentMode: 'route' | 'base64';
    format: string;
    name: string;
    content?: string;
    base64src?: string;
    src?: ArrayBuffer;
    type: string;
}