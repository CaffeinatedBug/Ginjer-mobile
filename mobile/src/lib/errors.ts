export type ErrorKind='auth'|'network'|'validation'|'server'|'uncertain';
export class ApiError extends Error{constructor(message:string,public kind:ErrorKind){super(message);this.name='ApiError';}}
