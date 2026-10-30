import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {sessionSchema,type Session} from './contracts';
import {queryClient} from './query';
import {configureAuth} from './graphql';
const KEY='ginjer.session';
export const useSession=create<{session:Session|null;ready:boolean;message:string}>(()=>({session:null,ready:false,message:''}));
let generation=0;
export async function hydrateSession(){const current=generation;try{const raw=await SecureStore.getItemAsync(KEY);const parsed=raw?sessionSchema.safeParse(JSON.parse(raw)):null;if(current===generation)useSession.setState({session:parsed?.success?parsed.data:null,ready:true});}catch{if(current===generation)useSession.setState({session:null,ready:true,message:'Saved session could not be restored.'});}}
export async function establishSession(session:Session){await SecureStore.setItemAsync(KEY,JSON.stringify(session));generation++;useSession.setState({session,ready:true,message:''});}
let loggingOut:Promise<void>|null=null;
export function logout(message=''){if(loggingOut)return loggingOut;generation++;useSession.setState({session:null,ready:true,message});loggingOut=(async()=>{await queryClient.cancelQueries();queryClient.clear();await SecureStore.deleteItemAsync(KEY);const keys=await AsyncStorage.getAllKeys();await AsyncStorage.multiRemove(keys.filter(k=>k.startsWith('ginjer.')&&!k.startsWith('ginjer.downlink.')));})().finally(()=>{loggingOut=null});return loggingOut;}
configureAuth(()=>useSession.getState().session?.token,()=>{void logout('Your session has expired. Sign in again.');});
