import React, { useState, useCallback, memo } from "react";
import {
  Badge,
  BlockStack,
  Box,
  Button,
  Card,
  InlineStack,
  Text,
  Tooltip,
  Icon,
  SkeletonThumbnail,
} from "@shopify/polaris";
import { useNavigate, useRouteLoaderData } from "@remix-run/react";
import { LockFilledIcon } from "@shopify/polaris-icons";
import type { loader as rootLoader } from "~/root";

type AvailableToPlan = { plans: string[] };

type CardComponentProps = {
  widgetId: string;
  widgetType: string;
  isEnabled: boolean;
  heading: string;
  description: string;
  imageSrc: string;
  route: string;
  availableToPlan: AvailableToPlan;
  onStatusChange: (widgetId: string, newStatus: boolean) => Promise<void>;
};

/** ---------------- Image Component with Enhanced Loading ---------------- */
const WidgetImage = memo(function WidgetImage({
  src,
  alt,
  heading,
}: {
  src: string;
  alt: string;
  heading: string;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showImage, setShowImage] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    // Small delay for smoother transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShowImage(true);
      });
    });
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(true);
    setShowImage(true);
  }, []);

  return (
    <Box width="34%" minWidth="100px" position="relative">
      {/* Preload image */}
      {src && (
        <img
          src={src}
          alt=""
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ display: "none" }}
        />
      )}

      {/* Skeleton while loading */}
      <div
        style={{
          opacity: !imageLoaded ? 1 : 0,
          transition: "opacity 300ms ease",
          position: imageLoaded ? "absolute" : "static",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1,
        }}
      >
        <SkeletonThumbnail size="medium" />
      </div>

      {/* Actual image or fallback */}
      <div
        style={{
          opacity: showImage ? 1 : 0,
          transition: "opacity 300ms ease",
          transform: showImage ? "scale(1)" : "scale(0.98)",
          transitionProperty: "opacity, transform",
          transitionDuration: "300ms",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {imageError || !src ? (
          <Box
            background="bg-surface-secondary"
            minHeight="120px"
            width="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            borderRadius="200"
          >
            <Text as="p" tone="subdued" alignment="center" variant="bodySm">
              Image not available
            </Text>
          </Box>
        ) : (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            width={240}
            height={120}
            style={{
              borderRadius: 8,
              height: 120,
              width: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        )}
      </div>
    </Box>
  );
});

/** ---------------- Enhanced Status Badge ---------------- */
const StatusBadge = memo(function StatusBadge({
  locked,
  isEnabled,
  statusTooltip,
}: {
  locked: boolean;
  isEnabled: boolean;
  statusTooltip: string;
}) {
  return (
    <Tooltip content={statusTooltip} preferredPosition="above">
      {locked ? (
        <Badge>
          <Icon source={LockFilledIcon} tone="base" />
        </Badge>
      ) : (
        <Badge
          progress="complete"
          tone={isEnabled ? "success" : "critical"}
        >
          {isEnabled ? "on" : "off"}
        </Badge>
      )}
    </Tooltip>
  );
});

/** ---------------- Action Buttons ---------------- */
const ActionButtons = memo(function ActionButtons({
  locked,
  isEnabled,
  isUpdating,
  isNavigating,
  onToggle,
  onNavigateSettings,
  onNavigateBilling,
}: {
  locked: boolean;
  isEnabled: boolean;
  isUpdating: boolean;
  isNavigating: boolean;
  onToggle: () => void;
  onNavigateSettings: () => void;
  onNavigateBilling: () => void;
}) {
  if (locked) {
    return (
      <InlineStack gap="200">
        <Button
          onClick={onNavigateBilling}
          variant="primary"
          size="medium"
          loading={isNavigating}
        >
          Upgrade
        </Button>
      </InlineStack>
    );
  }

  return (
    <InlineStack gap="200">
      <Button
        onClick={onNavigateSettings}
        variant="primary"
        size="medium"
        loading={isNavigating}
      >
        Settings
      </Button>
      <Button
        variant="secondary"
        onClick={onToggle}
        loading={isUpdating}
        size="medium"
        disabled={isNavigating}
      >
        {isEnabled ? "Turn Off" : "Turn On"}
      </Button>
    </InlineStack>
  );
});

/** ---------------- Main Card Component ---------------- */
const CardComponent = memo(function CardComponent({
  widgetId,
  widgetType,
  isEnabled,
  heading,
  description,
  imageSrc,
  route,
  availableToPlan,
  onStatusChange,
}: CardComponentProps) {
  const navigate = useNavigate();
  const { currentPlan } = useRouteLoaderData<typeof rootLoader>("root") ?? {};

  const [isUpdating, setIsUpdating] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const isAvailableToCurrentPlan =
    availableToPlan?.plans?.includes("all") ||
    availableToPlan?.plans?.includes(currentPlan);

  const locked = !isAvailableToCurrentPlan;

  const statusTooltip = locked
    ? `Locked for your current plan (${currentPlan}). Upgrade to unlock.`
    : isEnabled
    ? "This widget is ON."
    : "This widget is OFF.";

  const handleToggle = useCallback(async () => {
    if (isUpdating || isNavigating) return;
    
    setIsUpdating(true);
    try {
      await onStatusChange(widgetId, !isEnabled);
    } catch (e) {
      console.error("Failed to toggle widget:", e);
    } finally {
      setIsUpdating(false);
    }
  }, [onStatusChange, widgetId, isEnabled, isUpdating, isNavigating]);

  const handleNavigate = useCallback(
    (path: string) => {
      if (isNavigating || isUpdating) return;
      setIsNavigating(true);
      navigate(path);
    },
    [navigate, isNavigating, isUpdating]
  );

  const handleNavigateSettings = useCallback(
    () => handleNavigate(route),
    [handleNavigate, route]
  );

  const handleNavigateBilling = useCallback(
    () => handleNavigate("/billing"),
    [handleNavigate]
  );

  return (
    <Card>
      <Box padding="300">
        <InlineStack wrap={false} blockAlign="start" gap="400">
          <Box width="66%">
            <BlockStack gap="400">
              <InlineStack gap="200" blockAlign="center" wrap={false}>
                <StatusBadge
                  locked={locked}
                  isEnabled={isEnabled}
                  statusTooltip={statusTooltip}
                />

                <Text as="h3" variant="headingSm" fontWeight="medium">
                  {heading}
                </Text>
              </InlineStack>

              <Text as="p" tone="subdued" variant="bodySm">
                {description}
              </Text>

              <ActionButtons
                locked={locked}
                isEnabled={isEnabled}
                isUpdating={isUpdating}
                isNavigating={isNavigating}
                onToggle={handleToggle}
                onNavigateSettings={handleNavigateSettings}
                onNavigateBilling={handleNavigateBilling}
              />
            </BlockStack>
          </Box>

          <WidgetImage
            src={imageSrc}
            alt={`${heading} widget illustration`}
            heading={heading}
          />
        </InlineStack>
      </Box>
    </Card>
  );
});

CardComponent.displayName = "CardComponent";
export default CardComponent;