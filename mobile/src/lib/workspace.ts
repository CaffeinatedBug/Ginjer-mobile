import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {queryClient} from './query';
import {useSession} from './session';
export const useWorkspace=create<{orgId:string;projectId:string;orgName:string;projectName:string}>(()=>({orgId:'',projectId:'',orgName:'',projectName:''}));
export async function selectWorkspace(orgId:string,projectId:string,orgName='',projectName=''){
 const userId=useSession.getState().session?._id;if(!userId)return;
 useWorkspace.setState({orgId,projectId,orgName,projectName});
 await queryClient.cancelQueries({predicate:q=>q.queryKey[0]!=='organisations'});
 await AsyncStorage.setItem(`ginjer.workspace.${userId}`,JSON.stringify({orgId,projectId,orgName,projectName}));
}
useSession.subscribe((state,previous)=>{if(state.session?._id!==previous.session?._id)useWorkspace.setState({orgId:state.session?.defaultAccount||state.session?.organisationId||'',projectId:'',orgName:'',projectName:''});});
