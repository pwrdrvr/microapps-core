.PHONY: help

SHELL=/bin/bash

AWS_ACCOUNT_ID ?= $(shell aws sts get-caller-identity --query "Account" --output text)
REGION ?= us-east-2
ENV ?= dev
ECR_HOST ?= ${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com
DEPLOYER_ECR_REPO ?= microapps-deployer-${ENV}
DEPLOYER_ECR_TAG ?= ${DEPLOYER_ECR_REPO}:latest
ROUTER_ECR_REPO ?= microapps-router-${ENV}
ROUTERZ_ECR_REPO ?= microapps-routerz-${ENV}
ROUTER_ECR_TAG ?= ${ROUTER_ECR_REPO}:latest

# In .github/workflows we set PR_NUMBER based on the Actions payload, if set
# If running on AWS CodeBuild, then CODEBUILD_SOURCE_VERSION should get
# passed in as pr/## or main and everything will still work
PR_NUMBER ?= 
CODEBUILD_SOURCE_VERSION ?= $(shell if [[ "${PR_NUMBER}" -eq "" ]] ; then echo "pr/${PR_NUMBER}"; else echo "dummy"; fi )
CODEBUILD_PR_NUMBER := $(shell echo ${CODEBUILD_SOURCE_VERSION} | awk 'BEGIN{FS="/"; } { print $$2 }' )
CODEBUILD_STACK_SUFFIX := $(shell if [[ ${CODEBUILD_SOURCE_VERSION} = pr/* ]] ; then (echo ${CODEBUILD_SOURCE_VERSION} | awk 'BEGIN{FS="/"; } { printf "-pr-%s", $$2 }') ; else echo "" ; fi )
CODEBUILD_REPOS_STACK_NAME := microapps-repos-${ENV}${CODEBUILD_STACK_SUFFIX}
CODEBUILD_CORE_STACK_NAME := microapps-svcs-${ENV}${CODEBUILD_STACK_SUFFIX}
CODEBUILD_IMAGE_LABEL := latest # $(shell [[ ${CODEBUILD_SOURCE_VERSION} = pr/* ]] && (echo ${CODEBUILD_SOURCE_VERSION} | awk 'BEGIN{FS="/"; } { printf "pr-%s", $$2 }') || echo "latest")
CODEBUILD_ECR_HOST ?= ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

CODEBUILD_ROUTER_IMAGE_NAME ?= microapps-router-${ENV}${CODEBUILD_STACK_SUFFIX}
CODEBUILD_ROUTER_LAMBDA_NAME ?= ${CODEBUILD_ROUTER_IMAGE_NAME}
CODEBUILD_ROUTER_ECR_TAG ?= ${CODEBUILD_ROUTER_IMAGE_NAME}:${CODEBUILD_IMAGE_LABEL}

CODEBUILD_DEPLOYER_IMAGE_NAME ?= microapps-deployer-${ENV}${CODEBUILD_STACK_SUFFIX}
CODEBUILD_DEPLOYER_LAMBDA_NAME ?= ${CODEBUILD_DEPLOYER_IMAGE_NAME}
CODEBUILD_DEPLOYER_ECR_TAG ?= ${CODEBUILD_DEPLOYER_IMAGE_NAME}:${CODEBUILD_IMAGE_LABEL}


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

#
# Lambda Deploy
#

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
	@aws lambda update-function-code --function-name ${ROUTERZ_ECR_REPO} \
		--zip-file fileb://./microapps-router.zip


#
# CodeBuild helpers
# We need these because we have to compute the name of the stack before
# invoking `cdk deploy`
#

codebuild-cdk: ## Deploy only the core CDK stack only
	@cdk deploy --require-approval never ${CODEBUILD_CORE_STACK_NAME}

codebuild-deploy: ## Perform a CDK / ECR / Lambda Deploy with CodeBuild
	@echo "CODEBUILD_STACK_SUFFIX: ${CODEBUILD_STACK_SUFFIX}"
	@echo "CODEBUILD_REPOS_STACK_NAME: ${CODEBUILD_REPOS_STACK_NAME}"
	@echo "CODEBUILD_CORE_STACK_NAME: ${CODEBUILD_CORE_STACK_NAME}"
	@echo "CODEBUILD_IMAGE_LABEL: ${CODEBUILD_IMAGE_LABEL}"
	@echo "CODEBUILD_PR_NUMBER: ${CODEBUILD_PR_NUMBER}"
	@echo "CODEBUILD_ROUTER_ECR_TAG: ${CODEBUILD_ROUTER_ECR_TAG}"
	@echo "CODEBUILD_DEPLOYER_ECR_TAG: ${CODEBUILD_DEPLOYER_ECR_TAG}"
	@echo "Running CDK Diff - Repos"
	@cdk diff ${CODEBUILD_REPOS_STACK_NAME}
	@echo "Running CDK Deploy - Repos"
	@cdk deploy --require-approval never ${CODEBUILD_REPOS_STACK_NAME}
	@echo "Running Docker Build / Publish - Router"
	@docker build -f DockerfileRouter -t ${CODEBUILD_ROUTER_ECR_TAG}  .
	@docker tag ${CODEBUILD_ROUTER_ECR_TAG} ${CODEBUILD_ECR_HOST}/${CODEBUILD_ROUTER_ECR_TAG}
	@docker push ${CODEBUILD_ECR_HOST}/${CODEBUILD_ROUTER_ECR_TAG}
	@echo "Running Docker Build / Publish - Deployer"
	@docker build -f DockerfileDeployer -t ${CODEBUILD_DEPLOYER_ECR_TAG}  .
	@docker tag ${CODEBUILD_DEPLOYER_ECR_TAG} ${CODEBUILD_ECR_HOST}/${CODEBUILD_DEPLOYER_ECR_TAG}
	@docker push ${CODEBUILD_ECR_HOST}/${CODEBUILD_DEPLOYER_ECR_TAG}
	@echo "Running CDK Diff - Core"
	@cdk diff ${CODEBUILD_CORE_STACK_NAME}
	@echo "Running CDK Deploy - Core"
	@cdk deploy --require-approval never ${CODEBUILD_CORE_STACK_NAME}
	@echo "Running Lambda Update - Router"
	@aws lambda update-function-code --function-name ${CODEBUILD_ROUTER_LAMBDA_NAME} \
		--region ${REGION} --image-uri ${CODEBUILD_ECR_HOST}/${CODEBUILD_ROUTER_ECR_TAG} --publish
	@echo "Running Lambda Update - Deployer"
	@aws lambda update-function-code --function-name ${CODEBUILD_DEPLOYER_LAMBDA_NAME} \
		--region ${REGION} --image-uri ${CODEBUILD_ECR_HOST}/${CODEBUILD_DEPLOYER_ECR_TAG} --publish

codebuild-update-lambdas: ## Build docker images and update Lambdas only
	@echo "CODEBUILD_STACK_SUFFIX: ${CODEBUILD_STACK_SUFFIX}"
	@echo "CODEBUILD_REPOS_STACK_NAME: ${CODEBUILD_REPOS_STACK_NAME}"
	@echo "CODEBUILD_CORE_STACK_NAME: ${CODEBUILD_CORE_STACK_NAME}"
	@echo "CODEBUILD_IMAGE_LABEL: ${CODEBUILD_IMAGE_LABEL}"
	@echo "CODEBUILD_PR_NUMBER: ${CODEBUILD_PR_NUMBER}"
	@echo "CODEBUILD_ROUTER_ECR_TAG: ${CODEBUILD_ROUTER_ECR_TAG}"
	@echo "CODEBUILD_DEPLOYER_ECR_TAG: ${CODEBUILD_DEPLOYER_ECR_TAG}"
	@echo "Running Docker Build / Publish - Router"
	@docker build -f DockerfileRouter -t ${CODEBUILD_ROUTER_ECR_TAG}  .
	@docker tag ${CODEBUILD_ROUTER_ECR_TAG} ${CODEBUILD_ECR_HOST}/${CODEBUILD_ROUTER_ECR_TAG}
	@docker push ${CODEBUILD_ECR_HOST}/${CODEBUILD_ROUTER_ECR_TAG}
	@echo "Running Docker Build / Publish - Deployer"
	@docker build -f DockerfileDeployer -t ${CODEBUILD_DEPLOYER_ECR_TAG}  .
	@docker tag ${CODEBUILD_DEPLOYER_ECR_TAG} ${CODEBUILD_ECR_HOST}/${CODEBUILD_DEPLOYER_ECR_TAG}
	@docker push ${CODEBUILD_ECR_HOST}/${CODEBUILD_DEPLOYER_ECR_TAG}
	@echo "Running Lambda Update - Router"
	@aws lambda update-function-code --function-name ${CODEBUILD_ROUTER_LAMBDA_NAME} \
		--region ${REGION} --image-uri ${CODEBUILD_ECR_HOST}/${CODEBUILD_ROUTER_ECR_TAG} --publish
	@echo "Running Lambda Update - Deployer"
	@aws lambda update-function-code --function-name ${CODEBUILD_DEPLOYER_LAMBDA_NAME} \
		--region ${REGION} --image-uri ${CODEBUILD_ECR_HOST}/${CODEBUILD_DEPLOYER_ECR_TAG} --publish
