import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { queryClient } from "./query";
import { useSession } from "./session";
import { queueWorkspaceWrite } from "./workspaceWrite";
export const useWorkspace = create<{
  orgId: string;
  projectId: string;
  orgName: string;
  projectName: string;
}>(() => ({ orgId: "", projectId: "", orgName: "", projectName: "" }));
let selectionVersion = 0;
const empty = { orgId: "", projectId: "", orgName: "", projectName: "" };
async function restoreWorkspace(userId: string, defaultOrg: string) {
  const version = ++selectionVersion;
  useWorkspace.setState({ ...empty, orgId: defaultOrg });
  try {
    const raw = await AsyncStorage.getItem(`ginjer.workspace.${userId}`);
    if (
      version !== selectionVersion ||
      useSession.getState().session?._id !== userId ||
      !raw
    )
      return;
    const saved: unknown = JSON.parse(raw);
    if (typeof saved === "object" && saved !== null) {
      const state = saved as Record<string, unknown>;
      if (
        typeof state.orgId === "string" &&
        typeof state.projectId === "string" &&
        typeof state.orgName === "string" &&
        typeof state.projectName === "string"
      ) {
        useWorkspace.setState({
          orgId: state.orgId || defaultOrg,
          projectId: state.projectId,
          orgName: state.orgName,
          projectName: state.projectName,
        });
      }
    }
  } catch {
    /* Keep the account default if local non-secret selection cannot be restored. */
  }
}
export async function selectWorkspace(
  orgId: string,
  projectId: string,
  orgName = "",
  projectName = "",
) {
  const userId = useSession.getState().session?._id;
  if (!userId) return;
  const version = ++selectionVersion;
  const task = queueWorkspaceWrite(async () => {
    if (
      version !== selectionVersion ||
      useSession.getState().session?._id !== userId
    )
      return;
    await queryClient.cancelQueries({
      predicate: (q) => q.queryKey[0] !== "organisations",
    });
    if (
      version !== selectionVersion ||
      useSession.getState().session?._id !== userId
    )
      return;
    await AsyncStorage.setItem(
      `ginjer.workspace.${userId}`,
      JSON.stringify({ orgId, projectId, orgName, projectName }),
    );
    if (
      version === selectionVersion &&
      useSession.getState().session?._id === userId
    )
      useWorkspace.setState({ orgId, projectId, orgName, projectName });
  });
  await task;
}
useSession.subscribe((state, previous) => {
  if (state.session?._id !== previous.session?._id) {
    if (state.session)
      void restoreWorkspace(
        state.session._id,
        state.session.defaultAccount || state.session.organisationId || "",
      );
    else {
      selectionVersion++;
      useWorkspace.setState(empty);
    }
  }
});
