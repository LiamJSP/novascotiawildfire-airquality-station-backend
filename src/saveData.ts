import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB, Lambda, S3 } from 'aws-sdk';

const db = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

const html_render_lambda = new Lambda({ region: 'us-east-1' });

export const handler: APIGatewayProxyHandler = async (event) => {
    const s3 = new S3();
    const sensorData = JSON.parse(event.body || '{}');
  
    await db.put({
      TableName: TABLE_NAME,
      Item: sensorData,
    }).promise();

    // Create HTML content
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <title>${sensorData.location}</title>
    </head>
    <body>
    <table>
    <tr>
        <th>DateTime</th>
        <th>Location</th>
        <th>PM1.0</th>
        <th>PM2.5</th>
        <th>PM10.0</th>
    </tr>
    <tr>
        <td>${sensorData.datetime}</td>
        <td>${sensorData.location}</td>
        <td>${sensorData['pm1.0']}</td>
        <td>${sensorData['pm2.5']}</td>
        <td>${sensorData['pm10.0']}</td>
    </tr>
    </table>
    </body>
    </html>
    `;

    // Upload HTML to S3
    await s3.putObject({
    Bucket: process.env.BUCKET_NAME,
    Key: 'index.html',
    Body: htmlContent,
    ContentType: 'text/html',
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(sensorData),
    };
  };