
export const run: ActionRun = async ({ logger, connections }: {logger: any, connections: any}) => {
  try {
    const themesQuery = `
      query getThemesWithTemplates {
        themes(first: 50) {
          edges {
            node {
              id
              name
              role
              files(
                first: 30
                filenames: [
                  "templates/index.json", 
                  "templates/product.json", 
                  "config/settings_data.json"
                ]
              ) {
                edges {
                  node {
                    filename
                    body {
                      ... on OnlineStoreThemeFileBodyText {
                        content
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await connections.shopify.current.graphql(themesQuery);

    // Configuration for different environments
    const config = {
      development: "cm-ymm",
      production: "autofit-ai-year-make-model",
    }; 

    const appHandle = config[process.env.NODE_ENV as keyof typeof config] || "cm-ymm";
    const appIdentifier = process.env.NODE_ENV === 'production' ? 'autofit-ai-year-make-model' : 'cm-ymm';
    
    // Define widget identifiers for blocks (excluding AI as it's settings-based)
    const widgetTypes: Record<string, string> = {
      fitment: `${appHandle}/blocks/fitmentWidget`,
      verify: `${appHandle}/blocks/verifyFitmentWidget`,
      table: `${appHandle}/blocks/fitmentTable`
    };

    const results: Array<{
      id: string;
      name: string;
      role: string;
      widgets: Record<string, boolean>;
    }> = [];

    for (const themeEdge of response.themes.edges) {
      const theme = themeEdge.node;

      // Initialize widgets status
      const widgets: Record<string, boolean> = {
        fitment: false,
        verify: false,
        table: false,
        ai: false,
      };

      // Organize files by filename for easier processing
      const filesByName: Record<string, any> = {};
      for (const fileEdge of theme.files?.edges || []) {
        const file = fileEdge.node;
        if (file?.filename && file?.body?.content) {
          filesByName[file.filename] = file;
        }
      }

      // Process template files (index.json, product.json) for block-based widgets
      const templateFiles = ['templates/index.json', 'templates/product.json'];
      
      for (const templateFile of templateFiles) {
        const file = filesByName[templateFile];
        if (file?.body?.content) {
          try {
            const widgets_status = parseTemplateFile(file.body.content, widgetTypes, logger, theme.name, templateFile);
            
            // Merge results - if any template has a widget active, mark it as active
            for (const [widgetKey, isActive] of Object.entries(widgets_status)) {
              widgets[widgetKey] = widgets[widgetKey] || isActive;
            }
          } catch (err) {
            logger.warn(`Failed to parse ${templateFile} for theme ${theme.name}`, { err });
          }
        }
      }

      // Special handling for AI chatbot - check if app is enabled in settings_data.json
      const settingsFile = filesByName['config/settings_data.json'];
      if (settingsFile?.body?.content) {
        try {
          const aiStatus = checkAppEnabledInSettings(settingsFile.body.content, appIdentifier, logger, theme.name);
          widgets.ai = aiStatus;
        } catch (err) {
          logger.warn(`Failed to parse settings_data.json for theme ${theme.name}`, { err });
          widgets.ai = false;
        }
      } else {
        // If no settings file, AI is not enabled
        widgets.ai = false;
      }

      results.push({
        id: theme.id,
        name: theme.name,
        role: theme.role,
        widgets,
      });
    }

    return results;
  } catch (error) {
    logger.error("Error fetching theme templates", { error });
    throw error;
  }
};

/**
 * Parse template JSON files to check for widget blocks
 */
function parseTemplateFile(
  content: string, 
  widgetTypes: Record<string, string>, 
  logger: any, 
  themeName: string, 
  filename: string
): Record<string, boolean> {
  const widgets: Record<string, boolean> = {
    fitment: false,
    verify: false,
    table: false,
  };

  try {
    let cleanContent = content.trim();

    // Remove /* ... */ comment headers
    cleanContent = cleanContent.replace(/\/\*[\s\S]*?\*\//g, "").trim();

    // Start from the first { to skip any stray text
    const jsonStart = cleanContent.indexOf("{");
    if (jsonStart > -1) {
      cleanContent = cleanContent.substring(jsonStart);
    }

    const json = JSON.parse(cleanContent);

    // Check sections for blocks
    if (json.sections && typeof json.sections === 'object') {
      for (const sectionKey in json.sections) {
        const section = json.sections[sectionKey];
        
        if (section && typeof section === 'object' && section.blocks) {
          for (const blockKey in section.blocks) {
            const block = section.blocks[blockKey];
            
            if (block && typeof block === 'object' && block.type) {
              // Check each widget type
              for (const [widgetKey, identifier] of Object.entries(widgetTypes)) {
                if (block.type.includes(identifier) || block.type === identifier) {
                  // Check if block is enabled (not disabled)
                  const isActive = block.disabled !== true;
                  widgets[widgetKey] = widgets[widgetKey] || isActive;
                }
              }
            }
          }
        }
      }
    }

  } catch (err) {
    logger.warn(`JSON parsing error in ${filename} for theme ${themeName}`, { 
      error: err.message,
      contentPreview: content.substring(0, 200) 
    });
  }

  return widgets;
}

/**
 * Check if the app is enabled in settings_data.json for AI chatbot functionality
 */
function checkAppEnabledInSettings(
  content: string, 
  appIdentifier: string, 
  logger: any, 
  themeName: string
): boolean {
  try {
    let cleanContent = content.trim();

    // Remove /* ... */ comment headers
    cleanContent = cleanContent.replace(/\/\*[\s\S]*?\*\//g, "").trim();

    // Start from the first { to skip any stray text
    const jsonStart = cleanContent.indexOf("{");
    if (jsonStart > -1) {
      cleanContent = cleanContent.substring(jsonStart);
    }

    const json = JSON.parse(cleanContent);

    // Method 1: Check current settings for app-specific configurations
    if (json.current && typeof json.current === 'object') {
      for (const key in json.current) {
        if (key.includes(appIdentifier)) {
          const appSettings = json.current[key];
          
          // If app settings exist and are not empty, consider it enabled
          if (typeof appSettings === 'object' && appSettings !== null) {
            const settingsKeys = Object.keys(appSettings);
            
            // Check for explicit enablement flags
            if (
              appSettings.enabled === true ||
              appSettings.enable === true ||
              appSettings.active === true ||
              appSettings.show === true ||
              appSettings.display === true ||
              appSettings.chatbot_enabled === true ||
              appSettings.chat_enabled === true ||
              appSettings.ai_enabled === true
            ) {
              return true;
            }
            
            // If no explicit disable flag and has meaningful settings, consider enabled
            if (settingsKeys.length > 0 && appSettings.enabled !== false) {
              return true;
            }
          }
        }
      }
    }

    // Method 2: Check app embeds in blocks section
    if (json.current.blocks && typeof json.current.blocks === 'object') {
      for (const blockKey in json.current.blocks) {
        const block = json.current.blocks[blockKey];
        if (block && typeof block === 'object' && block.type) {
          // Check if this is an app embed block for our app
          if (block.type.includes(appIdentifier) || block.type.includes('apps') && 
              (block.settings && JSON.stringify(block.settings).includes(appIdentifier))) {
            
            // App embed found, check if it's enabled
            const isEnabled = block.disabled !== true;
            if (isEnabled) {
              return true;
            }
          }
        }
      }
    }

    // Method 3: Check if app identifier appears anywhere in the settings (fallback)
    const contentString = JSON.stringify(json);
    if (contentString.includes(appIdentifier)) {
      // App is referenced in settings, do additional checks
      const appReferences = (contentString.match(new RegExp(appIdentifier, 'g')) || []).length;
      if (appReferences > 0) {
        // Check if it's not explicitly disabled
        if (!contentString.includes(`"${appIdentifier}":false`) && 
            !contentString.includes(`"enabled":false`) &&
            !contentString.includes(`"disabled":true`)) {
          return true;
        }
      }
    }

    return false;

  } catch (err) {
    logger.warn(`Failed to parse settings_data.json for AI status in theme ${themeName}`, { 
      error: err.message,
      contentPreview: content.substring(0, 200)
    });
    return false;
  }
}

export const params = {};

export const returns = {
  type: "list",
  fields: {
    id: { type: "string" },
    name: { type: "string" },
    role: { type: "string" },
    widgets: {
      type: "object",
      fields: {
        fitment: { type: "boolean" },
        verify: { type: "boolean" },
        table: { type: "boolean" },
        ai: { type: "boolean" },
      },
    },
  },
};