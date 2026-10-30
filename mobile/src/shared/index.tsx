import React from 'react';
import {Text,View,Pressable,TextInput,StyleSheet,type TextInputProps} from 'react-native';
import {theme} from '../lib/theme';
export function Screen({children}:{children:React.ReactNode}){return <View style={styles.screen}>{children}</View>}
export function Button({title,onPress,disabled=false}:{title:string;onPress:()=>void;disabled?:boolean}){return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[styles.button,disabled&&{opacity:.5}]}><Text style={styles.label}>{title}</Text></Pressable>}
export function Field({label,error,...props}:TextInputProps&{label:string;error?:string}){return <View><Text>{label}</Text><TextInput {...props} accessibilityLabel={label} style={styles.field}/>{error&&<Text accessibilityRole="alert">{error}</Text>}</View>}
export function Header({title}:{title:string}){return <Text accessibilityRole="header" style={styles.title}>{title}</Text>}
export function EmptyState({title,body}:{title:string;body?:string}){return <View style={styles.empty}><Header title={title}/><Text>{body}</Text></View>}
export function Skeleton(){return <View accessibilityLabel="Loading" style={styles.skeleton}/>}
export function Snackbar({message}:{message:string}){return <Text accessibilityLiveRegion="polite">{message}</Text>}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:theme.background},button:{minHeight:48,padding:12,borderRadius:8,backgroundColor:theme.green,alignItems:'center',justifyContent:'center'},label:{color:theme.text},field:{minHeight:52,borderWidth:1,borderColor:theme.secondary,borderRadius:8,padding:12},title:{fontSize:20,fontWeight:'700',color:theme.text},empty:{padding:24,gap:12,alignItems:'center'},skeleton:{height:96,margin:12,borderRadius:8,backgroundColor:theme.canvas}});
