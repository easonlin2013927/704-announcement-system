import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
export async function hash(password) {
 const salt = randomBytes(16).toString("hex");
 const key = await derive(password, salt, 64);
 return salt + ":" + key.toString("hex");
}
export async function verify(password, stored) {
 const [salt, hex] = stored.split(":");
 const expected = Buffer.from(hex, "hex");
 const actual = await derive(password, salt, 64);
 return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export const digest = token => createHash("sha256").update(token).digest("hex");
