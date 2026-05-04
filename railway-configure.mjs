const TOKEN = 'e1480c64-1881-4d73-a984-9786e42d5c97';
const PROJECT_ID = '17ea66a7-750c-4c8a-8d55-51ff0f72b56c';
const ENV_ID = 'b85ab596-2a60-4dcf-bd44-2e00acc89b9d';
const APP_SVC_ID = '3e796e7b-29c9-4012-96f9-9a2e1cf7f718';
const MCP_SVC_ID = '5043177d-0bdd-408a-8291-33719ccb964a';
const API = 'https://backboard.railway.app/graphql/v2';

async function gql(q) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q })
  });
  const d = await r.json();
  if (d.errors) throw new Error(d.errors[0].message);
  return d.data;
}

// Services already renamed in previous run — skip rename step

// Set MCP root directory (idempotent)
await gql(`mutation {
  serviceInstanceUpdate(
    environmentId: "${ENV_ID}",
    serviceId: "${MCP_SVC_ID}",
    input: { rootDirectory: "mcp-server" }
  )
}`);
console.log('MCP root dir = mcp-server');

const DB_REF = '$' + '{{Postgres.DATABASE_URL}}';

// Set MCP env vars (DATABASE_URL references Postgres service)
const mcpVarsMutation = `mutation {
  variableCollectionUpsert(input: {
    projectId: "${PROJECT_ID}",
    environmentId: "${ENV_ID}",
    serviceId: "${MCP_SVC_ID}",
    variables: {
      NODE_ENV: "production",
      DATABASE_URL: "${DB_REF}",
      MCP_API_KEY: "mcp_ca8f896dac0194b0d29260861da06c8c4fc6a07f4afafc93a89046e4d52e7ed6",
      INGEST_API_KEY: "ingest_dd8210af261f2c8053f6d38e5ca6217cd215340e73b7746e767123d6f43ae796",
      PORT: "3001"
    }
  })
}`;
await gql(mcpVarsMutation);
console.log('MCP env vars set');

// Set app env vars
const appVarsMutation = `mutation {
  variableCollectionUpsert(input: {
    projectId: "${PROJECT_ID}",
    environmentId: "${ENV_ID}",
    serviceId: "${APP_SVC_ID}",
    variables: {
      NODE_ENV: "production",
      DATABASE_URL: "${DB_REF}"
    }
  })
}`;
await gql(appVarsMutation);
console.log('App env vars set');

// Generate domains
const mcpDomain = await gql(`mutation {
  serviceDomainCreate(input: { environmentId: "${ENV_ID}", serviceId: "${MCP_SVC_ID}" }) { domain }
}`);
console.log('MCP domain:', mcpDomain.serviceDomainCreate.domain);

const appDomain = await gql(`mutation {
  serviceDomainCreate(input: { environmentId: "${ENV_ID}", serviceId: "${APP_SVC_ID}" }) { domain }
}`);
console.log('App domain:', appDomain.serviceDomainCreate.domain);
