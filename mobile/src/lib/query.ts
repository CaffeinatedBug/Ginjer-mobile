import {QueryClient} from '@tanstack/react-query';
import {ApiError} from './errors';
export const queryClient=new QueryClient({defaultOptions:{queries:{staleTime:15_000,gcTime:300_000,retry:(count,error)=>count<2&&error instanceof ApiError&&(error.kind==='network'||error.kind==='server'),retryDelay:n=>Math.min(1000*2**n,10000),refetchOnReconnect:true,refetchOnWindowFocus:true},mutations:{retry:false}}});
