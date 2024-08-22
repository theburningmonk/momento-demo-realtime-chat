const { Stack, CfnOutput } = require('aws-cdk-lib');
const { Runtime } = require('aws-cdk-lib/aws-lambda');
const { NodejsFunction } = require('aws-cdk-lib/aws-lambda-nodejs');
const { Table, BillingMode, AttributeType } = require('aws-cdk-lib/aws-dynamodb');
const { RestApi, LambdaIntegration, CfnAuthorizer, AuthorizationType } = require('aws-cdk-lib/aws-apigateway');
const iam = require('aws-cdk-lib/aws-iam');
const { UserPool, UserPoolClient } = require('aws-cdk-lib/aws-cognito');

const MOMENTO_CACHE_NAME = 'chat';

class ChatApiStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const api = new RestApi(this, `${props.stageName}-ChatApi`, {
      deployOptions: {
        stageName: props.stageName,
        tracingEnabled: true
      }
    });

    const userPool = new UserPool(this, 'CognitoUserPool', {
      userPoolName: `${props.serviceName}-${props.stageName}-UserPool`,
      selfSignUpEnabled: true,
      signInAliases: { email: true }
    });

    const webUserPoolClient = new UserPoolClient(this, 'WebUserPoolClient', {
      userPool,
      authFlows: {
        userSrp: true
      },
      preventUserExistenceErrors: true
    });

    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: webUserPoolClient.userPoolClientId });

    this.momentoApiKeyParamName = `/${props.serviceName}/${props.ssmStageName}/momento-api-key`;
    this.momentoApiKeyParamArn = `arn:aws:ssm:${this.region}:${this.account}:parameter${this.momentoApiKeyParamName}`;

    this.chatsTable = this.createChatsTable();

    const listChatsFunction = this.createListChatsFunction(props);
    const newChatFunction = this.createNewChatFunction(props);
    const tokenVendingMachineFunction = this.createTokenVendingMachineFunction(props);

    this.createApiEndpoints(api, userPool, {
      listChats: listChatsFunction,
      newChat: newChatFunction,
      tokenVendingMachine: tokenVendingMachineFunction
    });
  }

  createChatsTable() {
    return new Table(this, 'ChatsTable', {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { 
        name: 'chatName', 
        type: AttributeType.STRING
      }
    });
  }

  createListChatsFunction(props) {
    const func = new NodejsFunction(this, 'ListChatsFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: 'functions/list-chats.js',
      memorySize: 1024,
      environment: {
        SERVICE_NAME: props.serviceName,
        STAGE_NAME: props.stageName,
        POWERTOOLS_LOG_LEVEL: props.stageName === 'prod' ? 'INFO' : 'DEBUG',
        CHATS_TABLE_NAME: this.chatsTable.tableName
      }
    });

    this.chatsTable.grantReadData(func);

    return func;
  }

  createNewChatFunction(props) {
    const func = new NodejsFunction(this, 'NewChatFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: 'functions/new-chat.js',
      memorySize: 1024,
      environment: {
        SERVICE_NAME: props.serviceName,
        STAGE_NAME: props.stageName,
        POWERTOOLS_LOG_LEVEL: props.stageName === 'prod' ? 'INFO' : 'DEBUG',
        CHATS_TABLE_NAME: this.chatsTable.tableName
      }
    });

    this.chatsTable.grantWriteData(func);

    return func;
  }

  createTokenVendingMachineFunction(props) {
    const func = new NodejsFunction(this, 'TokenVendingMachineFunction', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: 'functions/token-vending-machine.js',
      memorySize: 1024,      
      environment: {
        SERVICE_NAME: props.serviceName,
        STAGE_NAME: props.stageName,
        MOMENTO_API_KEY_PARAM_NAME: this.momentoApiKeyParamName,
        MOMENTO_CACHE_NAME,
        POWERTOOLS_LOG_LEVEL: props.stageName === 'prod' ? 'INFO' : 'DEBUG'
      }
    });

    func.role.attachInlinePolicy(new iam.Policy(this, 'TokenVendingMachineFunctionSsmPolicy', {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [ 'ssm:GetParameter*' ],
          resources: [ this.momentoApiKeyParamArn ]
        })
      ]
    }));

    return func;
  }

  /**
   * 
   * @param {RestApi} api
   * @param {UserPool} userPool
   */
  createApiEndpoints(api, userPool, functions) {
    const authorizer = new CfnAuthorizer(this, 'CognitoAuthorizer', {
      name: 'CognitoAuthorizer',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [userPool.userPoolArn],
      restApiId: api.restApiId,
    });    

    const chatsResource = api.root.addResource('chats');

    // POST /chats
    chatsResource.addMethod('POST', new LambdaIntegration(functions.newChat), {
      authorizer: {
        authorizationType: AuthorizationType.COGNITO,
        authorizerId: authorizer.ref
      }
    });

    // GET /chats
    chatsResource.addMethod('GET', new LambdaIntegration(functions.listChats), {
      authorizer: {
        authorizationType: AuthorizationType.COGNITO,
        authorizerId: authorizer.ref
      }
    });

    chatsResource.addCorsPreflight({
      allowHeaders: ['*'],
      allowMethods: ['OPTIONS', 'GET', 'POST'],
      allowCredentials: true,
      allowOrigins: ['*']
    });

    // GET /token
    const tokenResource = api.root.addResource('token');
    tokenResource.addMethod('GET', new LambdaIntegration(functions.tokenVendingMachine), {
      authorizer: {
        authorizationType: AuthorizationType.COGNITO,
        authorizerId: authorizer.ref
      }
    });

    tokenResource.addCorsPreflight({
      allowHeaders: ['*'],
      allowMethods: ['OPTIONS', 'POST'],
      allowCredentials: true,
      allowOrigins: ['*']
    });
  }
}

module.exports = { ChatApiStack }
