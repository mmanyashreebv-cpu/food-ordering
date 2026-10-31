pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timeout(time: 40, unit: 'MINUTES')
    }

    environment {
        TAG = "b${BUILD_NUMBER}"
        NAMESPACE = "food"
    }

    stages {
        stage('Check tools') {
            steps {
                bat 'minikube status'
                bat 'kubectl get pods -n %NAMESPACE%'
            }
        }

        stage('Build images') {
            steps {
                bat 'minikube image build -t user-service:%TAG% services/user-service'
                bat 'minikube image build -t inventory-service:%TAG% services/inventory-service'
                bat 'minikube image build -t order-service:%TAG% services/order-service'
                bat 'minikube image build -t frontend:%TAG% frontend'
            }
        }

        stage('Deploy') {
            steps {
                bat 'kubectl set image deployment/user-service user-service=user-service:%TAG% -n %NAMESPACE%'
                bat 'kubectl set image deployment/inventory-service inventory-service=inventory-service:%TAG% -n %NAMESPACE%'
                bat 'kubectl set image deployment/order-service order-service=order-service:%TAG% -n %NAMESPACE%'
                bat 'kubectl set image deployment/frontend frontend=frontend:%TAG% -n %NAMESPACE%'
            }
        }

        stage('Verify') {
            steps {
                bat 'kubectl rollout status deployment/user-service -n %NAMESPACE% --timeout=180s'
                bat 'kubectl rollout status deployment/inventory-service -n %NAMESPACE% --timeout=180s'
                bat 'kubectl rollout status deployment/order-service -n %NAMESPACE% --timeout=180s'
                bat 'kubectl rollout status deployment/frontend -n %NAMESPACE% --timeout=180s'
                bat 'kubectl get pods -n %NAMESPACE%'
            }
        }
    }

    post {
        success {
            echo "Build ${BUILD_NUMBER} deployed successfully."
        }
        failure {
            echo 'The pipeline failed. Open the failed stage above to see why.'
        }
    }
}
