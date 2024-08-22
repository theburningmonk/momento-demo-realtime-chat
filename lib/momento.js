const {
  CredentialProvider,
  AuthClient,
  DisposableTokenScopes,
  ExpiresIn,
  GenerateDisposableTokenResponse,
  AllTopics,
} = require('@gomomento/sdk');

const { Logger } = require('@aws-lambda-powertools/logger');
const logger = new Logger({ serviceName: 'leaderboard-api' });

const { MOMENTO_CACHE_NAME } = global.process.env;

let authClient;

async function initAuthClient(apiKey) {
  if (!authClient) {
    logger.info('Initializing Momento auth client');
    
    authClient = new AuthClient({
      credentialProvider: CredentialProvider.fromString(apiKey)
    });

    logger.info('Initialized Momento auth client');
  }
};

async function generateToken() {
  const result = await authClient.generateDisposableToken(
    DisposableTokenScopes.topicPublishSubscribe(MOMENTO_CACHE_NAME, AllTopics),
    ExpiresIn.minutes(30)
  );

  if (result.type === GenerateDisposableTokenResponse.Error) {
    logger.error('Failed to generate disposable token', {
      error: result.innerException(),
      errorMessage: result.message()
    });

    throw result.innerException();
  }

  return {
    endpoint: result.endpoint,
    token: result.authToken,
    cacheName: MOMENTO_CACHE_NAME,
    expiresAt: result.expiresAt
  };
}

module.exports = { 
  initClient,
  initAuthClient,
  publish,
  generateToken,
};