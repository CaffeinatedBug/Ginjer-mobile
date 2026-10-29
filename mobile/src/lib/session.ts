import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { sessionSchema, type Session, type User } from "./contracts";
import { queryClient } from "./query";
import { configureAuth } from "./graphql";
import { resetEventMemory } from "../features/notifications/store";
import { waitForWorkspaceWrites } from "./workspaceWrite";
const KEY = "ginjer.session";
export const useSession = create<{
  session: Session | null;
  ready: boolean;
  message: string;
}>(() => ({ session: null, ready: false, message: "" }));
let generation = 0;
export async function hydrateSession() {
  const current = generation;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    const parsed = raw ? sessionSchema.safeParse(JSON.parse(raw)) : null;
    if (current === generation)
      useSession.setState({
        session: parsed?.success ? parsed.data : null,
        ready: true,
      });
  } catch {
    if (current === generation)
      useSession.setState({
        session: null,
        ready: true,
        message: "Saved session could not be restored.",
      });
  }
}
export function sessionVersion() {
  return generation;
}
export async function establishSession(
  session: Session,
  expectedVersion = generation,
) {
  if (loggingOut) await loggingOut;
  if (expectedVersion !== generation)
    throw new Error("Session changed. Sign in again.");
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
  if (expectedVersion !== generation) {
    await SecureStore.deleteItemAsync(KEY);
    throw new Error("Session changed. Sign in again.");
  }
  generation++;
  useSession.setState({ session, ready: true, message: "" });
}
export async function updateSession(user: User, expectedToken: string) {
  const current = useSession.getState().session;
  if (!current || current.token !== expectedToken)
    throw new Error("Session changed. Sign in again.");
  await establishSession({ ...current, ...user }, generation);
}

let loggingOut: Promise<void> | null = null;
export function logout(message = "") {
  if (loggingOut) return loggingOut;
  generation++;
  useSession.setState({ session: null, ready: true, message });
  loggingOut = (async () => {
    await resetEventMemory();
    await queryClient.cancelQueries();
    await waitForWorkspaceWrites();
    queryClient.clear();
    await SecureStore.deleteItemAsync(KEY);
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(
      keys.filter(
        (k) => k.startsWith("ginjer.") && !k.startsWith("ginjer.downlink."),
      ),
    );
  })().finally(() => {
    loggingOut = null;
  });
  return loggingOut;
}
configureAuth(
  () => useSession.getState().session?.token,
  () => {
    void logout("Your session has expired. Sign in again.");
  },
);
