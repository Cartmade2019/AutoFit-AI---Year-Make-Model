import React, { useState, useEffect, useMemo } from "react";
import {
  Page,
  Tabs,
  Layout,
  InlineStack,
  BlockStack,
  Text,
  Card,
  Spinner,
  Select,
  SkeletonDisplayText,
  SkeletonBodyText
} from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import { AnalyticsDateRangePicker } from "../components/DatePicker";
import {
  BarChart,
  LineChart,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  Line,
  Pie,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";
import { supabase } from "../supabase/supabaseClient";
import dayjs from "dayjs";

export default function () {
  const navigate = useNavigate();

  const [selectedTab, setSelectedTab] = useState(0);
  const tabs = [
    { id: "lookup", content: "Registration Lookup" },
    { id: "chatusage", content: "Chat Usage" },
  ];

  return (
    <>
      <Page
        title="Analytics"
        subtitle="It displays real-time data for registrations, lookup statistics, and chat token usage, helping you monitor user engagement and system performance at a glance."
        backAction={{ content: "Back", onAction: () => navigate("/") }}
      >
        <Layout>
          <Layout.Section>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <div style={{ marginTop: "12px" }}>
                {selectedTab === 0 && <RegistrationLookupTab />}
                {selectedTab === 1 && <ChatUsageTab />}
              </div>
            </Tabs>
          </Layout.Section>
        </Layout>
      </Page>
    </>
  );
}

/* ------------------------------ Registration Tab ------------------------------ */

const RegistrationLookupTab = () => {
  const [loading, setLoading] = useState(false);
  const [registrationData, setRegistrationData] = useState<
    { vin: string; country: string; date: string }[]
  >([]);
  const [chartData, setChartData] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(
    null
  );

  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [cardLoading , setCardLoading] = useState(true)
  const [cardData , setCardData] = useState([])


  const shopDomain = "rohan-teststore.myshopify.com";

  useEffect(() => {
     const fetchCardDetials = async  () => {
        try {
      setCardLoading(true);

      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select("id, plan_id")
        .eq("shop_domain", shopDomain)
        .single();

          
      if (storeError || !storeData?.id) {
        console.error("Store fetch failed:", storeError);
        setCardData([]);
        return;
      }

      const { data: planData, error: planError } = await supabase
        .from("plans")
        .select("name")
        .eq("id", storeData.plan_id)
        .single();
      if (planError || !planData?.name) {
        console.error("Plan fetch failed:", planError);
        setCardData([]);
        return;
      }

      const planName = String(planData.name).trim().toLowerCase();
      const PLAN_LIMITS: Record<string, number> = {
        "free trial": 0,
        "free trail": 0,     
        starter: 2000,
        growth: 5000,
        pro: 10000,
        elite: 20000,
      };
      
      const maxTokenForPlan = PLAN_LIMITS[planName] ?? 0;


  const startOfMonth = dayjs().startOf("month").toISOString();
  const startOfNextMonth = dayjs().add(1, "month").startOf("month").toISOString();

     const { data, error } = await supabase
    .from("registration_lookup")
    .select("id", { count: "exact" })
    .eq("store_id", storeData?.id)
    .gte("created_at", startOfMonth)
    .lt("created_at", startOfNextMonth);

    if(!data) return 

      const remainingTokens = Math.max(maxTokenForPlan- data.length, 0);
      const usagePercentage =
        maxTokenForPlan > 0 ? ((data.length / maxTokenForPlan) * 100) : 0;

      const newCardData = [
    { title: "Registration Lookup", value: data.length },
    { title: "Price Per Lookup", value: "$1.25" },
    { title: "Max Registration Lookup", value: maxTokenForPlan },
    { title: "Usage Percentage", value: `${usagePercentage} %`  },
      ];


      setCardData(newCardData as any);
    } catch (e) {
      console.error("Error:", e);
      setCardData([]);
    } finally {
      setCardLoading(false);
    }
     }

    fetchCardDetials()
  } , [shopDomain, dayjs().format("YYYY-MM")])

  

  useEffect(() => {
    const fetchRegistrationData = async () => {
      try {
        setLoading(true);

        const { data: store, error: storeError } = await supabase
          .from("stores")
          .select("id")
          .eq("shop_domain", shopDomain)
          .single();

        if (storeError || !store) {
          console.error("Error finding store:", storeError);
          setRegistrationData([]);
          return;
        }

        let query = supabase
          .from("registration_lookup")
          .select("input, country, created_at")
          .eq("store_id", store.id);

        if (dateRange) {
          query = query
            .gte(
              "created_at",
              dayjs(dateRange.start).startOf("day").toISOString()
            )
            .lte("created_at", dayjs(dateRange.end).endOf("day").toISOString());
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching registration data:", error);
          setRegistrationData([]);
        } else {
          const formatted = data.map((item) => ({
            vin: item.input,
            country: item.country,
            date: item.created_at,
          }));
          setRegistrationData(formatted);

          const grouped = data.reduce((acc : any, item: any) => {
            const month = dayjs(item.created_at).format("MMMM YYYY");
            acc[month] = (acc[month] || 0) + 1;
            return acc;
          }, {});

          const chartArray = Object.entries(grouped).map(([month, count]) => ({
            name: month,
            lookups: count,
          }));

          const sortedChartData = [...chartArray].sort((a, b) => (dayjs(a.name, "MMMM YYYY").toDate() as any) - (dayjs(b.name, "MMMM YYYY").toDate() as any ));

          setChartData(sortedChartData as any);
        }
      } catch (error) {
        console.error("Something wrong happened", error);
      } finally {
        setLoading(false);
      }
    };

    if (shopDomain) fetchRegistrationData();
  }, [shopDomain, dateRange]);




  const countryOptions = [
    { label: "All Countries", value: "All" },
    ...Array.from(new Set(registrationData.map((i) => i.country))).map(
      (country) => ({
        label: country,
        value: country,
      })
    ),
  ];

  const filteredData =
    selectedCountry === "All"
      ? registrationData
      : registrationData.filter((item) => item.country === selectedCountry);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginatedData = filteredData.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);

useEffect(() => {
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  if (currentPage > totalPages) {
    setCurrentPage(Math.max(totalPages, 1));
  }
}, [filteredData, currentPage]);


  return (
    <>
      {/* Summary Cards */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "stretch",
          width: "100%",
          gap: "16px",
        }}
      >

        {
          cardLoading ? (
            <>
                {[...Array(4)].map((_, i) => (
      <div key={i} style={{ flex: "1" }}>         
      <Card roundedAbove="sm" padding="400">
        <BlockStack gap="100">
          <SkeletonDisplayText size="small" />
          <SkeletonDisplayText size="extraLarge" />
        </BlockStack>
      </Card>
      </div>      
    ))}
            </>
          ) : (
            <>
           {cardData.map((card : any, index: number) => (
          <div key={index} style={{ flex: "1" }}>
            <Card roundedAbove="sm" padding="400">
              <BlockStack gap="100">
                <Text as="h1" variant="bodyLg" fontWeight="medium">
                  {card.title}
                </Text>
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="heading2xl" as="h3">
                    {card.value}
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>
          </div>
        ))} 
            </>
          )
        }
        
      </div>

      {/* Date Picker */}
      <div style={{ marginTop: "0.5rem" }}>
        <AnalyticsDateRangePicker onDateChange={setDateRange} />
      </div>

      {/* Chart */}
      <div style={{ marginTop: "1rem" }}>
        <Card roundedAbove="sm" padding="400">
          <BlockStack gap="200">
            <Text variant="headingLg" as="h2" fontWeight="semibold">
              Registration Lookup Usage
            </Text>
            <div style={{ width: "100%", height: 300, marginTop: "2rem" }}>
              {
                loading ? (
                  <>
                       <div style={{ padding: "2rem" }}>
                            <SkeletonBodyText lines={8} />
                        </div>
                  </>
                ) : (
                  <>
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name"  tickFormatter={(d) => dayjs(d).format("DD MMM")}  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="lookups"
                    stroke="#4CAF50"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
                  
                  
                  </>
                )
              }
            </div>
          </BlockStack>
        </Card>
      </div>


{/* Table */}
<div style={{ marginTop: "1rem" }}>
  <Card roundedAbove="sm" padding="400">
    <BlockStack gap="300">
      <InlineStack align="space-between">
        <Text variant="headingLg" as="h2" fontWeight="semibold">
          Registration Lookup Details
        </Text>
        <div style={{ width: "250px" }}>
          <Select
            label=""
            options={countryOptions}
            value={selectedCountry}
            onChange={setSelectedCountry}
          />
        </div>
      </InlineStack>

      {loading ? (
        <div style={{ padding: "2rem" }}>
                            <SkeletonBodyText lines={8} />
                        </div>
      ) : (
        <>
          <div
            style={{
              width: "100%",
              overflowX: "auto",
              marginTop: "1rem",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #ddd",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f9fafb",
                    textAlign: "left",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  <th style={{ padding: "12px 16px" }}>S.N</th>
                  <th style={{ padding: "12px 16px" }}>
                    Registration / VIN Number
                  </th>
                  <th style={{ padding: "12px 16px" }}>Country</th>
                  <th style={{ padding: "12px 16px" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, index) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: "1px solid #eee",
                        backgroundColor:
                          index % 2 === 0 ? "#fff" : "#f7f7f7",
                      }}
                    >
                      <td style={{ padding: "10px 16px" }}>
                        {index + 1 + (currentPage - 1) * itemsPerPage}
                      </td>
                      <td style={{ padding: "10px 16px" }}>{item.vin}</td>
                      <td style={{ padding: "10px 16px" }}>{item.country}</td>
                      <td style={{ padding: "10px 16px" }}>
                        {dayjs(item.date).format("DD MMM YYYY")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: "16px",
                        textAlign: "center",
                        color: "#888",
                      }}
                    >
                      No records found for {selectedCountry}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <InlineStack align="center" blockAlign="center" gap="200">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                background: currentPage === 1 ? "#eee" : "white",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>
            <Text as="span">
              Page {currentPage} of {totalPages}
            </Text>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                background:
                  currentPage === totalPages ? "#eee" : "white",
                cursor:
                  currentPage === totalPages ? "not-allowed" : "pointer",
              }}
            >
              Next
            </button>
          </InlineStack>
        </>
      )}
    </BlockStack>
  </Card>
