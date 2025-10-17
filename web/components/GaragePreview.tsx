import { useState, useEffect } from "react";
import type { GarageWidgetConfig } from "../types/widget";

export default function GaragePreview({ config }: { config: GarageWidgetConfig }) {
  // Preview state
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Static preview options
  const years = ["2023", "2024"];
  const makes = ["BMW", "Audi"];
  const models = ["X5", "Q7"];

useEffect(() => {
  if (vehicles.length > 0) {
    setSelectedIndex(0); 
  } else {
    setSelectedIndex(null);
  }
}, [vehicles]);

  const resetForm = () => {
    setYear("");
    setMake("");
    setModel("");
  };

  const handleAddVehicle = () => {
    if (!year || !make || !model) return;
    setVehicles([...vehicles, { year, make, model }]);
    resetForm();
    setShowForm(false);
  };

  const handleDelete = (index: number) => {
    setVehicles(vehicles.filter((_, i) => i !== index));
  };

  /* Reusable styles */
  const dropdownStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "6px",
    border: `1px solid ${config.appearance.colors.border_color}`,
    fontSize: "13px",
    backgroundColor: config.appearance.colors.input_background_color,
  };

  const primaryBtnStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: config.appearance.colors.primary_button_color,
    color: config.appearance.colors.primary_button_text_color,
    fontSize: "14px",
    fontWeight: 600,
    marginTop: "8px",
    cursor: "pointer",
  };

  const secondaryBtnStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    backgroundColor: config.appearance.colors.secondary_button_color,
    color: config.appearance.colors.secondary_button_text_color,
    fontSize: "14px",
    fontWeight: 500,
    marginTop: "8px",
    cursor: "pointer",
  };

  return (
    <div
     style={{
    position: "fixed",
    zIndex: 9999,
    width: open ? "360px" : "80px",
    minHeight: open ? "200px" : "130px",
    maxHeight: open ? "80vh" : "120px",
    backgroundColor: config.appearance.colors.background_color,
    border: "1px solid #ccc",
    borderRadius:
      config.appearance.position === "left"
        ? "0 8px 8px 0"
        : config.appearance.position === "right"
        ? "8px 0 0 8px"
        : "8px 8px 0 0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    overflow: "hidden",
    ...(config.appearance.position === "right" && {
      top: "30%",
      right: 0,
      transform: "translateY(-50%)",
    }),
    ...(config.appearance.position === "left" && {
      top: "30%",
      left: 0,
      transform: "translateY(-50%)",
    }),
    ...(config.appearance.position === "bottom" && {
      bottom: 0,
      left: "90%",
      transform: "translateX(-50%)",
    }),
  }}
      onClick={() => setOpen(true)}
    >
    {open && (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setOpen(false);
      }}
      style={{
        position: "absolute",
        top: "8px",
        right: "8px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: "18px",
        color: "#666",
        zIndex: 10,
      }}
    >
      ✕
    </button>
  )}
      {!open && (
        <>
         <div style={{display: "flex", flexDirection: "column", gap: "1rem" , alignItems: "center"}}> 
          {config.appearance.show_icons && (
            <img
              src={config.appearance.garage_icon_url}
              alt="Garage"
              style={{ width: 28, height: 28, marginBottom: "8px" }}
            />
          )}
          {config.appearance.show_title && (
            <span
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                fontSize: "18px",
                fontWeight: 600,
                color: config.appearance.colors.text_color,
                whiteSpace: "nowrap",
              }}
            >
              {config.translations.title}
            </span>
          )}
          </div> 
        </>
      )}

      {open && (
        <div
          style={{
            padding: "16px",
            width: "100%",
            background: config.appearance.colors.background_color,
            borderRadius: "6px",
            textAlign: "center",
            position: "relative",
          }}
        >
     
          {!showForm ? (
            <>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: config.appearance.colors.text_color,
                }}
              >
                {config.translations.open_title}
              </h3>

              {/* Vehicle list */}
              {vehicles.length > 0 ? (
                vehicles.map((v, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    style={{
                      border:
                        selectedIndex === i
                          ? `2px solid ${config.appearance.colors.selected_border_color}`
                          : "1px solid #ccc",
                      borderRadius: "8px",
                      padding: "12px",
                      marginTop: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: "600",
                          color: config.appearance.colors.text_color,
                        }}
                      >
                        {v.year} {v.make} {v.model}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(i);
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: "#d00",
                        fontSize: "18px",
                      }}
                    >
                      🗑
                    </button>
                  </div>
                ))
              ) : (
                <p
                  style={{
                    fontSize: "13px",
                    color: config.appearance.colors.text_color,
                    marginTop: "8px",
                  }}
                >
                  {config.translations.empty_state}
                </p>
              )}

              <button style={primaryBtnStyle} onClick={() => setShowForm(true)}>
                {config.translations.add_button}
              </button>
            </>
          ) : (
            <>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  marginBottom: "16px",
                  color: config.appearance.colors.text_color,
                }}
              >
                {config.translations.select_vehicle}
              </h3>

              {/* Dropdowns */}
              <select
                style={dropdownStyle}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="">Select Year</option>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>

              <select
                style={dropdownStyle}
                value={make}
                onChange={(e) => setMake(e.target.value)}
              >
                <option value="">Select Make</option>
                {makes.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>

              <select
                style={dropdownStyle}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="">Select Model</option>
                {models.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>

              <button style={primaryBtnStyle} onClick={handleAddVehicle}>
                {config.translations.add_garage_button}
              </button>
              <button
                style={secondaryBtnStyle}
                onClick={() => setShowForm(false)}
              >
                {config.translations.cancel_button}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
