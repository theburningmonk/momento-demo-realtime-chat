const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);
const middy = require('@middy/core');
const cors = require('@middy/http-cors');

/**
 * 
 * @param {import('aws-lambda').APIGatewayProxyEvent} event 
 * @returns {Promise<import('aws-lambda').APIGatewayProxyResult>}
 */
module.exports.handler = middy(async () => {
  const { Items } = await dynamodb.send(new ScanCommand({
    TableName: process.env.CHATS_TABLE_NAME    
  }))

  const chats = Items.map(x => ({ chatName: x.chatName }))
  return {
    statusCode: 200,
    body: JSON.stringify(chats)
  }
})
.use(cors());