</div>

    </>
  );
};



type CardItem = { title: string; value: string };

type Row = {
  id: number;
  message: { type?: string; content?: string } | null;
};

export const ChatUsageTab = () => {
  const [cardLoading, setCardLoading] = useState(false);
  const [cardData, setCardData] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<"day" | "month">("day");
  const shopDomain = "rohan-teststore.myshopify.com";

  // charts dataset (affected by date picker)
  const [usageData, setUsageData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

  // numbers for Plan Comparison (month-only)
  const [tokensThisMonth, setTokensThisMonth] = useState(0);
  const [currentPlanLimit, setCurrentPlanLimit] = useState(0);
  const [nextPlanLimit, setNextPlanLimit] = useState(0);

  // state management for pie charts
  const [pieloading, setPieLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  // constant need for the pie chart
  const COLORS = ["#5C6AC4", "#108043", "#F49342", "#DE3618", "#8C9196"];
  const CATEGORIES = [
  "Product-related",
  "Shipping",
  "Order status",
  "Refunds",
  "General inquiries",
] as const;

  const RULES: Record<(typeof CATEGORIES)[number], RegExp[]> = {
  "Product-related": [
    /\b(price|availability|stock|size|color|spec|compatible|part|parts|product|bmw|model|fit|warranty)\b/i,
  ],
  Shipping: [/\b(ship|shipping|delivery|dispatch|tracking|courier|delivered)\b/i],
  "Order status": [/\b(order status|track.*order|where.*order|status)\b/i],
  Refunds: [/\b(refund|return|exchange|cancel(l)?|chargeback)\b/i],
  "General inquiries": [],
};

  /* ----------------- Utility Function For Pie Chart --------- */
  const classify = (text: string): (typeof CATEGORIES)[number] => {
  for (const cat of CATEGORIES) {
    if (cat === "General inquiries") continue;
    if (RULES[cat].some((re) => re.test(text))) return cat;
  }
  return "General inquiries";
};


  /* ----------------- Fetch data for the pie chart --------- */

  useEffect(() => {
  const fetchRows = async () => {
    setPieLoading(true);
    try {
      const { data, error } = await supabase
        .from("n8n_chat_histories")
        .select("id, message")
        .eq("message->>type", "human")
        .order("id", { ascending: false })
        .limit(5000);
      if (error) throw error;
      setRows((data as Row[]) ?? []);
    } catch (e) {
      console.error("fetch error:", e);
      setRows([]);
    } finally {
      setPieLoading(false);
    }
  };
  fetchRows();
}, []);

const pieData = useMemo(() => {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const content = (r.message?.content || "").toString();
    const cat = classify(content);
    counts[cat] = (counts[cat] || 0) + 1;
  }
  const total = Object.values(counts).reduce((s, n) => s + n, 0) || 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, clicks]) => ({
      name,
      clicks,
      pct: Math.round((clicks / total) * 100),
    }));
}, [rows]);

  /* ----------------- Fetch plan and THIS MONTH usage for cards/plan --------- */
  useEffect(() => {
    const fetchMonthlyCards = async () => {
      try {
        setCardLoading(true);

        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select("id, plan_id")
          .eq("shop_domain", shopDomain)
          .single();
        if (storeError || !storeData?.id) {
          console.error("Store fetch failed:", storeError);
          setCardData([]);
          return;
        }

        const { data: planData, error: planError } = await supabase
          .from("plans")
          .select("name")
          .eq("id", storeData.plan_id)
          .single();
        if (planError || !planData?.name) {
          console.error("Plan fetch failed:", planError);
          setCardData([]);
          return;
        }

        const planName = String(planData.name).trim().toLowerCase();
        const TIERS = ["free trial", "starter", "growth", "pro", "elite"] as const;
        const LIMITS: Record<string, number> = {
          "free trial": 0,
          "free trail": 0, 
          starter: 1_000_000,
          growth: 2_000_000,
          pro: 3_000_000,
          elite: 5_000_000,
        };

        const currLimit = LIMITS[planName] ?? 0;
        const idx = Math.max(0, TIERS.indexOf(planName as any));
        const nextTier = TIERS[Math.min(idx + 1, TIERS.length - 1)];
        const nextLimit = LIMITS[nextTier];

        const start = dayjs().startOf("month").format("YYYY-MM-DD");
        const next = dayjs().startOf("month").add(1, "month").format("YYYY-MM-DD");

        const { data, error } = await supabase
          .from("openai_usage")
          .select("prompt_tokens, completion_tokens")
          .eq("store_id", storeData.id)
          .gte("usage_date", start)
          .lt("usage_date", next);
        if (error) throw error;

        const monthTokens =
          (data ?? []).reduce(
            (s, r) => s + (r.prompt_tokens || 0) + (r.completion_tokens || 0),
            0
          ) || 0;

        setTokensThisMonth(monthTokens);
        setCurrentPlanLimit(currLimit);
        setNextPlanLimit(nextLimit);

        const remaining = Math.max(currLimit - monthTokens, 0);
        const percent = currLimit > 0 ? (monthTokens / currLimit) * 100 : 0;

        setCardData([
          { title: "Total Tokens for Plan", value: currLimit.toLocaleString() },
          { title: "Used Tokens", value: monthTokens.toLocaleString() },
          { title: "Remaining Tokens", value: remaining.toLocaleString() },
          { title: "Usage Percentage", value: `${percent.toFixed(2)}%` },
        ]);
      } catch (e) {
        console.error("Monthly cards error:", e);
        setCardData([]);
      } finally {
        setCardLoading(false);
      }
    };

    fetchMonthlyCards();
  }, [shopDomain, dayjs().format("YYYY-MM")]); // recompute when month changes

  /* ----------------------- Fetch chart data (dateRange) ---------------------- */
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        setLoading(true);

        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select("id")
          .eq("shop_domain", shopDomain)
          .single();
        if (storeError || !storeData?.id) {
          console.error("Store fetch failed:", storeError);
          setUsageData([]);
          return;
        }

        let query = supabase
          .from("openai_usage")
          .select("*")
          .eq("store_id", storeData.id)
          .order("usage_date", { ascending: true });

        if (dateRange) {
          query = query
            .gte("usage_date", dayjs(dateRange.start).format("YYYY-MM-DD"))
            .lte("usage_date", dayjs(dateRange.end).format("YYYY-MM-DD"));
        }

        const { data, error } = await query;
        if (error) throw error;
        setUsageData(data ?? []);
      } catch (e) {
        console.error("Usage fetch error:", e);
        setUsageData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [shopDomain, dateRange]);

  /* ----------------------------- Charts helpers ----------------------------- */
  const lineChartData = useMemo(
    () =>
      usageData.map((row) => ({
        name: row.usage_date,
        tokens: (row.prompt_tokens || 0) + (row.completion_tokens || 0),
      })),
    [usageData]
  );

  const aggregateTokenUsage = (data: any[], type: "day" | "month") => {
    const grouped: Record<string, number> = {};
    data.forEach((row) => {
      const d = dayjs(row.usage_date);
      const key = type === "month" ? d.format("YYYY-MM") : d.format("YYYY-MM-DD");
      const tokens = (row.prompt_tokens || 0) + (row.completion_tokens || 0);
      grouped[key] = (grouped[key] || 0) + tokens;
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([key, tokens]) => ({
        name: viewType === "month" ? dayjs(key).format("MMM YYYY") : dayjs(key).format("DD MMM"),
        tokens,
      }));
  };

  const lineChartDataForBar = useMemo(() => aggregateTokenUsage(usageData, "day"), [usageData]);
  const monthlyChartDataForBar = useMemo(() => aggregateTokenUsage(usageData, "month"), [usageData]);
  const dataForDayMonth = viewType === "day" ? lineChartDataForBar : monthlyChartDataForBar;

  const maxTokens = Math.max(...dataForDayMonth.map((d) => d.tokens || 0), 0);
  const avgTokens =
    dataForDayMonth.length > 0
      ? dataForDayMonth.reduce((s, d) => s + d.tokens, 0) / dataForDayMonth.length
      : 0;

  /* ------------------------------ Plan comparison --------------------------- */
  const daysElapsed = dayjs().diff(dayjs().startOf("month"), "day") + 1;
  const avgDailyUsage = tokensThisMonth / Math.max(daysElapsed, 1);
  const estimatedDaysLeft = Math.max(
    Math.round((currentPlanLimit - tokensThisMonth) / Math.max(avgDailyUsage, 1)),
    0
  );

  const barData = [
    {
      name: "Current Plan",
      tokens: tokensThisMonth,
      total: currentPlanLimit,
      label: `${tokensThisMonth.toLocaleString()} / ${currentPlanLimit.toLocaleString()} Tokens`,
    },
    {
      name: "Next Plan",
      tokens: nextPlanLimit,
      total: nextPlanLimit,
      label: `${nextPlanLimit.toLocaleString()} Tokens`,
    },
  ];

  const videoData = [
    { name: "Product-related queries", clicks: 20 },
    { name: "Shipping", clicks: 30 },
    { name: "Refunds", clicks: 50 },
    { name: "Order status", clicks: 40 },
    { name: "General inquiries", clicks: 80 },
  ];
  const segmentColors = ["#FF5733", "#FF8C00", "#4CAF50", "#2196F3"];
  const getPieSegmentColor = (_: any, i: number) => segmentColors[i % segmentColors.length];

  return (
    <>
      {/* Top Summary Cards */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "stretch", width: "100%", gap: 16, flexWrap: "nowrap" }}>
        {cardLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ flex: 1 }}>
                <Card roundedAbove="sm" padding="400">
                  <BlockStack gap="100">
                    <SkeletonDisplayText size="small" />
                    <SkeletonDisplayText size="extraLarge" />
                  </BlockStack>
                </Card>
              </div>
            ))}
          </>
        ) : (
          <>
            {cardData.map((card, index) => (
              <div key={index} style={{ flex: 1 }}>
                <Card roundedAbove="sm" padding="400">
                  <BlockStack gap="100">
                    <Text as="h1" variant="bodyLg" fontWeight="medium">
                      {card.title}
                    </Text>
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="heading2xl" as="h3">
                        {card.value}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </Card>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Date Range Picker (charts only) */}
      <div style={{ marginTop: "0.5rem" }}>
        <AnalyticsDateRangePicker onDateChange={setDateRange} />
      </div>

      {/* GRID: 2x2 Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: "2rem" }}>
        {/* Line Chart */}
        <Card roundedAbove="sm" padding="400">
          <BlockStack gap="200">
            <Text variant="headingLg" as="h2" fontWeight="semibold">
              Token Usage Over Time
            </Text>
            <div style={{ width: "100%", height: 300, marginTop: "2rem" }}>
              {loading ? (
                <div style={{ padding: "2rem" }}>
                  <SkeletonBodyText lines={8} />
                </div>
              ) : (
                <ResponsiveContainer>
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickFormatter={(d) => dayjs(d).format("DD MMM")} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="tokens" stroke="#4CAF50" strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </BlockStack>
        </Card>

        {/* Pie Chart */}
        <Card roundedAbove="sm" padding="400">
          <BlockStack gap="200">
            <Text variant="headingLg" as="h2" fontWeight="semibold">
              Message Category Breakdown
            </Text>
            <div style={{ width: "100%", height: 300, marginTop: "2rem" }}>
              {loading ? (
                <div style={{ padding: "2rem" }}>
                  <SkeletonBodyText lines={8} />
                </div>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Tooltip />
                    <Legend />
                    <Pie data={pieData} dataKey="clicks" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </BlockStack>
        </Card>

        {/* Token Usage by Day/Month */}
        <Card roundedAbove="sm" padding="400">
          <BlockStack gap="200">
            <Text variant="headingLg" as="h2" fontWeight="semibold">
              Token Usage by {viewType === "day" ? "Day" : "Month"}
            </Text>
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button
                onClick={() => setViewType("day")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  background: viewType === "day" ? "#5C6AC4" : "white",
                  color: viewType === "day" ? "white" : "#333",
                  cursor: "pointer",
                }}
              >
                By Day
              </button>
              <button
                onClick={() => setViewType("month")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  background: viewType === "month" ? "#5C6AC4" : "white",
                  color: viewType === "month" ? "white" : "#333",
                  cursor: "pointer",
                }}
              >
                By Month
              </button>
            </div>

            <div style={{ width: "100%", height: 300 }}>
              {loading ? (
                <div style={{ padding: "2rem" }}>
                  <SkeletonBodyText lines={8} />
                </div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={dataForDayMonth} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <ReferenceLine
                      y={avgTokens}
                      label={{ value: "Avg", position: "right", fill: "red" }}
                      stroke="red"
                      strokeDasharray="3 3"
                    />
                    <Bar dataKey="tokens" radius={[8, 8, 0, 0]}>
                      {dataForDayMonth.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.tokens === maxTokens ? "#108043" : "#5C6AC4"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </BlockStack>
        </Card>

        {/* Plan Comparison (month-only) */}
        <Card roundedAbove="sm" padding="400">
          <BlockStack gap="200">
            <Text variant="headingLg" as="h2" fontWeight="semibold">
              Plan Comparison
            </Text>
            <Text as="span" tone="subdued">
              You use about <b>{Math.round(avgDailyUsage).toLocaleString()}</b> tokens/day. Estimated exhaustion in{" "}
              <b>{estimatedDaysLeft}</b> days.
            </Text>
            <div style={{ width: "100%", height: 300 }}>
              {cardLoading ? (
                <div style={{ padding: "2rem" }}>
                  <SkeletonBodyText lines={8} />
                </div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={barData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, Math.max(currentPlanLimit, nextPlanLimit)]} />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="tokens" radius={[0, 8, 8, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={index} fill={entry.name === "Next Plan" ? "#108043" : "#5C6AC4"} />
                      ))}
                      <LabelList dataKey="label" position="right" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </BlockStack>
        </Card>
      </div>
    </>
  );
};






