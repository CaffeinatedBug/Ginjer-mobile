import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {QueryClientProvider} from '@tanstack/react-query';
import {queryClient} from './src/lib/query';
import {Screen,Header} from './src/shared';
import type {RootStackParamList} from './src/navigation/types';
const Stack=createNativeStackNavigator<RootStackParamList>();
function Placeholder(){return <Screen><Header title="Ginjer"/></Screen>}
export default function App(){return <SafeAreaProvider><QueryClientProvider client={queryClient}><NavigationContainer><Stack.Navigator><Stack.Screen name="Login" component={Placeholder}/></Stack.Navigator></NavigationContainer></QueryClientProvider></SafeAreaProvider>}
