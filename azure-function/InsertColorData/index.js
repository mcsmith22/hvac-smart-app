const { CosmosClient } = require('@azure/cosmos');

module.exports = async function (context, req) {

  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const databaseId = "ColorsDB";
  const containerId = "ColorReadings";

  const client = new CosmosClient({ endpoint, key });
  const container = client.database(databaseId).container(containerId);

  const errorDict = {
    "short long long long": "FAILURE: LIMIT CIRCUIT LOCKOUT",
    "short short long long long": "WARNING: PRESSURE SWITCH DID NOT OPEN",
    "short short short long long long": "FAILURE: LIMIT CIRCUIT FAULT",
    "short long long": "WARNING: BLOWER ON AFTER POWER UP",

  };

  try {
    if (
      !req.body ||
      !req.body.id ||
      !req.body.color ||
      !req.body.deviceId ||
      !req.body.date_of_req ||
      !req.body.flash_sequence ||
      !req.body.amp_measurement ||
      !req.body.gas_value ||
      !req.body.unit_type ||
      !req.body.userId
    ) {
      context.res = {
        status: 400,
        body: "Invalid request. Ensure 'id', 'color', 'deviceId', 'date_of_req', 'flash_sequence', 'amp_measurement', 'gas_value', 'unit_type', and 'userId' are included."
      };
      return;
    }

    const newItem = {
      id: req.body.id,
      date_of_req: req.body.date_of_req,
      deviceId: req.body.deviceId,
      color: req.body.color,
      flash_sequence: errorDict[req.body.flash_sequence] || "NO ERROR",
      amp_measurement: req.body.amp_measurement,
      gas_value: req.body.gas_value,
      unit_type: req.body.unit_type,
      userId: req.body.userId
    };

    
    await container.items.create(newItem);

    context.res = {
      status: 201,
      body: { message: "Data inserted successfully!", insertedItem: newItem }
    };
  } catch (err) {
    context.log.error("Error inserting into Cosmos DB:", err);
    context.res = {
      status: 500,
      body: "Error inserting data into Cosmos DB."
    };
  }
};