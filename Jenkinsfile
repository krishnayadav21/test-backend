pipeline {
    agent any
    parameters {
        string(name: 'DEPLOY_VERSION', defaultValue: 'v1.0.0', description: 'Deployment version (e.g., v1.0.0)')
        choice(name: 'TARGET_ENV', choices: ['dev', 'staging', 'prod'], description: 'Target environment')
        string(name: 'GIT_BRANCH', defaultValue: 'main', description: 'Git branch to deploy')
    }
    environment {
        DOCKER_IMAGE = 'krishnayadav21/backend'
        FULL_TAG = "${DOCKER_IMAGE}:${params.DEPLOY_VERSION}"
        EC2_USER = 'ubuntu'
        EC2_HOST = 'ubuntu@52.207.126.136'
        EC2_KEY = credentials('ssh-key')
        // PEM_PATH = "C:\\Users\\Dell\\Downloads\\github-actions.pem"
        PEM_PATH = "\\\\wsl$\\Ubuntu\\home\\Dell\\github-actions.pem"
    }
    stages {
        stage('Checkout') {
            steps {
                git branch: "${params.GIT_BRANCH}", url: 'https://github.com/krishnayadav21/test-backend.git'
            }
        }
        stage('Check PEM File Access') {
            steps {
                echo "Checking PEM file access: ${env.PEM_PATH}"
                bat "type \"${env.PEM_PATH}\""
            }
        }

        stage('SSH Test') {
            steps {
                echo "Testing SSH connection..."
                // withCredentials([sshUserPrivateKey(credentialsId: 'EC2_KEY', keyFileVariable: 'KEY')]) {
                //     sh """
                //         ssh -i $KEY -o StrictHostKeyChecking=no ${env.EC2_HOST} 'echo Connected'
                //     """
                // }
                bat "ssh -i \"${env.PEM_PATH}\" -o StrictHostKeyChecking=no ${env.EC2_HOST} \"echo SSH connection successful\""
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    bat "docker build -t $FULL_TAG ."
                }
            }
        }
        
        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword( credentialsId: 'docker-hub-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS' )]) {
                    bat """
                        echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
                        docker push $FULL_TAG
                    """
                    }
            }
        }
        stage('Deploy to EC2') {
            steps {
                script {
                    try {
                        echo "Deploying new version: $FULL_TAG"
                            bat """ ssh -tt -o StrictHostKeyChecking=no ubuntu@52.207.126.136 
                                "docker pull $FULL_TAG && ^
                                docker stop backend || true && ^
                                docker rm backend || true && ^
                                docker run -d -p 3000:3000 --name backend $FULL_TAG"
                            """
                        // sshagent(credentials: ['ssh-key'])
                        // {
                        //     sh """
                        //     ssh -o StrictHostKeyChecking=no ${username}@52.207.126.136 \\
                        //         'docker pull $FULL_TAG && 
                        //          docker run -d -p 3000:3000 --name backend $FULL_TAG'
                        //     """
                        // }
                        // sh """
                        // ssh -o StrictHostKeyChecking=no -i $EC2_KEY $EC2_USER@$EC2_HOST '
                        //   docker pull $FULL_TAG &&
                        //   docker stop backend || true &&
                        //   docker rm backend || true &&
                        //   docker run -d -p 3000:3000 --name backend $FULL_TAG
                        // '
                        // """
                        echo "Deployment succeeded!"
                    } catch (err) {
                        echo "Deployment failed. Rolling back to previous version..."

                        def previousTag = getPreviousDockerTag()

                        if (previousTag) {
                            echo "🔁 Rolling back to ${previousTag}"
                            bat """
                            ssh -o StrictHostKeyChecking=no -i $EC2_KEY $EC2_USER@$EC2_HOST '
                              docker pull $DOCKER_IMAGE:$previousTag &&
                              docker stop backend || true &&
                              docker rm backend || true &&
                              docker run -d -p 3000:3000 --name backend $DOCKER_IMAGE:$previousTag
                            '
                            """
                        } else {
                            echo "⚠️ No previous version found to rollback to."
                        }

                        error("Deployment failed and rollback complete.")
                    }
                }
            }
        }
    }
}

def getPreviousDockerTag() {
    try {
        def output = sh(
            script: "curl -s https://hub.docker.com/v2/repositories/${env.DOCKER_IMAGE}/tags | jq -r '.results[].name' | grep -v latest | sort -Vr | sed -n 2p",
            returnStdout: true
        ).trim()
        return output
    } catch (err) {
        echo "Could not determine previous tag: ${err.message}"
        return null
    }
}
