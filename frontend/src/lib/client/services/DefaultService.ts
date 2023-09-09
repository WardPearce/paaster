/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PasteCreatedModel } from '../models/PasteCreatedModel';
import type { PasteModel } from '../models/PasteModel';
import type { UpdatePasteModel } from '../models/UpdatePasteModel';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class DefaultService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * CreatePaste
     * @param iv
     * @returns PasteCreatedModel Document created, URL follows
     * @throws ApiError
     */
    public controllerPasteIvCreatePaste(
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
     * GetPaste
     * @param pasteId
     * @param accessCode
     * @returns PasteModel Request fulfilled, document follows
     * @throws ApiError
     */
    public controllerPastePasteIdGetPaste(
        pasteId: string,
        accessCode?: (null | string),
    ): CancelablePromise<PasteModel> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/controller/paste/{paste_id}',
            path: {
                'paste_id': pasteId,
            },
            query: {
                'access_code': accessCode,
            },
            errors: {
                400: `Bad request syntax or unsupported method`,
            },
        });
    }

    /**
     * UpdatePaste
     * @param pasteId
     * @param ownerSecret
     * @param requestBody
     * @returns any Document created, URL follows
     * @throws ApiError
     */
    public controllerPastePasteIdOwnerSecretUpdatePaste(
        pasteId: string,
        ownerSecret: string,
        requestBody: UpdatePasteModel,
    ): CancelablePromise<any> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/controller/paste/{paste_id}/{owner_secret}',
            path: {
                'paste_id': pasteId,
                'owner_secret': ownerSecret,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request syntax or unsupported method`,
            },
        });
    }

    /**
     * DeletePaste
     * @param pasteId
     * @param ownerSecret
     * @returns void
     * @throws ApiError
     */
    public controllerPastePasteIdOwnerSecretDeletePaste(
        pasteId: string,
        ownerSecret: string,
    ): CancelablePromise<void> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/controller/paste/{paste_id}/{owner_secret}',
            path: {
                'paste_id': pasteId,
                'owner_secret': ownerSecret,
            },
            errors: {
                400: `Bad request syntax or unsupported method`,
            },
        });
    }

}
