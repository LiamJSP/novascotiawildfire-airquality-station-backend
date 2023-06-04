import type { AWS } from '@serverless/typescript';


const bucketName = 'pi-sensor-service-site';

const serverlessConfiguration: AWS = {
  service: 'pi-sensor-service',
  custom: {
    webpack: {
      webpackConfig: './webpack.config.js',
      includeModules: true
    },
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node16',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
  },
  plugins: ['serverless-webpack'],
  provider: {
    name: 'aws',
    runtime: 'nodejs16.x',
    region: 'us-east-1',
    stage: '${opt:stage, \'dev\'}',
    memorySize: 128,
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      TABLE_NAME: 'SensorData',
      BUCKET_NAME: bucketName,
    },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['dynamodb:*'],
        Resource: '*'
      },
      {
        Effect: 'Allow',
        Action: ['s3:*'],
        Resource: `arn:aws:s3:::${bucketName}/*`
      }
    ],
  },
  functions: { 
    saveData: {
      handler: 'src/saveData.handler',
      events: [
        {
          http: {
            method: 'post',
            path: 'save',
          },
        },
      ],
    },
    getData: {
      handler: 'src/getData.handler',
      events: [
        {
          http: {
            method: 'get',
            path: 'get',
          },
        },
      ],
    },
  },
  resources: {
    Resources: {
      SensorDataTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: 'SensorData',
          AttributeDefinitions: [
            {
              AttributeName: 'datetime',
              AttributeType: 'S'
            }
          ],
          KeySchema: [
            {
              AttributeName: 'datetime',
              KeyType: 'HASH'
            }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          }
        }
      },
      WebsiteBucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: bucketName,
          WebsiteConfiguration: {
            IndexDocument: 'index.html',
            ErrorDocument: 'error.html',
          },
        },
      },
      BucketPolicy: {
        Type: 'AWS::S3::BucketPolicy',
        Properties: {
          Bucket: { Ref: 'WebsiteBucket' },
          PolicyDocument: {
            Statement: [
              {
                Sid: 'PublicReadGetObject',
                Effect: 'Allow',
                Principal: '*',
                Action: 's3:GetObject',
                Resource: {"Fn::Join": ["", ["arn:aws:s3:::", { "Ref": "WebsiteBucket" }, "/*"]]}, 
              },
            ],
          },
        },
      },
    }
  }
};

module.exports = serverlessConfiguration;
