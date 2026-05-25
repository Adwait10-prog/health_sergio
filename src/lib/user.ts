export function getUserId(): string {
  const id = process.env.USER_ID;
  if (!id) throw new Error("USER_ID env var not set");
  return id;
}
