import * as JD from "decoders"
import { Tokens } from "./UrlToken"

// Base type to describe an API endpoint
type Api<
  M extends Method,
  Route extends string,
  UrlParams extends UrlRecord<Route>,
  RequestBody,
  Response,
> = {
  method: M
  route: Route
  urlDecoder: JD.Decoder<UrlParams>
  bodyDecoder: JD.Decoder<RequestBody>
  responseDecoder: (status: number) => JD.Decoder<Response>
}

// Public API types
export type GetApi<
  Route extends string,
  UrlParams extends UrlRecord<Route>,
  ErrorCode,
  Payload,
> = Api<"GET", Route, UrlParams, never, ResponseJson<ErrorCode, Payload>>

export type DeleteApi<
  Route extends string,
  UrlParams extends UrlRecord<Route>,
  ErrorCode,
  Payload,
> = Api<"DELETE", Route, UrlParams, never, ResponseJson<ErrorCode, Payload>>

export type PostApi<
  Route extends string,
  UrlParams extends UrlRecord<Route>,
  RequestBody,
  ErrorCode,
  Payload,
> = Api<"POST", Route, UrlParams, RequestBody, ResponseJson<ErrorCode, Payload>>

export type PutApi<
  Route extends string,
  UrlParams extends UrlRecord<Route>,
  RequestBody,
  ErrorCode,
  Payload,
> = Api<"PUT", Route, UrlParams, RequestBody, ResponseJson<ErrorCode, Payload>>

export type PatchApi<
  Route extends string,
  UrlParams extends UrlRecord<Route>,
  RequestBody,
  ErrorCode,
  Payload,
> = Api<
  "PATCH",
  Route,
  UrlParams,
  RequestBody,
  ResponseJson<ErrorCode, Payload>
>

// Auth APIs requires a request header "authorization: Bearer <JWT-Token>"
// and returns AuthResponseJson
export type AuthGetApi<
  Route extends string,
  UrlParams extends UrlRecord<Route>,
  ErrorCode,
  Payload,
> = Api<"GET", Route, UrlParams, never, AuthResponseJson<ErrorCode, Payload>>

export type AuthDeleteApi<
  Route extends string,
  UrlParams extends UrlRecord<Route>,
  ErrorCode,
  Payload,
> = Api<"DELETE", Route, UrlParams, never, AuthResponseJson<ErrorCode, Payload>>

export type AuthPostApi<
  Route extends string,
  UrlParams extends UrlRecord<Route>,
  RequestBody,
  ErrorCode,
  Payload,
> = Api<
  "POST",
  Route,
  UrlParams,
  RequestBody,
  AuthResponseJson<ErrorCode, Payload>
>

export type AuthPutApi<
  Route extends string,
  UrlParams extends UrlRecord<Route>,
  RequestBody,
  ErrorCode,
  Payload,
> = Api<
  "PUT",
  Route,
  UrlParams,
  RequestBody,
  AuthResponseJson<ErrorCode, Payload>
>

export type AuthPatchApi<
  Route extends string,
  UrlParams extends UrlRecord<Route>,
  RequestBody,
  ErrorCode,
  Payload,
> = Api<
  "PATCH",
  Route,
  UrlParams,
  RequestBody,
  AuthResponseJson<ErrorCode, Payload>
>

// Stream APIs do not decode
// Auth Stream APIs requires a request header "authorization: Bearer <JWT-Token>"
export type AuthStreamApi<
  Route extends string,
  UrlParams extends UrlRecord<Route>,
  ErrorCode,
  Payload,
> = Api<"GET", Route, UrlParams, never, AuthResponseJson<ErrorCode, Payload>>

export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
export type UrlRecord<R extends string> = Record<
  Tokens<R>,
  string | number | Array<string> | Array<number>
>

export type Ok200<D> = { _t: "Ok"; data: D }
export type Err400<E> = { _t: "Err"; code: E }
export type InternalErr500 = { _t: "ServerError"; errorID: string }
export type ResponseJson<E, D> = Ok200<D> | Err400<E> | InternalErr500

export type AuthErr400<E> = {
  _t: "Err"
  code: E | "UNAUTHORISED"
}
export type AuthResponseJson<E, D> = Ok200<D> | AuthErr400<E> | InternalErr500

export type AdminErr400<E> = { _t: "Err"; code: E | "UNAUTHORISED" }
export type AdminResponseJson<E, D> = Ok200<D> | AdminErr400<E> | InternalErr500

export function responseDecoder<E, T>(
  errorDecoder: JD.Decoder<E>,
  dataDecoder: JD.Decoder<T>,
) {
  return function (status: number): JD.Decoder<ResponseJson<E, T>> {
    switch (status) {
      case 200:
        return ok200Decoder(dataDecoder)
      case 400:
        return err400Decoder(errorDecoder)
      case 500:
        return internalErr500Decoder()
      default:
        throw new Error("Invalid status number: `${status}`")
    }
  }
}

export function authResponseDecoder<E, T>(
  errorDecoder: JD.Decoder<E>,
  dataDecoder: JD.Decoder<T>,
) {
  return function (status: number): JD.Decoder<AuthResponseJson<E, T>> {
    switch (status) {
      case 200:
        return ok200Decoder(dataDecoder)
      case 400:
        return authErr400Decoder(errorDecoder)
      case 500:
        return internalErr500Decoder()
      default:
        throw new Error("Invalid status number: `${status}`")
    }
  }
}

export function ok200Decoder<D>(
  dataDecoder: JD.Decoder<D>,
): JD.Decoder<Ok200<D>> {
  return JD.object({
    _t: JD.constant("Ok"),
    data: JD.unknown, // Issue here https://github.com/nvie/decoders/issues/930
  }).transform(({ _t, data }) => ({ _t, data: dataDecoder.verify(data) }))
}

export function err400Decoder<E>(
  errorDecoder: JD.Decoder<E>,
): JD.Decoder<Err400<E>> {
  return JD.object({
    _t: JD.constant("Err"),
    code: JD.unknown, // Issue here https://github.com/nvie/decoders/issues/930
  }).transform(({ _t, code }) => ({ _t, code: errorDecoder.verify(code) }))
}

export function authErr400Decoder<E>(
  errorDecoder: JD.Decoder<E>,
): JD.Decoder<AuthErr400<E>> {
  return JD.object({
    _t: JD.constant("Err"),
    code: JD.unknown, // Issue here https://github.com/nvie/decoders/issues/930
  }).transform(({ _t, code }) => ({
    _t,
    code: JD.either(JD.constant("UNAUTHORISED"), errorDecoder).verify(code),
  }))
}

export function adminErr400Decoder<E>(
  errorDecoder: JD.Decoder<E>,
): JD.Decoder<AdminErr400<E>> {
  return JD.object({
    _t: JD.constant("Err"),
    code: JD.unknown, // Issue here https://github.com/nvie/decoders/issues/930
  }).transform(({ _t, code }) => ({
    _t,
    code: JD.either(JD.constant("UNAUTHORISED"), errorDecoder).verify(code),
  }))
}

export function internalErr500Decoder(): JD.Decoder<InternalErr500> {
  return JD.object({
    _t: JD.constant("ServerError"),
    errorID: JD.string,
  })
}

// Convenience

export type NoUrlParams = Record<string, never>
export type NoBodyParams = Record<string, never>

export const noUrlParamsDecoder = JD.never("_")
export const noBodyParamsDecoder = JD.never("_")
