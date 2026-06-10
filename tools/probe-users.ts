import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  try {
    console.log("[1] count:", await db.user.count());
  } catch (e) { console.error("[1] FAIL:", e); }
  try {
    console.log("[2] findMany simple:", (await db.user.findMany()).length, "rows");
  } catch (e) { console.error("[2] FAIL:", e); }
  try {
    const r = await db.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });
    console.log("[3] findMany w/ order:", r.length, "rows");
  } catch (e) { console.error("[3] FAIL:", e); }
  try {
    const r = await db.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      include: { _count: { select: { ownerships: true } } },
    });
    console.log("[4] findMany w/ _count:", r);
  } catch (e) { console.error("[4] FAIL:", e); }
  process.exit(0);
}
main();
