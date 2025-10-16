export const run: ActionRun = async ({ params, logger, api, connections }: { params: any, logger: any, api: any, connections: any }) => {
  const shopId: any = connections?.shopify?.currentShopId;

  // Determine the app key to check for based on environment
  const appIdentifier = process.env.NODE_ENV === 'production' ? 'autofit-ai-year-make-model' : 'cm-ymm';

  try {
    const themesQuery = `
      query getThemesWithSettings {
        themes(first: 50) {
          edges {
            node {
              id
              name
              role
              files(first: 1, filenames: ["config/settings_data.json"]) {
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

    const response = await connections?.shopify?.current.graphql(themesQuery);

    for (const themeEdge of response.themes.edges) {
      const theme = themeEdge.node;
      logger.info(`Checking theme: ${theme.name} (${theme.role})`);

      const settingsFile = theme.files?.edges?.[0];

      if (settingsFile?.node?.body?.content) {
        try {
          let jsonString = settingsFile.node.body.content;

          const jsonStartIndex = jsonString.indexOf('{');
          if (jsonStartIndex > -1) {
            jsonString = jsonString.substring(jsonStartIndex);
          }

          const settings = JSON.parse(jsonString);
          const currentSettings = settings.current || {};

          // 1. Check for Theme App Embeds
          if (currentSettings.apps) {
            for (const appKey in currentSettings.apps) {
              if (appKey.includes(appIdentifier)) {
                return true; // App is enabled
              }
            }
          }

          // 2. Check for App Blocks
          if (currentSettings.blocks) {
            for (const blockKey in currentSettings.blocks) {
              const block = currentSettings.blocks[blockKey];

              if (block && block.type && block.type.includes(appIdentifier)) {
                if (block.disabled === false || typeof block.disabled === 'undefined') {
                  return true; // App is enabled
                } else {
                  logger.info(`Found ${appIdentifier} block in theme ${theme.name}, but it is disabled.`);
                }
              }
            }
          }

        } catch (parseError) {
          logger.warn(`Failed to parse settings_data.json for theme ${theme.name}`, {
            error: parseError
          });
        }
      }
    }

    return false;

  } catch (error) {
    logger.error("Error checking if app is enabled on theme", {
      error: error,
      shopId
    });
    throw error;
  }
};

export const params = {};
