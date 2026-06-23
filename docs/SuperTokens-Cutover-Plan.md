# SuperTokens Cutover and Rollback Plan

## Current Production State

Cognito remains the live production authentication system.

USE_SUPERTOKENS_PROD is currently false.

SuperTokens has been tested separately and works for:

- Student email/password login
- Lecturer email/password login
- Partner email/password login
- Student Google login
- Lecturer Google login
- Existing migrated users

## Rollback Switch

Set:

USE_SUPERTOKENS_PROD = false

## Rollback Target

Return live /login to Cognito.

## Do Not Change During Rollback

- DynamoDB
- SuperTokens Core
- Cognito User Pool
- Google Console
- Dashboard pages
- Scholarship pages
- Marketplace pages
- Messaging pages

## Emergency Rollback Steps

1. Set USE_SUPERTOKENS_PROD to false.
2. Commit the change.
3. Push to the Amplify-connected branch.
4. Wait for Amplify deployment.
5. Test Cognito login again.

## Cutover Rule

Only switch USE_SUPERTOKENS_PROD to true after final verification.