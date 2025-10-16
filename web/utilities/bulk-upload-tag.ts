function buildProductUpdateMutation(productId: string, tags: string[]) {
  return `
    productUpdate(input: {
      id: "${productId}",
      tags: [${tags.map((t) => `"${t}"`).join(', ')}]
    }) {
      product {
        id
        tags
      }
      userErrors {
        field
        message
      }
    }
  `;
}

function buildBulkMutation(productTagPairs: { productId: string; tags: string[] }[]) {
  return (
    `mutation {\n` +
    productTagPairs
      .map((p, i) => `mutation${i}: ${buildProductUpdateMutation(p.productId, p.tags)}`)
      .join('\n') +
    `\n}`
  );
}

async function shopifyGraphqlRequest(query: string, accessToken: string, shop: string) {
  const res = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  const json = await res.json();
  if (json.errors) {
    console.error('Shopify GraphQL Errors:', json.errors);
  }
  return json.data;
}

export async function bulkUpdateProductTags(
  productsWithTags: { productId: string; tags: string[] }[],
  shop: string,
  accessToken: string
) {
  const BATCH_SIZE = 10;

  for (let i = 0; i < productsWithTags.length; i += BATCH_SIZE) {
    const batch = productsWithTags.slice(i, i + BATCH_SIZE);
    const query = buildBulkMutation(batch);
    const result = await shopifyGraphqlRequest(query, accessToken, shop);
    console.log(`Updated batch ${i / BATCH_SIZE + 1}:`, result);
    await new Promise((res) => setTimeout(res, 500));
  }
}
