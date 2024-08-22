const amplifyConfig = {
  // Replace with your own Cognito configuration
  Auth: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_G8NtOCSFT',
    userPoolWebClientId: '6g7gg9aah5gig54iu0guvfpocd',    
    signUpVerificationMethod: "code"    
  }
}

const apiConfig = {
  // Replace with your own API Gateway URL
  apiUrl: 'https://nc3s3fw3ee.execute-api.us-east-1.amazonaws.com/dev'
}

export {
  amplifyConfig,
  apiConfig
}
