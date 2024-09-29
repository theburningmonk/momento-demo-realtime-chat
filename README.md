# momento-demo-realtie-chat

Demo of using [Momento](https://gomomento.com) topics to build a real-time chat application. The frontend clients can talk with each other in real-time, by subscribing and publishing messages to Momento topics. Messages are pushed to the clients via Websockets.

## To deploy the backend

1. run `npm ci` to restore project dependencies.

2. run `npx cdk deploy` to deploy the application.
*Note: This uses the version of CDK that's installed as dev dependency in the project, so to avoid any version incompatibility with the version of CDK you have installed on your machine.*

After the deployment finishes, you should see something like this:

```
Outputs:
NotificationApiStack-dev.UserPoolClientId = xxxxxxxxxxxxx
NotificationApiStack-dev.UserPoolId = us-east-1_xxxxxx
NotificationApiStack-dev.devChatApiEndpoint96F466DA = https://xxxxxx.execute-api.us-east-1.amazonaws.com/dev/
```

Take note of these outputs, we need them for the frontend

3. To run the frontend application, first add a `.env` file in the `frontend` folder and put the CloudFormation output above into it, like this:

```
VUE_APP_USER_POOL_CLIENT_ID=xxxxxxxxxxxx
VUE_APP_USER_POOL_ID=us-east-1_xxxxxxx
VUE_APP_API_URL=https://xxxxxxx.execute-api.us-east-1.amazonaws.com/dev
```

4. Run `cd frontend`, then `npm ci`, then `npm run serve`. This should compile and run the frontend app on port 8080.

5. Visit `localhost:8080`

## API Routes

`GET /token`: gets a disposable token so the frontend can subscribe to the Momento topic.

`POST /chats`: create a new chat room.

`GET /chats`: list the available chat rooms.
