import { serve } from "https://deno.land/x/esbuild_serve@1.4.1/mod.ts";

serve({
    pages: {
        "index": "index.ts"
    }
});