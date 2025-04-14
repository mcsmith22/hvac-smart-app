const { CosmosClient } = require('@azure/cosmos');
const path = require('path');

module.exports = async function (context, req) {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const databaseId = "ColorsDB";
  const containerId = "ColorReadings";

  const client = new CosmosClient({ endpoint, key });
  const container = client.database(databaseId).container(containerId);

  try {
    let querySpec;
    if (req.query.deviceId) {
      querySpec = {
        query: "SELECT * FROM c WHERE c.deviceId = @deviceId",
        parameters: [{ name: "@deviceId", value: req.query.deviceId }],
      };
    } else {
      querySpec = { query: "SELECT * FROM c" };
    }

    const { resources: devices } = await container.items.query(querySpec).fetchAll();

    context.res = {
      status: 200,
      body: devices
    };
  } catch (error) {
    context.log.error('Error fetching devices:', error);
    context.res = { status: 500, body: 'Error fetching device data.' };
  }
};
