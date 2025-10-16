import {
  Card,
  Tabs,
  Text,
  Button
} from "@shopify/polaris";
import { useState, useCallback, Dispatch, SetStateAction } from "react";
import { Appereance , Colors } from './Appereance';
import {Options} from './Options'


export function FitmentSettings({
  setShowHeading,
  showHeading,
  setFormHeading,
  setFormSubHeading,
  formHeading,
  formSubHeading,
  setTheme,
  setAction,
  theme,
  action,
  layout,
  setLayout,
  customCss,
  setCustomCss,
  colors,
  setColors,
  autoSubmitOptions,
  setAutoSubmitOptions,
  hideSubmitOptions,
  setHideSubmitOptions,
  collapseForm,
  setCollapseForm,
  searchWithinCollection,
  setSearchWithinCollection,
  applyFiltersAcrossCollections,
  setApplyFiltersAcrossCollections,
  formMode,
  setFormMode
}: {
  setShowHeading: Dispatch<SetStateAction<boolean>>,
  showHeading: boolean,
  setFormHeading: Dispatch<SetStateAction<string | null>>,
  setFormSubHeading: Dispatch<SetStateAction<string | null>>,
  formHeading: string | null,
  formSubHeading: string | null,
  setTheme:(newTheme: "light" | "dark") => void,
  setAction: Dispatch<SetStateAction<"clear" | "icon">>,
  theme: string ,
  action: string,
  layout : "horizontal" | "vertical" ,
  setLayout: Dispatch<SetStateAction<"horizontal" | "vertical">> ,
  customCss: string,
  setCustomCss: Dispatch<SetStateAction<string>>,
  colors: Colors,
  setColors:(newColors: Colors) => void,
  autoSubmitOptions : boolean ,
  setAutoSubmitOptions: Dispatch<SetStateAction<boolean>>,
  hideSubmitOptions: boolean,
  setHideSubmitOptions: Dispatch<SetStateAction<boolean>> ,
  collapseForm: boolean,
  setCollapseForm: Dispatch<SetStateAction<boolean>>,
  searchWithinCollection : boolean,
  setSearchWithinCollection :  Dispatch<SetStateAction<boolean>>,
  applyFiltersAcrossCollections: boolean,
  setApplyFiltersAcrossCollections:  Dispatch<SetStateAction<boolean>>,
  formMode: string,
  setFormMode: Dispatch<SetStateAction<string>>
}) {

  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [
    { id: "appearance", content: "Appearance" },
    { id: "options", content: "Options" },
  ];

  const handleTabChange = useCallback((selectedIndex: number) => setSelectedTab(selectedIndex), []);

  return (
    <div style={{ marginTop: "1rem", marginBottom: "2rem" }}>
      <Card padding='0'>
        <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
          <div>
            {selectedTab === 0 && (
              <>
                <Appereance
                  setShowHeading={setShowHeading}
                  showHeading={showHeading}
                  setFormHeading={setFormHeading}
                  setFormSubHeading={setFormSubHeading}
                  formHeading={formHeading}
                  formSubHeading={formSubHeading}
                  setTheme={setTheme}
                  setAction={setAction}
                  theme={theme}
                  action={action}
                  layout={layout}
                  setLayout={setLayout}
                  customCss={customCss}
                  setCustomCss={setCustomCss}
                  colors={colors}
                  setColors={setColors}
                />
              </>
            )}
            {selectedTab === 1 && (
             <Options
               autoSubmitOptions={autoSubmitOptions}
               setAutoSubmitOptions={setAutoSubmitOptions}
               hideSubmitOptions={hideSubmitOptions}
               setHideSubmitOptions={setHideSubmitOptions}
               collapseForm={collapseForm}
               setCollapseForm={setCollapseForm}
               searchWithinCollection={searchWithinCollection}
               setSearchWithinCollection={setSearchWithinCollection}
               applyFiltersAcrossCollections={applyFiltersAcrossCollections}
               setApplyFiltersAcrossCollections={setApplyFiltersAcrossCollections}
               formMode={formMode}
               setFormMode={setFormMode}
               />
            )}
          </div>
        </Tabs>
      </Card>
    </div>
  )
}
