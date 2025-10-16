import { applyParams, save, ActionOptions } from "gadget-server";
import { supabase } from "../../../../web/supabase/supabaseClient";

/**
 * @param {import("gadget-server").ActionContext} context
 */
export const run: ActionRun = async ({ params, record }) => {
  applyParams(params, record);
  await save(record);
};

// Default settings constants for new store initialization
const DEFAULT_STORE_SETTINGS = {
  ui: { custom_js: "", custom_css: "" },
  behavior: { enable_analytics: false },
  notifications: { enable_email_notifications: false },
};

const DEFAULT_WIDGET_SETTINGS = [
  {
    widget_type: "fitment_widget",
    enabled: false,
    settings_json: {
      options: {
        first_view: 3,
        auto_submit: false,
        hide_submit_button: false,
        remember_selection: true,
        apply_across_collections: false,
        search_current_collection: true,
        display_all_fitment_fields: true,
      },
      appearance: {
        title: "Vehicle Selector",
        colors: {
          text_color: "#000000",
          border_color: "#CCCCCC",
          background_color: "#FFFFFF",
          primary_button_color: "#007BFF",
          secondary_button_color: "#6C757D",
          primary_button_text_color: "#FFFFFF",
          secondary_button_text_color: "#FFFFFF",
        },
        layout: "horizontal",
        subtitle: "Choose your vehicle to find matching parts",
        show_icons: true,
        show_title: true,
        clear_button: { icon: "close", show: true, label: "Reset" },
        show_subtitle: true,
        submit_button: { icon: "search", show: true, label: "Find Parts" },
        title_alignment: "center",
        subtitle_alignment: "center",
      },
      translations: {
        no_fit_message: "We couldn't find matching parts for your vehicle.",
        clear_button_text: "Reset",
        submit_button_text: "Find Parts",
      },
    },
  },
  {
    widget_type: "chat_bubble",
    enabled: false,
    settings_json: {
      options: {
        quick_questions: ["Return Policy?", "Can I return a wrong part?", "How do I order?"],
        chat_bubble_icon_url: "https://cdn-icons-png.flaticon.com/512/4712/4712027.png",
      },
      appearance: {
        heading: "Need Help With Fitment?",
        subheading: "Ask me anything about parts, compatibility, & more.",
        text_color: "#393838",
        send_button: { color: "#185ECD", label: "Send" },
        border_radius: "12px",
        bubble_heading: "Parts assistant",
        background_color: "#FFFFFF",
        input_background_color: "#FFFFFF",
        bubble_heading_text_color: "#ffffff",
        message_input_placeholder: "Type your question about car parts...",
        chat_bubble_background_color: "#185ECD",
        bubble_heading_background_color: "#185ECD",
      },
    },
  },
  {
    widget_type: "verify_fitment_widget",
    enabled: false,
    settings_json: {
      options: {
        first_view: 3,
        auto_submit: false,
        collapse_form: false,
        hide_submit_button: false,
        display_all_fitment_fields: true,
        collapse_form_open_by_default: false,
      },
      appearance: {
        title: "Select Your Vehicle",
        subtitle: "Check compatibility for this product",
        layout: "vertical",
        show_title: true,
        show_subtitle: true,
        title_alignment: "center",
        subtitle_alignment: "center",
        colors: {
          text_color: "#000000",
          border_color: "#CCCCCC",
          background_color: "#FFFFFF",
          primary_button_color: "#007BFF",
          secondary_button_color: "#F8F9FA",
          primary_button_text_color: "#FFFFFF",
          secondary_button_text_color: "#333333",
        },
        clear_button: { icon: "close", show: true, label: "Clear" },
        submit_button: { icon: "search", show: true, label: "Check Fitment" },
      },
      translations: {
        no_fit_message: "No compatible vehicles found.",
        failure_message: "This product does not fit your vehicle.",
        success_message: "Great! This product fits your vehicle.",
        change_selection: "Change Vehicle",
        clear_button_text: "Clear",
        submit_button_text: "Check Fitment",
      },
    },
  },
  {
    widget_type: "fitment_table",
    enabled: false,
    settings_json: {
      options: {
        sortable: true,
        pagination: true,
        searchable: false,
        show_title: true,
        default_sort: { order: "asc" },
        show_subtitle: true,
        items_per_page: 10,
        show_all_column: true,
        title_alignment: "center",
        subtitle_alignment: "center",
        expand_on_mobile: true,
        number_of_colums: 3,
        show_total_count: true,
      },
      appearance: {
        heading: "Compatible Vehicles",
        subheading: "This part fits the following vehicles:",
        text_color: "#1F2937",
        border_color: "#D1D5DB",
        striped_rows: true,
        border_radius: "6px",
        background_color: "#FFFFFF",
        header_background: "#F9FAFB",
      },
    },
  },

  
  {
  widget_type: "registration_widget",
  enabled: false,
  settings_json: {
    options: { 
      countries: [ "UK", "NL", "US", "CA", "NZ", "AU" ],
      show_icons: true, show_title: true , rate_limit: "5" },
    appearance: {
      title: "Vehicle Selector",
      placeholder: "Enter your registration number.",
      colors: {
        text_color: "#000000",
        border_color: "#CCCCCC",
        background_color: "#FFFFFF",
        primary_button_color: "#007BFF",
        input_background_color: "#C3C06F",
        primary_button_text_color: "#FFFFFF",
      },
      layout: "horizontal",
      submit_button: { icon: "search", show: true, label: "Find Parts" },
    },
    translations: {
      no_fit_message: "We couldn't find matching parts for your vehicle.",
      submit_button_text: "Find Parts",
    }
  }
}
];

