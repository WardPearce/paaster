/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { PasteLanguage } from './PasteLanguage';

export type PasteModel = {
    expires_in_hours?: number;
    access_code?: string;
    language?: PasteLanguage;
    _id: string;
    iv: string;
    created: string;
    download_url: string;
};

