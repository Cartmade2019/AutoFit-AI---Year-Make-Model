import type { GadgetPermissions } from "gadget-server";

/**
 * This metadata describes the access control configuration available in your application.
 * Grants that are not defined here are set to false by default.
 *
 * View and edit your roles and permissions in the Gadget editor at https://cm-ymm.gadget.app/edit/settings/permissions
 */
export const permissions: GadgetPermissions = {
  type: "gadget/permissions/v1",
  roles: {
    "shopify-app-users": {
      storageKey: "Role-Shopify-App",
      default: {
        read: true,
      },
      models: {
        session: {
          read: true,
        },
        shopifyApp: {
          read: true,
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyAppInstallation: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyAppInstallation.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyAppSubscription: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyAppSubscription.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyAppUsageRecord: {
          read: true,
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyAsset: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyAsset.gelly",
          },
          actions: {
            create: true,
          },
        },
        shopifyCollection: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyCollection.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyFile: {
          read: {
            filter: "accessControl/filters/shopify/shopifyFile.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyGdprRequest: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyGdprRequest.gelly",
          },
          actions: {
            create: true,
            update: true,
          },
        },
        shopifyInventoryItem: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyInventoryItem.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyLocation: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyLocation.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyProduct: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyProduct.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyProductVariant: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyProductVariant.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyProductVariantMedia: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyProductVariantMedia.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        shopifyShop: {
          read: {
            filter: "accessControl/filters/shopify/shopifyShop.gelly",
          },
          actions: {
            install: true,
            reinstall: true,
            uninstall: true,
            update: true,
          },
        },
        shopifySync: {
          read: {
            filter: "accessControl/filters/shopify/shopifySync.gelly",
          },
          actions: {
            abort: true,
            complete: true,
            error: true,
            run: true,
          },
        },
        shopifyTheme: {
          read: {
            filter:
              "accessControl/filters/shopify/shopifyTheme.gelly",
          },
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
        WidgetImage: {
          read: true,
          actions: {
            create: true,
            delete: true,
            update: true,
          },
        },
      },
      actions: {
        bulkRemoveProductTags: true,
        bulkUpdateProductTags: true,
        checkAppEmbed: true,
        fileImport: true,
        getActiveSubscription: true,
        getThemeStatus: true,
        manageBillingSubscription: true,
        scheduledShopifySync: true,
        syncVariantToSupabase: true,
        writeToShopify: true,
      },
    },
    unauthenticated: {
      storageKey: "unauthenticated",
      actions: {
        getActiveSubscription: true,
      },
    },
  },
};
