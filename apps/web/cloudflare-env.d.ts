/// <reference types="@cloudflare/workers-types" />
/// <reference path="./cloudflare-bindings.d.ts" />

// OpenNext reserves IMAGES for ImagesBinding; this app uses that name for R2.
interface CloudflareEnv {
  DB: GachiaWorkerEnv['DB'];
  IMAGES: GachiaWorkerEnv['IMAGES'];
  ASSETS: GachiaWorkerEnv['ASSETS'];
}
