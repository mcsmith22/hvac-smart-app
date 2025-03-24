const { CosmosClient } = require('@azure/cosmos');

module.exports = async function (context, req) {

  const endpoint = process.env.COSMOS_ENDPOINT; 
  const key = process.env.COSMOS_KEY;


  const databaseId = "ColorsDB";
  const containerId = "ColorReadings";


  const client = new CosmosClient({ endpoint, key });
  const container = client.database(databaseId).container(containerId);

  try {
    const querySpec = {
      query: "SELECT TOP 1 * FROM c ORDER BY c._ts DESC"
    };

    const { resources } = await container.items.query(querySpec).fetchAll();

    if (!resources.length) {
      context.res = { status: 404, body: "No documents found." };
      return;
    }

    const mostRecentDoc = resources[0];

    context.res = {
      status: 200,
      body: {
        id: mostRecentDoc.id,
        color: mostRecentDoc.color,
        date_of_record: mostRecentDoc.date_of_record,
      }
    };
  } catch (err) {
    context.log.error("Error querying Cosmos DB:", err);
    context.res = {
      status: 500,
      body: "Error retrieving most recent item."
    };
  }
};
