import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { useNetInfo } from "@react-native-community/netinfo";
import { useFonts } from "expo-font";
import { Roboto_400Regular } from "@expo-google-fonts/roboto/400Regular";
import { Roboto_700Bold } from "@expo-google-fonts/roboto/700Bold";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { queryClient } from "./src/lib/query";
import { hydrateSession, useSession } from "./src/lib/session";
import { theme } from "./src/lib/theme";
import { useWorkspace } from "./src/lib/workspace";
import { Button, Icon, Screen } from "./src/shared";
import { LoginScreen, SignUpScreen } from "./src/features/auth";
import { ProfileScreen, EditProfileScreen } from "./src/features/profile";
import { DevicesScreen } from "./src/features/devices/DevicesScreen";
import { DeviceDetailsScreen } from "./src/features/devices/DeviceDetailsScreen";
import { AddDeviceScreen } from "./src/features/devices/AddDeviceScreen";
import { LocationsScreen } from "./src/features/locations";
import { AnalyticsScreen } from "./src/features/analytics";
import {
  NotificationsScreen,
  NotificationPanel,
} from "./src/features/notifications";
import { OrganisationSheet } from "./src/features/organisations/OrganisationSheet";
import { ProjectSheet } from "./src/features/projects/ProjectSheet";
import { ProjectWorkspaceScreen } from "./src/features/projects/ProjectWorkspaceScreen";
import { EventBanner } from "./src/features/notifications/EventBanner";
import type { RootStackParamList, TabParamList } from "./src/navigation/types";

void SplashScreen.preventAutoHideAsync().catch(() => {});
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

function OfflineBanner() {
  const { isConnected } = useNetInfo();
  if (isConnected !== false) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: theme.error, padding: 8 }}
    >
      <Text
        style={{
          color: "#FFFFFF",
          fontFamily: theme.bold,
          textAlign: "center",
        }}
      >
        Offline. Showing the latest available data.
      </Text>
    </View>
  );
}

function HomeTabs({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Home">) {
  const [sheet, setSheet] = useState<
    "organisation" | "project" | "notifications" | null
  >(null);
  const [advanceAfterOrg, setAdvanceAfterOrg] = useState(false);
  const orgId = useWorkspace((s) => s.orgId);
  return (
    <>
      <Tabs.Navigator
        backBehavior="none"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.accessibleGreen,
          tabBarInactiveTintColor: theme.secondary,
          tabBarLabelStyle: {
            fontFamily: theme.font,
            fontSize: 11,
            marginBottom: 3,
          },
          tabBarStyle: {
            height: 64,
            paddingTop: 5,
            backgroundColor: theme.surface,
          },
          tabBarIcon: ({ color }) => (
            <Icon
              name={
                {
                  Devices: "devices",
                  Locations: "map",
                  Analytics: "chart",
                  Profile: "user",
                }[route.name]
              }
              color={color}
            />
          ),
        })}
      >
        <Tabs.Screen name="Devices">
          {() => (
            <DevicesScreen
              onSelectDevice={(deviceId) =>
                navigation.navigate("DeviceDetails", { deviceId })
              }
              onNotifications={() => setSheet("notifications")}
              onSelectWorkspace={() => {
                setAdvanceAfterOrg(!orgId);
                setSheet(orgId ? "project" : "organisation");
              }}
              onAddDevice={() => navigation.navigate("AddDevice")}
            />
          )}
        </Tabs.Screen>
        <Tabs.Screen name="Locations" component={LocationsScreen} />
        <Tabs.Screen name="Analytics">
          {() => (
            <AnalyticsScreen
              onSelectDevice={(deviceId) =>
                navigation.navigate("DeviceDetails", { deviceId })
              }
            />
          )}
        </Tabs.Screen>
        <Tabs.Screen name="Profile">
          {() => (
            <ProfileScreen
              onOrganisations={() => {
                setAdvanceAfterOrg(false);
                setSheet("organisation");
              }}
              onProjects={() => setSheet("project")}
            />
          )}
        </Tabs.Screen>
      </Tabs.Navigator>
      {sheet === "organisation" && (
        <OrganisationSheet
          onClose={() =>
            setSheet(
              advanceAfterOrg && useWorkspace.getState().orgId
                ? "project"
                : null,
            )
          }
        />
      )}
      {sheet === "project" && (
        <ProjectSheet
          onClose={() => setSheet(null)}
          onOpenWorkspace={() => navigation.navigate("ProjectWorkspace")}
        />
      )}
      {sheet === "notifications" && (
        <NotificationPanel onClose={() => setSheet(null)} />
      )}
    </>
  );
}

