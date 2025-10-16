import { RouteHandler } from "gadget-server";

export const method = "POST";
export const path = "/getCollections";

const route: RouteHandler = async ({ request, reply, connections, logger }) => {
  const shopify = connections.shopify.current;

  if (!shopify) return;

  const query = `
    query {
      collections(first: 50) {
        edges {
          node {
            id
            title
            handle
            image {
              originalSrc
            }
            products(first: 100) {
              edges {
                node {
                  title
                  variants(first: 10) {
                    edges {
                      node {
                        sku
                      }
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

  try {
    const response = await shopify.graphql(query);

    logger.info(JSON.stringify(response) + "what is response");

    const collections = response.collections.edges;

    const formatted = collections.map((edge: any) => {
      const node = edge.node;

      return {
        collectionId: node.id,
        collectionName: node.title,
        collectionImage: node.image?.originalSrc || null,
        products: node.products.edges.map((productEdge: any) => ({
          productName: productEdge.node.title,
          skus: productEdge.node.variants.edges
            .map((variantEdge: any) => variantEdge.node.sku)
            .filter(Boolean)
        }))
      };
    });

    return reply.status(200).send({ success: true, data: formatted });
  } catch (error: any) {
    logger.error("Shopify error:", error?.response?.errors || error);
    return reply.status(500).send({
      success: false,
      error: error?.response?.errors || error.message || "Unknown error"
    });
  }
};

export default route;
