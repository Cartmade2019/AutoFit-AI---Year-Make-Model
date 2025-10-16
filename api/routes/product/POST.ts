import { RouteHandler } from "gadget-server";

export const method = "POST";
export const path = "/fetchProducts";

const route: RouteHandler = async ({ request, reply, connections, logger }) => {
  const shopify = connections.shopify.current;

  if (!shopify) {
    return reply
      .status(401)
      .send({ success: false, message: "Shopify connection missing" });
  }

  const query = `
    query {
      products(first: 50) {
        edges {
          node {
            id
            title
            featuredImage {
              originalSrc
            }
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
  `;

  try {
    const response = await shopify.graphql(query);
    const products = response.products.edges;

    const formatted = products.map((edge: any) => {
      const node = edge.node;
      return {
        id: node.id,
        title: node.title,
        image: node.featuredImage?.originalSrc || null,
        skus: node.variants.edges
          .map((variantEdge: any) => variantEdge.node.sku)
          .filter(Boolean)
      };
    });

    return reply.status(200).send({ success: true, data: formatted });
  } catch (error: any) {
    logger.error("Shopify fetch error:", error?.response?.errors || error);
    return reply.status(500).send({
      success: false,
      message: "Failed to fetch products",
      error: error?.response?.errors || error.message
    });
  }
};

export default route;