function DeviceDetailsRoute({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, "DeviceDetails">) {
  return (
    <DeviceDetailsScreen
      deviceId={route.params.deviceId}
      onBack={() => navigation.goBack()}
      onViewMap={(deviceId) =>
        navigation.navigate("Home", {
          screen: "Locations",
          params: { deviceId },
        })
      }
    />
  );
}

function AddDeviceRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "AddDevice">) {
  return <AddDeviceScreen onBack={() => navigation.goBack()} />;
}

function ProjectWorkspaceRoute({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "ProjectWorkspace">) {
  return (
    <ProjectWorkspaceScreen
      onBack={() => navigation.goBack()}
      onDevices={() => navigation.navigate("Home", { screen: "Devices" })}
      onLocations={() => navigation.navigate("Home", { screen: "Locations" })}
      onNotifications={() => navigation.navigate("Notifications")}
    />
  );
}

function EditProfileRoute() {
  const [organisationOpen, setOrganisationOpen] = useState(false);
  return (
    <>
      <EditProfileScreen onOrganisations={() => setOrganisationOpen(true)} />
      {organisationOpen && (
        <OrganisationSheet onClose={() => setOrganisationOpen(false)} />
      )}
    </>
  );
}

function AppNavigator() {
  const session = useSession((s) => s.session);
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {session ? (
            <>
              <Stack.Screen name="Home" component={HomeTabs} />
              <Stack.Screen name="AddDevice" component={AddDeviceRoute} />
              <Stack.Screen
                name="ProjectWorkspace"
                component={ProjectWorkspaceRoute}
              />
              <Stack.Screen
                name="DeviceDetails"
                component={DeviceDetailsRoute}
              />
              <Stack.Screen name="EditProfile" component={EditProfileRoute} />
              <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
              />
            </>
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      {session && (
        <EventBanner
          onDevice={(deviceId) => {
            if (navigationRef.isReady())
              navigationRef.navigate("DeviceDetails", { deviceId });
          }}
          onNotifications={() => {
            if (navigationRef.isReady())
              navigationRef.navigate("Notifications");
          }}
        />
      )}
    </View>
  );
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <Screen style={{ justifyContent: "center", padding: 24, gap: 16 }}>
          <Text
            accessibilityRole="alert"
            style={{ color: theme.text, fontFamily: theme.bold, fontSize: 20 }}
          >
            Something went wrong
          </Text>
          <Text style={{ color: theme.secondary, fontFamily: theme.font }}>
            Try reopening this screen. Your account remains signed in.
          </Text>
          <Button
            title="Try again"
            onPress={() => this.setState({ failed: false })}
          />
        </Screen>
      );
    return this.props.children;
  }
}

function AppContent() {
  const ready = useSession((s) => s.ready);
  const [fontsLoaded, fontError] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
  });
  useEffect(() => {
    void hydrateSession();
  }, []);
  useEffect(() => {
    if (ready && (fontsLoaded || fontError))
      void SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontsLoaded, fontError]);
  if (!ready || (!fontsLoaded && !fontError)) return null;
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style="dark" />
      <OfflineBanner />
      <AppErrorBoundary>
        <AppNavigator />
      </AppErrorBoundary>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
