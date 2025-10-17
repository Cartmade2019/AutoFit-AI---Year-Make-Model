import React, { useState, useCallback } from "react";
import {
  Card,
  Button,
  Popover,
  DatePicker,
  ActionList,
} from "@shopify/polaris";

export function AnalyticsDateRangePicker({
  onDateChange,
}: {
  onDateChange?: (range: { start: Date; end: Date }) => void;
}) {
  const [{ month, year }, setDate] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });
  const [popoverActive, setPopoverActive] = useState(false);
  const [selectedDates, setSelectedDates] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  });

  const togglePopoverActive = useCallback(
    () => setPopoverActive((active) => !active),
    []
  );

  const handleMonthChange = useCallback(
    (month: number, year: number) => setDate({ month, year }),
    []
  );

  const handleRangeChange = (range: { start: Date; end: Date }) => {
    setSelectedDates(range);
  };

  const applyQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setSelectedDates({ start, end });
    onDateChange?.({ start, end });
    setPopoverActive(false);
  };

  const handleApply = () => {
    onDateChange?.(selectedDates);
    setPopoverActive(false);
  };

  const activator = (
    <Button onClick={togglePopoverActive} disclosure>
      {`${selectedDates.start.toLocaleDateString()} - ${selectedDates.end.toLocaleDateString()}`}
    </Button>
  );

  return (
    <Popover
      active={popoverActive}
      activator={activator}
      onClose={togglePopoverActive}
      preferredAlignment="left"
      preferredPosition="below"
      fullWidth={false}
      fluidContent={true}
    >
      <div style={{ width: "700px", padding: "16px", backgroundColor: "white" }}>
        <div style={{ display: "flex", gap: "16px" }}>
          {/* Quick ranges */}
          <div style={{ width: "200px" }}>
            <ActionList
              items={[
                { content: "Today", onAction: () => applyQuickRange(0) },
                { content: "Yesterday", onAction: () => applyQuickRange(1) },
                { content: "Last 7 days", onAction: () => applyQuickRange(7) },
                { content: "Last 30 days", onAction: () => applyQuickRange(30) },
                { content: "Last 90 days", onAction: () => applyQuickRange(90) },
              ]}
            />
          </div>

          {/* Calendar */}
          <div style={{ flex: 1 }}>
            <Card>
              <DatePicker
                month={month}
                year={year}
                onChange={handleRangeChange}
                onMonthChange={handleMonthChange}
                selected={selectedDates}
                allowRange
              />
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "16px",
            gap: "8px",
          }}
        >
          <Button onClick={togglePopoverActive} variant="plain">
            Cancel
          </Button>
          <Button onClick={handleApply} variant="primary">
            Apply
          </Button>
        </div>
      </div>
    </Popover>
  );
}
