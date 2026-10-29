let pending: Promise<void> = Promise.resolve();

export function queueWorkspaceWrite(
  action: () => Promise<void>,
): Promise<void> {
  const next = pending.catch(() => {}).then(action);
  pending = next;
  return next;
}

export function waitForWorkspaceWrites(): Promise<void> {
  return pending.catch(() => {});
}
