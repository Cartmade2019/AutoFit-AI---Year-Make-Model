import type { GadgetModel } from "gadget-server";

// This file describes the schema for the "WidgetImage" model, go to https://cm-ymm.gadget.app/edit to view/edit your model in Gadget
// For more information on how to update this file http://docs.gadget.dev

export const schema: GadgetModel = {
  type: "gadget/model-schema/v1",
  storageKey: "YzJM-6PcgVJA",
  fields: {
    availableToPlan: { type: "json", storageKey: "ItnATbC_ImUh" },
    description: { type: "string", storageKey: "iu8DBMBXDbKP" },
    heading: { type: "string", storageKey: "7lYBIEOyg-X-" },
    image: { type: "string", storageKey: "487GM0HiFLgz" },
    isActive: { type: "boolean", storageKey: "OrBeUdOgyZqx" },
    route: { type: "string", storageKey: "8lkFIHeghcoC" },
    widget_type: { type: "string", storageKey: "NbcJn9gDUASV" },
  },
};
