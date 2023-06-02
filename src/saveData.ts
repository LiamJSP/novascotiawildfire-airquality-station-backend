import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB, Lambda } from 'aws-sdk';

const db = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

const html_render_lambda = new Lambda({ region: 'us-east-1' });

export const handler: APIGatewayProxyHandler = async (event) => {
    const item = JSON.parse(event.body || '{}');
  
    await db.put({
      TableName: TABLE_NAME,
      Item: item,
    }).promise();

    /* REFACTOR STARTS HERE */

    const stage = process.env.STAGE || 'dev';
    const lambdaResponse = await html_render_lambda.invoke({
        FunctionName: `pi-sensor-service-${stage}-embedHtml`,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(event, null, 2)
    }).promise();
    
    console.log('HTML Render Lambda response: ', lambdaResponse);

    /* REFACTOR ENDS HERE */

    return {
      statusCode: 200,
      body: JSON.stringify(item),
    };
  };