// Default fitment fields for new stores
const DEFAULT_FITMENT_FIELDS = (storeId: number, nowISO: string) => [
  {
    store_id: storeId,
    label: "Year",
    slug: "year",
    field_type: "int",
    required: false,
    sort_order: 0,
    localized_json: {
      range: { from: 1990, to: 2025 },
      placeholder: "Select Year",
    },
    created_at: nowISO,
    updated_at: nowISO,
  },
  {
    store_id: storeId,
    label: "Make",
    slug: "make",
    field_type: "string",
    required: false,
    sort_order: 1,
    localized_json: { placeholder: "Select Make" },
    created_at: nowISO,
    updated_at: nowISO,
  },
  {
    store_id: storeId,
    label: "Model",
    slug: "model",
    field_type: "string",
    required: false,
    sort_order: 2,
    localized_json: { placeholder: "Select Model" },
    created_at: nowISO,
    updated_at: nowISO,
  },
];

/**
 * @param {import("gadget-server").SuccessActionContext} context
 */
export const onSuccess = async ({ record, logger, connections, api }) => {
  const { myshopifyDomain: shopDomain, shopOwner: ownerName, email: ownerEmail } = record;
  const accessToken = connections.shopify.currentAccessToken;
  const shopify = connections.shopify.current;

  if (!shopDomain || !shopify || !accessToken) {
    logger.error("Missing shopDomain, Shopify connection, or access token.");
    return;
  }

  const { data: existingStore, error: fetchError } = await supabase
    .from("stores")
    .select("id, installation_count")
    .eq("shop_domain", shopDomain)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    logger.error({ fetchError }, "Failed to query for existing store.");
    throw new Error(`Supabase query failed: ${fetchError.message}`);
  }

  let storeId: number;
  const now = new Date().toISOString();

  if (existingStore) {
    storeId = existingStore.id;
    const { error: updateError } = await supabase
      .from("stores")
      .update({
        status: "active",
        archived_at: null,
        access_token: accessToken,
        installation_count: Number(existingStore.installation_count || 0) + 1,
        updated_at: now,
      })
      .eq("id", storeId);

    if (updateError) {
      logger.error({ updateError }, "Failed to update existing store.");
      throw new Error(`Failed to update store: ${updateError.message}`);
    }
    logger.info(`Store re-activated: ${shopDomain} (ID: ${storeId})`);
  } else {
    const shopInfo = await shopify.graphql(`
      query {
        shop {
          primaryDomain { host }
        }
      }
    `);
    const configuredDomain = shopInfo?.shop?.primaryDomain?.host ?? "";

    const { data: newStore, error: insertError } = await supabase
      .from("stores")
      .insert({
        shop_domain: shopDomain,
        owner_name: ownerName,
        owner_email: ownerEmail,
        access_token: accessToken,
        plan_id: 1, // Default plan
        status: "active",
        configured_domain: configuredDomain,
        installation_count: 1,
        shop_name: shopDomain.split(".")[0],
        language: "en",
        installed_at: now,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertError || !newStore?.id) {
      logger.error({ insertError }, "Failed to insert new store.");
      throw new Error(`Failed to create store: ${insertError?.message}`);
    }

    storeId = newStore.id;
    logger.info(`New store created: ${shopDomain} (ID: ${storeId})`);

    // Initialize default settings and widgets
    const settingsToInsert = {
      store_id: storeId,
      json_data: DEFAULT_STORE_SETTINGS
    };

    const widgetsToInsert = DEFAULT_WIDGET_SETTINGS.map((w) => ({
      ...w,
      store_id: storeId,
      created_at: now,
      updated_at: now,
    }));

    const [storeSettingsResult, widgetSettingsResult] = await Promise.all([
      supabase.from("store_settings").insert(settingsToInsert),
      supabase.from("widget_settings").insert(widgetsToInsert),
    ]);

    if (storeSettingsResult.error) {
      logger.error({ error: storeSettingsResult.error }, "Failed to create store settings.");
    } else {
      logger.info(`Store settings initialized for store ID: ${storeId}`);
    }

    if (widgetSettingsResult.error) {
      logger.error({ error: widgetSettingsResult.error }, "Failed to create widget settings.");
    } else {
      logger.info(`Widget settings initialized for store ID: ${storeId}`);
    }

    // Initialize default fitment fields (idempotent)
    try {
      const fitmentRows = DEFAULT_FITMENT_FIELDS(storeId, now);
      const { error: fitmentError } = await supabase
        .from("fitment_fields")
        .upsert(fitmentRows, { onConflict: "store_id,slug", ignoreDuplicates: true });

      if (fitmentError) {
        logger.error({ fitmentError }, "Failed to upsert default fitment fields.");
      } else {
        logger.info(`Default fitment fields initialized for store ID: ${storeId}`);
      }
    } catch (e) {
      logger.error({ e }, "Unexpected error while initializing fitment fields.");
    }

    // Start immediate sync for products and collections for the new store
    try {
      await api.shopifySync.run({
        domain: record.domain,
        shop: { _link: record.id },
      });
      logger.info(
        { shopId: record.id },
        "Product and collection sync initiated for new installation"
      );
    } catch (syncError) {
      logger.error({ error: syncError, shopId: record.id }, "Failed to initiate sync for new installation");
      // Do not throw
    }
  }
};

export const options: ActionOptions = {
  actionType: "create",
  triggers: {
    shopify: { install: true },
  },
};
