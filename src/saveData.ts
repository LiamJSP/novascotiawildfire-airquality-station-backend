import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB, Lambda, S3 } from 'aws-sdk';
import Ajv from 'ajv';

const db = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME || '';

const html_render_lambda = new Lambda({ region: 'us-east-1' });

const ajv = new Ajv();

// JSON schema
const sensorDataSchema = {
  type: 'object',
  properties: {
    datetime: { type: 'string' },
    location: { type: 'string' },
    pm1: { type: 'number' },
    pm2_5: { type: 'number' },
    pm10: { type: 'number' }
  },
  required: ['datetime', 'location', 'pm1', 'pm2_5', 'pm10']
};

export const handler: APIGatewayProxyHandler = async (event) => {
    const s3 = new S3();
    const sensorData = JSON.parse(event.body || '{}');

    // Validate sensorData against the schema
    const validate = ajv.compile(sensorDataSchema);
    const valid = validate(sensorData);

    //If invalid data, send a 400 error code, breaking execution here
    if (!valid) {
        console.log(validate.errors);
        return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid data' }),
        };
    }
  
    await db.put({
      TableName: TABLE_NAME,
      Item: sensorData,
    }).promise();

    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <title>NS Wildfire Monitoring Station</title>
    </head>
    <body>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');

        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #E9F7CA;
            font-family: 'Roboto', sans-serif;
        }
        
        table {
            border-collapse: collapse;
            border: 2px solid #F9A03F;
            background: linear-gradient(to right, #EAEFB1, #E9F7CA);
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
            border-radius: 15px;
            overflow: hidden;
            transition: all 0.3s ease;
        }
        
        th, td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #CEB5A7;
        }
        
        th {
            background-color: #F7D488;
            color: #333;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        
        tr:hover {
            background-color: #F9A03F;
            color: white;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        #intro {
            margin-bottom: 4rem;
            width: 100%;
        }

        #intro h1 {
            width: 100%;
            font-size: 48px;
            text-align: center;
        }

        #intro p {
            width: fit-content;
            margin: 0 auto;
        }

        #content-container {
            display: flex;
            flex-flow: column wrap;
        }

        .rcs-logo {
            margin: 4rem auto 0 auto;
        }
        
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
        
            th, td {
                padding: 10px;
            }
        
            table {
                width: 100%;
                border-radius: 0;
            }
        } 
    </style>

    <div id="content-container">
    <div id="intro">
    <h1>Nova Scotia South Shore Monitoring Station</h1>
    <p>Check the air quality in in the South Shore of Nova Scotia. This feed is automatically updated every hour, 24/7.</p>
    </div>
    <table>
    <thead>
    <tr>
        <th>DateTime</th>
        <th>Location</th>
        <th>PM1.0</th>
        <th>PM2.5</th>
        <th>PM10.0</th>
    </tr>
    </thead>
    <tbody>
    <tr>
        <td>${sensorData['datetime']}</td>
        <td>${sensorData['location']}</td>
        <td>${sensorData['pm1']}</td>
        <td>${sensorData['pm2_5']}</td>
        <td>${sensorData['pm10']}</td>
    </tr>
    </tbody>
    <caption>Air Quality Readings from the South Shore, Nova Scotia</caption>
    </table>
    <img class="rcs-logo" src="data:image/png;base64, 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" alt="Red Clover Software Logo" width="300">
    </div>
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

    //Return 200 success code!
    return {
      statusCode: 200,
      body: JSON.stringify(sensorData),
    };
  };