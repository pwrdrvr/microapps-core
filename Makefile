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

aws-lambda-update-routerz: ## Update the lambda function using a .zip file
	@rm -f microapps-router.zip
	@sh -c 'cd distb/microapps-router/ && zip ../../microapps-router.zip * -x index.max.js'
	@aws lambda update-function-code --function-name ${ROUTER_ECR_REPO}z \
		--zip-file fileb://./microapps-router.zip
