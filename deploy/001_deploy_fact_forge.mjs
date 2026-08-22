import { existsSync } from "node:fs";
if (!existsSync("contracts/fact_forge.py")) throw new Error("Missing contract source");
console.log("genlayer deploy --contract contracts/fact_forge.py");
