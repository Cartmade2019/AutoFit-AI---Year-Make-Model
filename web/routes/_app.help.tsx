import {
  LegacyCard,
  Card,
  TextField,
  Button,
  FormLayout,
  Text,
  Link,
  Layout,
  Collapsible,
  Page,
  Icon,
  Toast,
  Box,
  Frame,
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
  CalloutCard
} from "@shopify/polaris";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDownIcon } from "@shopify/polaris-icons";
import SupportBanner from "../components/Help/SupportBanner";
import { useGadget } from "@gadgetinc/react-shopify-app-bridge";
import { useNavigate, useLocation } from "@remix-run/react";
import { api } from "../api";

const SUPABASE_DOMAIN = process.env.GADGET_PUBLIC_SUPABASE_URL;
const SEND_EMAIL_URL = `${SUPABASE_DOMAIN}/functions/v1/send-user-email`;
const SUPABASE_ANON_JWT = process.env.GADGET_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

type ShopPick = {
  email?: string | null;
  shopOwner?: string | null;
  myshopifyDomain?: string | null;
  name?: string | null;
};

type FAQ = {
  title: string;
  content: JSX.Element;
};

export default function HelpPage() {
  const [toastActive, setToastActive] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const [fetching, setFetching] = useState(true);
  const [shop, setShop] = useState<ShopPick | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useGadget();

  // Fetch current shop data in effect
  useEffect(() => {
    let cancelled = false;
    const shopDomain: any = shopify.config.shop;
    const run = async () => {
      if (!isAuthenticated) return;
      setFetching(true);
      try {
        const result = await api.shopifyShop.findFirst({
          filter: { myshopifyDomain: { equals: shopDomain } },
          select: {
            email: true,
            shopOwner: true,
            myshopifyDomain: true,
            name: true,
          },
        });
        if (!cancelled) setShop(result ?? null);
      } catch {
        if (!cancelled) setShop(null);
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    if (shopDomain) run();
    else setFetching(false);

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const email = shop?.email ?? "";
  const name = shop?.shopOwner ?? "";
  const domain = shop?.myshopifyDomain;
  const storeName = useMemo(
    () => shop?.name ?? (domain ? domain.replace(".myshopify.com", "") : "Shopify Store"),
    [shop?.name, domain]
  );

  const toggleFAQ = useCallback(
    (index: number) => setFaqOpen((prev) => (prev === index ? null : index)),
    []
  );

  const notify = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastActive(true);
  }, []);

  const handleMessageChange = useCallback((v: string) => setMessage(v), []);

  const handleSubmit = useCallback(async () => {
    setFaqOpen(null);

    if (!message.trim()) {
      notify("Type a message before sending.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(SEND_EMAIL_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_JWT}`,
          apikey: SUPABASE_ANON_JWT,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: "support",
          store_owner_name: name,
          store_email: email,
          store_name: storeName,
          shopify_domain: domain,
          subject: "Support request",
          message,
          name: "Functions",
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      notify("Thank you. Your message was sent successfully.");
      setMessage("");
    } catch (err: any) {
      notify(`Failed to send. ${err?.message || "Try again later."}`);
    } finally {
      setLoading(false);
    }
  }, [domain, email, message, name, notify, storeName]);

  const faqs: FAQ[] = useMemo(
    () => [
      {
        title: "How do I enable the app?",
        content: (
          <>
            <Text as="p">To get started, follow three steps:</Text>
            <ol style={{ paddingLeft: 18, marginTop: 8 }}>
              <li>Enable the app from Theme Customization.</li>
              <li>Turn on at least one widget in the Admin Dashboard.</li>
              <li>Add at least one value in the Database.</li>
            </ol>
          </>
        ),
      },
      {
        title: "How do I enable a widget in my theme?",
        content: (
          <ul style={{ paddingLeft: 18 }}>
            <li>After you switch on a widget from the Admin Dashboard homepage, you can customize it as needed.</li>
            <li>For simple design changes, add your own CSS in Global Settings.</li>
            <li>For advanced customization or new features, contact our support team.</li>
          </ul>
        ),
      },
      {
        title: "How do I add Year–Make–Model data to my products?",
        content: (
          <ol style={{ paddingLeft: 18 }}>
            <li>Make sure your product is already added to your store.</li>
            <li>Go to the Database page and create fitment fields and values (Year, Make, Model).</li>
            <li>Assign one or multiple products to those fitment values.</li>
            <li>You can add new entries through Search Entry or edit existing ones.</li>
          </ol>
        ),
      },
      {
        title: "How do I show fitment verification on the product detail page?",
        content: (
          <ol style={{ paddingLeft: 18 }}>
            <li>Add the Fitment Verification Widget from Theme Customization → Product Page templates.</li>
            <li>Make sure the widget is also enabled in the Admin Dashboard.</li>
          </ol>
        ),
      },
      {
        title: "How do I show the fitment table on the product detail page?",
        content: (
          <ol style={{ paddingLeft: 18 }}>
            <li>Add the Fitment Table Widget from Theme Customization → Product Page templates.</li>
            <li>Make sure the widget is also enabled in the Admin Dashboard.</li>
          </ol>
        ),
      },
    ],
    []
  );

  const toastMarkup = toastActive ? (
    <Toast content={toastMsg} onDismiss={() => setToastActive(false)} />
  ) : null;

  if (fetching || !isAuthenticated) {
    return (
      <Frame>
        <Page title="Help">
          <Layout>
            <Layout.Section>
              <Card>
                <SkeletonDisplayText size="small" />
                <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
                  <SkeletonBodyText lines={6} />
                </div>
                <SkeletonDisplayText size="small" />
              </Card>
            </Layout.Section>
          </Layout>
        </Page>
      </Frame>
    );
  }

  return (
    <Frame>
      <Page title="Help" backAction={{ content: "Back", onAction: () => navigate("/") }}>
        {/* <div style={{ marginBottom: "1rem" }}>
          <SupportBanner />
        </div> */}

        <Layout>
          <Layout.Section>
            <LegacyCard>
              <div style={{ padding: 20 }}>
                <Text as="h1" variant="headingMd" fontWeight="bold">
                  Need help?
                </Text>
                <Text as="p" tone="subdued">
                 Have questions or facing an issue or want to request a feature? <br />
                  Reach out to our support team at{" "}
                  <Link url="mailto:support@cartmade.com">support@cartmade.com</Link>. We respond to all inquiries within one business day.
                </Text>

                <div style={{ marginTop: 20 }}>
                  <FormLayout>
                    <FormLayout.Group>
                      <TextField label="Email" value={email} autoComplete="email" readOnly />
                      <TextField label="Name" value={name} autoComplete="name" readOnly />
                    </FormLayout.Group>
                    <TextField
                      label="Type your question here"
                      value={message}
                      onChange={handleMessageChange}
                      multiline={4}
                      autoComplete="on"
                    />
                    <Button onClick={handleSubmit} variant="primary" loading={loading} disabled={loading || !message.trim()}>
                      Send us your question
                    </Button>
                  </FormLayout>
                </div>
              </div>
            </LegacyCard>
          </Layout.Section>

          <hr style={{ borderTop: "1px dotted #ccc", margin: "2rem 0" }} />
          <Layout.Section>
 <div id="faq-section">
            <LegacyCard>
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: "1rem" }}>
                  <Text as="span" variant="headingMd" fontWeight="bold">
                    FAQ
                  </Text>
                  <Text as="span" tone="subdued">
                    You can find answers to common questions here
                  </Text>
                </div>

                {faqs.map((item, index) => {
                  const open = faqOpen === index;
                  const collapsibleId = `faq-${index}`;
                  return (
                    <div key={index} style={{ borderTop: "1px solid #e1e3e5" }}>
                      <button
                        onClick={() => toggleFAQ(index)}
                        aria-controls={collapsibleId}
                        aria-expanded={open}
                        style={{
                          padding: "12px 0",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          width: "100%",
                          background: "transparent",
                          border: 0,
                          textAlign: "left",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <Text as="h3" variant="bodyMd" fontWeight="medium">
                            {item.title}
                          </Text>
                        </div>
                        <Icon source={ChevronDownIcon} tone="base" />
                      </button>

                      <Collapsible id={collapsibleId} open={open}>
                        <div style={{ paddingBottom: 12 }}>
                          <Text as="div" tone="subdued">
                            {item.content}
                          </Text>
                        </div>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </LegacyCard>
 </div>
          </Layout.Section>
        </Layout>

        <Box paddingBlockEnd="800" />
        {toastMarkup}
      </Page>
    </Frame>
  );
}
