const { DynamoDB } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const dynamodbClient = new DynamoDB();
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);
const middy = require('@middy/core');
const cors = require('@middy/http-cors');

/**
 * @param {import('aws-lambda').APIGatewayProxyEvent} event 
 * @returns {Promise<import('aws-lambda').APIGatewayProxyResult>}
 */
module.exports.handler = middy(async (event) => {
  const { chatName } = JSON.parse(event.body);
  const chat = {
    chatName
  };

  try {
    await dynamodb.send(new PutCommand({
      TableName: process.env.CHATS_TABLE_NAME,
      Item: chat,
      ConditionExpression: "attribute_not_exists(chatName)"
    }));

    return {
      statusCode: 201,
      body: JSON.stringify(chat)
    };
  } catch (err) {
    // if the error is due to the chatName already existing, return a 409 Conflict
    if (err.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        body: JSON.stringify('Chat name already exists')
      };
    } else {
      throw err;
    }
  }
})
.use(cors());