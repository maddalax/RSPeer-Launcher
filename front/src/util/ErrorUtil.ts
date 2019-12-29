export function isApiError(err : any) {
   return err && err.type === 'rspeer_api_error';
}