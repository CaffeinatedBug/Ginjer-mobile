import type { NavigatorScreenParams } from "@react-navigation/native";

export type TabParamList = {
  Devices: undefined;
  Locations: { deviceId?: string } | undefined;
  Analytics: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Home: NavigatorScreenParams<TabParamList> | undefined;
  AddDevice: undefined;
  ProjectWorkspace: undefined;
  DeviceDetails: { deviceId: string };
  EditProfile: undefined;
  Notifications: undefined;
};
