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
        EC2_HOST = '35.173.186.28'
    }
    stages {
        stage('Checkout') {
            steps {
                git branch: "${params.GIT_BRANCH}", url: 'https://github.com/krishnayadav21/test-backend.git'
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    sh "docker build -t $FULL_TAG ."
                }
            }
        }
        
        stage('Push Docker Image') {
            steps {
                withCredentials([usernamePassword( credentialsId: 'docker-hub-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS' )]) {
                    sh """
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
                        echo "🚀 Deploying new version: $FULL_TAG"
                        sshagent(credentials: ['ssh-key']) {
                            sh """
                                ssh -o StrictHostKeyChecking=no ubuntu@35.173.156.28 '
                                 docker pull $FULL_TAG && \\
                        //       docker run -d -p 3000:3000 --name backend $FULL_TAG'
                            """
                        }
                        // withCredentials([sshUserPrivateKey(credentialsId: 'ssh-key',keyFileVariable: 'EC2_KEY_SSH', usernameVariable: 'username')])
                        // {
                        //     sh """
                        //     echo $EC2_KEY_SSH
                        //     ssh -i $EC2_KEY_SSH -o StrictHostKeyChecking=no ${username}@35.173.186.28 \\
                        //         'docker pull $FULL_TAG && \\
                        //         docker run -d -p 3000:3000 --name backend $FULL_TAG'
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
                        echo "✅ Deployment succeeded!"
                    } catch (err) {
                        echo err
                        echo "❌ Deployment failed. Rolling back to previous version..."

                        def previousTag = getPreviousDockerTag()

                        if (previousTag) {
                            echo "🔁 Rolling back to ${previousTag}"
                            sh """
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
