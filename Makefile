.PHONY: help

AWS_ACCOUNT ?= ***REMOVED***
REGION ?= us-east-2
ECR_HOST ?= ${AWS_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com
DEPLOYER_ECR_REPO ?= microapps-deployer
DEPLOYER_ECR_TAG ?= ${DEPLOYER_ECR_REPO}:latest
ROUTER_ECR_REPO ?= microapps-router
ROUTER_ECR_TAG ?= ${ROUTER_ECR_REPO}:latest

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
		-d '{ "appName": "release", "semVer": "1.0.0", "s3SourceURI": "s3://pwrdrvr-apps-staging/release/1.0.0/", "lambdaARN": "none", "defaultFile": "foo.html" }'

curl-deploy-version-local: ## Deploy a test version
	curl -v -H "Content-Type: application/json" https://localhost:5001/deployer/version/ \
		-d '{ "appName": "release", "semVer": "1.0.0", "s3SourceURI": "s3://pwrdrvr-apps-staging/release/1.0.0/", "lambdaARN": "none", "defaultFile": "foo.html" }'

curl-release-route: ## Test /release/ app route
	curl -v https://apps.pwrdrvr.com/release/
