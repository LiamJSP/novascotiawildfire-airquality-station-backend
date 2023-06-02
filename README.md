# 2023 NS Wildfires Air Quality Station

Nova Scotia was struck with several record-breaking wildfires this year, and so I dusted off the Raspberry Pi and the trusty Enviro+ module to get some particulate measurements. The Enviro+ also features a gas sensor for a couple of groups of gases, but in my experience it has very very little use due to the low fidelity of the sensor itself (understandable at this price range). The particulate matter sensor is an active blower sensor that produces decent average readings for an area. Wind will probably cause distortion, so when placed outdoors I position it in a spot isolated from direct gusts of wind but with decent air flow. In this case, PM1.0, PM2.5, PM10.0 are very relevant health-related stats relevant to fire exposure.

This repo contains the backend code written in Typescript for a microservice to be deployed to AWS, deployed using the Serverless Framework. It consists of some Lambda functions and use of DynamoDB at the moment. I'm going to build this out further and switch to Postgres in RDS.


## Installation/deployment instructions

1. npm install -g serverless
2. npm install within cloned repo directory
3. sls deploy or sls offline

## Roadmap

*Phase 1*
1.	Extend the initial implementation to produce some static HTML wrapping the latest readings, placed in an S3 bucket set to operate as a static site.
2.	Add JSDoc comments
3.	Audit permissions

*Phase 2*
1.	Remove static site implementation, make this a backend-only service for a React app
2.	Add Jest unit tests