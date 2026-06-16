// firebase-admin 13+ needs Web APIs (Node 18+). Polyfill for Node 16.
if (typeof globalThis.Headers === 'undefined') {
    const { fetch, Headers, Request, Response, FormData } = require('undici')
    const { Blob } = require('buffer')
    const {
        ReadableStream,
        WritableStream,
        TransformStream,
    } = require('stream/web')

    globalThis.fetch = fetch
    globalThis.Headers = Headers
    globalThis.Request = Request
    globalThis.Response = Response
    globalThis.FormData = FormData
    globalThis.Blob = Blob
    globalThis.ReadableStream = ReadableStream
    globalThis.WritableStream = WritableStream
    globalThis.TransformStream = TransformStream
}
