const { CosmosClient } = require('@azure/cosmos');
const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
  const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

module.exports = async function (context, req) {

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    context.res = { status: 401, body: 'Unauthorized: Missing or invalid token' };
    return;
  }
  const idToken = authHeader.split(' ')[1];


  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    context.log.error('Error verifying token:', error);
    context.res = { status: 401, body: 'Unauthorized: Invalid token' };
    return;
  }
  const uid = decodedToken.uid;


  const endpoint = process.env.COSMOS_ENDPOINT; 
  const key = process.env.COSMOS_KEY;
  const databaseId = "ColorsDB"; 
  const containerId = "ColorReadings"; 

  const client = new CosmosClient({ endpoint, key });
  const container = client.database(databaseId).container(containerId);


  try {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.userId = @uid",
      parameters: [{ name: "@uid", value: uid }]
    };

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