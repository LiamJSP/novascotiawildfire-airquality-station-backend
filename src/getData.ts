import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

const db = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

export const handler: APIGatewayProxyHandler = async () => {
    const result = await db.scan({
      TableName: TABLE_NAME,
    }).promise();
  
    return {
      statusCode: 200,
      body: JSON.stringify(result.Items),
    };
  };