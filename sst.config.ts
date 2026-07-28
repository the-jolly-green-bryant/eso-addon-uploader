export default $config({
  app(input) {
    return {
      name: "eso-addon-uploader",
      home: "aws",
      providers: {
        cloudflare: true,
      },
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
    };
  },
  async run() {
    const site = new sst.aws.Nextjs("WayrestWorkshop", {
      domain: {
        name: "eso-addon-uploader.bryantjames.com",
        aliases: ["docs.eso-addon-uploader.bryantjames.com"],
        dns: sst.cloudflare.dns(),
      },
      environment: {
        BETHESDA_APP_KEY: process.env.BETHESDA_APP_KEY ?? "",
      },
    });

    return { url: site.url };
  },
});
