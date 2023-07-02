/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { PasteLanguage } from './PasteLanguage';

export type UpdatePasteModel = {
    expires_in_hours?: number;
    access_code?: string;
    language?: PasteLanguage;
};

