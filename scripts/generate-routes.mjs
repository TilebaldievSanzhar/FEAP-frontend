// Regenerate src/routeTree.gen.ts without starting Vite (CI / pre-typecheck).
// Same options as the TanStackRouterVite plugin in vite.config.ts.
import { Generator, getConfig } from "@tanstack/router-generator";

const root = process.cwd();
const config = getConfig(
  { routesDirectory: "./src/routes", generatedRouteTree: "./src/routeTree.gen.ts" },
  root,
);
const generator = new Generator({ config, root });
await generator.run();
console.log("routeTree.gen.ts updated");
