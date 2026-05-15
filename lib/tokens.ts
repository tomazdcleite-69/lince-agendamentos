export function generatePublicToken() {
  return crypto.randomUUID().replaceAll("-", "");
}
