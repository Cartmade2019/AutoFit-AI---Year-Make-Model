import { Card, Icon, Link, Text } from "@shopify/polaris";
import { QuestionCircleIcon } from "@shopify/polaris-icons";
import React from "react";

export default function SupportBanner() {
  // Handle the click to scroll to FAQ section
  const handleScrollToFAQ = () => {
    const faqSection = document.getElementById("faq-section");
    if (faqSection) {
      faqSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <Card padding="0" roundedAbove="sm">
      <div
        style={{
          backgroundColor: "#F3F4F6",
          borderLeft: "6px solid #3B82F6",
          padding: "1rem 1.5rem",
          borderRadius: "0.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              backgroundColor: "#E0F2FE",
              borderRadius: "50%",
              width: "56px",
              height: "56px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <Icon source={QuestionCircleIcon} tone="base" />
          </div>

          <div>
            <Text variant="headingSm" as="h6">
              Need help with Search or Fitment widgets?
            </Text>
            <Text as="p" tone="subdued">
              Learn how to configure your store widgets in our detailed docs
              and FAQ.
            </Text>
          </div>
        </div>

        <div style={{ marginLeft: "auto" }}>
          {/* Link now triggers the custom scroll function */}
          <Link onClick={handleScrollToFAQ} monochrome removeUnderline>
            <Text as="h6" variant="bodyMd" fontWeight="medium" tone="base">
              Visit our FAQ →
            </Text>
          </Link>
        </div>
      </div>
    </Card>
  );
}
