import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Config } from "@react-router/dev/config";

const staticFiles = ["robots.txt", "sitemap.txt"];

export default {
    appDirectory: "src",
    ssr: false,
    buildDirectory: "public",

    async buildEnd({ reactRouterConfig }) {
        const clientDirectory = join(reactRouterConfig.buildDirectory, "client");

        await mkdir(clientDirectory, { recursive: true });

        await Promise.all(
            staticFiles.map((fileName) =>
                copyFile(join(process.cwd(), "static", fileName), join(clientDirectory, fileName))
            )
        );
    }
} satisfies Config;
