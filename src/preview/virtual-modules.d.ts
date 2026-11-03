declare module "virtual:preview-vendor" {
  const vendor: { script: string; css: string };
  export default vendor;
}

declare module "virtual:library-types" {
  const declarations: { filePath: string; content: string }[];
  export default declarations;
}
