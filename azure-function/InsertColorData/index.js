const { CosmosClient } = require('@azure/cosmos');

module.exports = async function (context, req) {

  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const databaseId = "ColorsDB";
  const containerId = "ColorReadings";

  const client = new CosmosClient({ endpoint, key });
  const container = client.database(databaseId).container(containerId);


  try {
    if (
      !req.body ||
      !req.body.id ||
      !req.body.color ||
      !req.body.deviceId ||
      !req.body.date_of_req ||
      !req.body.flash_sequence ||
      !req.body.amp_measurement ||
      !req.body.gas_value
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
      flash_sequence: req.body.flash_sequence,
      amp_measurement: req.body.amp_measurement,
      gas_value: req.body.gas_value,
    };
    // I want to add code here to check if the last flash sequnce, gas measurement, and amp measurement were the sama as the one i'm inserting
    // if not, I want to send a remoote notification that alerts a status change for the device.id (eg. DEVICE ___ HAS NEW ERROR)
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