export function getUserId(): string {
  const id = process.env.USER_ID;
  if (!id) throw new Error("USER_ID env var not set");
  return id;
}

// Your Asana user GID — used to find tasks assigned to you (Today strip, EoD).
export const ASANA_OWNER_GID = process.env.ASANA_OWNER_GID ?? "1212972818193396";
