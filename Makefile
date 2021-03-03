.PHONY: help

AWS_ACCOUNT ?= ***REMOVED***
REGION ?= us-east-2
ECR_HOST ?= ${AWS_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com
DEPLOYER_ECR_REPO ?= microapps-deployer
DEPLOYER_ECR_TAG ?= ${DEPLOYER_ECR_REPO}:latest
ROUTER_ECR_REPO ?= microapps-router
ROUTER_ECR_TAG ?= ${ROUTER_ECR_REPO}:latest
RELEASE_ECR_REPO ?= microapps-release
RELEASE_ECR_TAG ?= ${RELEASE_ECR_REPO}:latest

help:
	@echo "Commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
	@echo

#
# Utilities
#

aws-get-alias: ## get account alias
	@aws iam list-account-aliases --query AccountAliases[0] --output text

aws-ecr-login: ## establish ECR docker login session
	@aws ecr get-login-password --region ${REGION} | docker login \
		--username AWS --password-stdin ${ECR_HOST}

aws-ecr-publish-deployer: ## publish updated ECR docker image
	@docker build -f DockerfileDeployer -t ${DEPLOYER_ECR_TAG}  .
	@docker tag ${DEPLOYER_ECR_TAG} ${ECR_HOST}/${DEPLOYER_ECR_TAG}
	@docker push ${ECR_HOST}/${DEPLOYER_ECR_TAG}

aws-lambda-update-deployer: ## Update the lambda function to use latest image
	@aws lambda update-function-code --function-name ${DEPLOYER_ECR_REPO} \
		--image-uri ${ECR_HOST}/${DEPLOYER_ECR_TAG} --publish

aws-ecr-publish-router: ## publish updated ECR docker image
	@docker build -f DockerfileRouter -t ${ROUTER_ECR_TAG}  .
	@docker tag ${ROUTER_ECR_TAG} ${ECR_HOST}/${ROUTER_ECR_TAG}
	@docker push ${ECR_HOST}/${ROUTER_ECR_TAG}

aws-lambda-update-router: ## Update the lambda function to use latest image
	@aws lambda update-function-code --function-name ${ROUTER_ECR_REPO} \
		--image-uri ${ECR_HOST}/${ROUTER_ECR_TAG} --publish

aws-ecr-publish-release: ## publish updated ECR docker image
	@docker build -f DockerfileRelease -t ${RELEASE_ECR_TAG}  .
	@docker tag ${RELEASE_ECR_TAG} ${ECR_HOST}/${RELEASE_ECR_TAG}
	@docker push ${ECR_HOST}/${RELEASE_ECR_TAG}

aws-lambda-update-release: ## Update the lambda function to use latest image
	@aws lambda update-function-code --function-name ${RELEASE_ECR_REPO} \
		--image-uri ${ECR_HOST}/${RELEASE_ECR_TAG} --publish


#
# CDK Commands
#

cdk-restore: ## Restore env needed to run CDK
	@nvm use


#
# Lambda Commands
#

# Deploy an App

curl-create-app: ## Deploy a test app
	curl -v -H "Content-Type: application/json" https://apps.pwrdrvr.com/deployer/application/ \
		-d '{ "appName": "release" }'

curl-create-app-local: ## Deploy a test app
	curl -v -H "Content-Type: application/json" https://localhost:5001/deployer/application/ \
		-d '{ "appName": "release" }'

curl-deploy-version: ## Deploy a test version
	curl -v -H "Content-Type: application/json" https://apps.pwrdrvr.com/deployer/version/ \
		-d '{ "appName": "release", "semVer": "1.0.0", "s3SourceURI": "s3://pwrdrvr-apps-staging/release/1.0.0/", "lambdaARN": "arn:aws:lambda:us-east-2:***REMOVED***:function:microapps-release:v1_0_0", "defaultFile": "index.html" }'

curl-deploy-version-local: ## Deploy a test version
	curl -v -H "Content-Type: application/json" https://localhost:5001/deployer/version/ \
		-d '{ "appName": "release", "semVer": "1.0.0", "s3SourceURI": "s3://pwrdrvr-apps-staging/release/1.0.0/", "lambdaARN": "arn:aws:lambda:us-east-2:***REMOVED***:function:microapps-release:v1_0_0", "defaultFile": "index.html" }'

curl-release-route: ## Test /release/ app route
	curl -v https://apps.pwrdrvr.com/release/

curl-release-route-version: ## Test /release/1.0.0/ app route
	curl -v https://apps.pwrdrvr.com/release/1.0.0/

curl-release-route-version-method: ## Test /release/1.0.0/method app route
	curl -v https://apps.pwrdrvr.com/release/1.0.0/values

#
# API Gateway HTTP2 Payloads for Local Docker LRE Testing
#

curl-local-lambda-router: ## Send test request to local app
	@curl -v -XPOST -H "Content-Type: application/json" \
		http://localhost:9000/2015-03-31/functions/function/invocations \
		--data-binary "@test/json/router-release-app.json"

# Build and tag the Lambda Runtime Env Proxy
lre-proxy-build: ## publish updated ECR docker image
	@docker build -f DockerfileGatewayProxy -t lre-proxy .
