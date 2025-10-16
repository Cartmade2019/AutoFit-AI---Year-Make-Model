import type { GadgetSettings } from "gadget-server";

export const settings: GadgetSettings = {
  type: "gadget/settings/v1",
  frameworkVersion: "v1.4.0",
  plugins: {
    connections: {
      shopify: {
        apiVersion: "2025-07",
        enabledModels: [
          "shopifyApp",
          "shopifyAppInstallation",
          "shopifyAppSubscription",
          "shopifyAppUsageRecord",
          "shopifyCollection",
          "shopifyFile",
          "shopifyInventoryItem",
          "shopifyLocation",
          "shopifyProduct",
          "shopifyProductVariant",
          "shopifyProductVariantMedia",
          "shopifyTheme",
        ],
        type: "partner",
        scopes: [
          "read_inventory",
          "write_products",
          "read_locations",
          "read_themes",
        ],
      },
    },
  },
};
