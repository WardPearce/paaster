/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PasteCreatedModel } from '../models/PasteCreatedModel';
import type { PasteModel } from '../models/PasteModel';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class DefaultService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * @param iv
     * @returns PasteCreatedModel Document created, URL follows
     * @throws ApiError
     */
    public controllerPasteCreatePaste(
        iv: string,
    ): CancelablePromise<PasteCreatedModel> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/controller/paste/{iv}',
            path: {
                'iv': iv,
            },
            errors: {
                400: `Bad request syntax or unsupported method`,
            },
        });
    }

    /**
     * @param pasteId
     * @returns PasteModel Request fulfilled, document follows
     * @throws ApiError
     */
    public controllerPasteGetPaste(
        pasteId: string,
    ): CancelablePromise<PasteModel> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/controller/paste/{paste_id}',
            path: {
                'paste_id': pasteId,
            },
            errors: {
                400: `Bad request syntax or unsupported method`,
            },
        });
    }

}
