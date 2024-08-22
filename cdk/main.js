#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { ChatApiStack } = require('./constructs/chat-api-stack');

const app = new cdk.App();

let stageName = app.node.tryGetContext('stageName');
let ssmStageName = app.node.tryGetContext('ssmStageName');

if (!stageName) {
  console.log('Defaulting stage name to dev');
  stageName = 'dev';
}

if (!ssmStageName) {
  console.log(`Defaulting SSM stage name to "stageName": ${stageName}`);
  ssmStageName = stageName;
}

const serviceName = 'chat-api';

new ChatApiStack(app, `ChatApiStack-${stageName}`, {
  serviceName,
  stageName,
  ssmStageName,
});
