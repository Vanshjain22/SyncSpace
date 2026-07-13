import path from "path";

// Register the @ alias at runtime for both tsx and compiled CommonJS output.
const moduleAlias = require("module-alias") as {
  addAlias: (alias: string, target: string) => void;
};

moduleAlias.addAlias("@", path.resolve(__dirname));
