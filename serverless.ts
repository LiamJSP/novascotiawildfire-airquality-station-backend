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
    customDomain: {
      domainName: 'projects.redcloversoftware.ca',
      basePath: 'nswildfire-airqualitystation',
      stage: '${self:provider.stage}',
      createRoute53Record: true,
      certificateArn: process.env.api_cert_arn,
    },
    customCertificate: {
      certificateName: 'nswildfire.redcloversoftware.ca',
      hostedZoneNames: 'redcloversoftware.ca.',
      region: 'us-east-1', // Cloudfront needs the cert to be in us-east-1
      rewriteRecords: true,
      certificateArnOutputName: 'nswildfireCertArn'
    },
    cloudfrontInvalidate: [	
      {	
        distributionIdKey: "CloudFrontDistribution",	
        autoInvalidate: true,	
        items: ["/*"]	
      }	
    ],
    'serverless-s3-cleaner': {
      prompt: false,
      buckets: [
        bucketName
      ],
      bucketsToCleanOnDeploy: [
        bucketName,
      ],
    },
  },
  plugins: ['serverless-webpack', 'serverless-cloudfront-invalidate', 'serverless-domain-manager', 'serverless-certificate-creator', 'serverless-s3-cleaner'],
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
        Resource: {
          'Fn::Join': [
            '', // separator
            [
              'arn:aws:s3:::',
              { Ref: 'WebsiteBucket' },
              '/*',
            ],
          ],
        },
      },
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
      CloudFrontOriginAccessIdentity: {
        Type: 'AWS::CloudFront::CloudFrontOriginAccessIdentity',
        Properties: {
          CloudFrontOriginAccessIdentityConfig: {
            Comment: 'Access identity for CloudFront to access S3 bucket',
          },
        },
      },
      CloudFrontDistribution: {	
        Type: "AWS::CloudFront::Distribution",	
        Properties: {	
          DistributionConfig: {	
            Enabled: true,	
            DefaultRootObject: "index.html",
            Aliases: [ "nswildfire.redcloversoftware.ca" ],
            Origins: [    
              {    
                DomainName: {
                  'Fn::Sub': '${WebsiteBucket}.s3-website-${AWS::Region}.amazonaws.com'
                },    
                Id: "S3Origin",    
                CustomOriginConfig: {
                  HTTPPort: 80,
                  HTTPSPort: 443,
                  OriginProtocolPolicy: "http-only",
                }    
              }    
            ],
            DefaultCacheBehavior: {	
              TargetOriginId: "S3Origin",	
              ViewerProtocolPolicy: "redirect-to-https",	
              AllowedMethods: ["GET", "HEAD"],	
              ForwardedValues: {	
                QueryString: false,	
                Cookies: {	
                  Forward: "none"	
                }	
              },	
              MinTTL: 0,	
              MaxTTL: 0,	
              DefaultTTL: 0	
            },	
            PriceClass: "PriceClass_100",	
            HttpVersion: "http2",
            ViewerCertificate: {
              AcmCertificateArn: '${certificate(${self:custom.customCertificate.certificateName}):CertificateArn}',
              SslSupportMethod: 'sni-only',
              MinimumProtocolVersion: 'TLSv1.2_2018',
            },
          }	
        }	
      },
      Route53RecordSet: {
        Type: 'AWS::Route53::RecordSet',
        Properties: {
          HostedZoneName: 'redcloversoftware.ca.',
          Comment: 'Record set for CloudFront distribution',
          Name: 'nswildfire.redcloversoftware.ca.',
          Type: 'A',
          AliasTarget: {
            DNSName: { 'Fn::GetAtt': ['CloudFrontDistribution', 'DomainName'] },
            HostedZoneId: process.env.hosted_zone_id,
          },
        },
      },
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
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: false,
            BlockPublicPolicy: false,
            IgnorePublicAcls: false,
            RestrictPublicBuckets: false
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
    },
    Outputs: {
      CloudFrontDistribution: {
        Description: "CloudFront Distribution ID",
        Value: {
          Ref: "CloudFrontDistribution"
        }
      }
    }
  }
};

module.exports = serverlessConfiguration;
