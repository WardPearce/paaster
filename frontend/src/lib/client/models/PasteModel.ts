/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { PasteLanguage } from './PasteLanguage';

export type PasteModel = {
    expires_in_hours?: (null | number);
    access_code?: (null | string);
    language?: (null | PasteLanguage);
    id: string;
    iv: string;
    created: any;
    download_url: string;
};

