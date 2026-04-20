// ================================================================
// Jenkins Declarative Pipeline - Deakin Learning App
// ================================================================
// Production CI/CD Pipeline
// Build → Test → Code Quality → Security → Deploy → Release → Monitoring
// Fixed Email Notifications using emailext
// ================================================================

pipeline {
    agent any

    environment {
        APP_NAME           = 'deakin-app'
        DOCKER_IMAGE       = 'deakin-app'
        BUILD_VERSION      = "1.0.${BUILD_NUMBER}"

        PROJECT_DIR        = 'D:/DEAKIN/Professional development/HD Project'

        SONAR_HOST_URL     = credentials('SONAR_HOST_URL')
        SONAR_AUTH_TOKEN   = credentials('SONAR_AUTH_TOKEN')

        DOCKER_REGISTRY    = 'localhost:5000'
        DOCKER_HOST        = 'tcp://localhost:2375'

        TRIVY_SEVERITY     = 'CRITICAL'

        STAGING_PORT       = '3000'
        PRODUCTION_PORT    = '80'

        NOTIFICATION_EMAIL = 'team@deakin-project.com'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    triggers {
        pollSCM('H/5 * * * *')
    }

    stages {

        // ========================================================
        // BUILD
        // ========================================================
        stage('Build') {
            steps {
                echo '========== BUILD =========='

                dir("${PROJECT_DIR}") {

                    bat 'npm ci --prefer-offline || npm install'
                    bat 'npm run build'

                    script {
                        def registryCheckRc = bat(
                            script: 'docker inspect registry --format "{{.State.Running}}" 2>nul',
                            returnStatus: true
                        )

                        if (registryCheckRc != 0) {
                            bat 'docker run -d -p 5000:5000 --restart always --name registry registry:2'
                        }
                    }

                    bat 'docker build --build-arg BUILD_VERSION=%BUILD_VERSION% -t %DOCKER_IMAGE%:%BUILD_VERSION% -t %DOCKER_IMAGE%:latest .'
                }
            }

            post {
                success {
                    dir("${PROJECT_DIR}") {
                        archiveArtifacts artifacts: 'dist/**/*', fingerprint: true
                    }
                }
            }
        }

        // ========================================================
        // TEST
        // ========================================================
        stage('Test') {
            steps {
                echo '========== TEST =========='

                dir("${PROJECT_DIR}") {
                    bat 'npx vitest run --reporter=junit --outputFile=test-results/junit.xml'
                }
            }

            post {
                always {
                    dir("${PROJECT_DIR}") {
                        junit testResults: 'test-results/junit.xml', allowEmptyResults: true
                    }
                }
            }
        }

        // ========================================================
        // CODE QUALITY
        // ========================================================
        stage('Code Quality') {
            steps {
                echo '========== CODE QUALITY =========='

                dir("${PROJECT_DIR}") {

                    bat(script: 'npx eslint . --format json --output-file eslint-report.json', returnStatus: true)

                    bat '''
                    sonar-scanner ^
                    -Dsonar.projectKey=%APP_NAME% ^
                    -Dsonar.projectName="Deakin Learning App" ^
                    -Dsonar.projectVersion=%BUILD_VERSION% ^
                    -Dsonar.sources=src ^
                    -Dsonar.tests=src ^
                    -Dsonar.test.inclusions=**/*.test.js,**/*.spec.js ^
                    -Dsonar.exclusions=**/node_modules/**,**/dist/** ^
                    -Dsonar.host.url=%SONAR_HOST_URL% ^
                    -Dsonar.token=%SONAR_AUTH_TOKEN%
                    '''
                }
            }

            post {
                always {
                    dir("${PROJECT_DIR}") {
                        archiveArtifacts artifacts: 'eslint-report.json', allowEmptyArchive: true
                    }
                }
            }
        }

        // ========================================================
        // SECURITY
        // ========================================================
        stage('Security') {
            steps {
                echo '========== SECURITY =========='

                dir("${PROJECT_DIR}") {

                    bat(script: 'npm audit --json > npm-audit-report.json 2>&1', returnStatus: true)
                    bat(script: 'npm audit --audit-level=critical', returnStatus: true)

                    bat 'trivy image --severity HIGH,CRITICAL --format table %DOCKER_IMAGE%:%BUILD_VERSION%'
                }
            }

            post {
                always {
                    dir("${PROJECT_DIR}") {
                        archiveArtifacts artifacts: 'npm-audit-report.json', allowEmptyArchive: true
                    }
                }
            }
        }

        // ========================================================
        // DEPLOY
        // ========================================================
        stage('Deploy') {
            steps {
                echo '========== DEPLOY =========='

                dir("${PROJECT_DIR}") {

                    bat 'docker compose -f docker-compose.staging.yml down --remove-orphans'
                    bat 'set "BUILD_VERSION=%BUILD_VERSION%" && docker compose -f docker-compose.staging.yml up -d --build'

                    bat 'dir dist'
                    bat 'type dist\\index.html'
                }
            }
        }

        // ========================================================
        // RELEASE
        // ========================================================
        stage('Release') {
            steps {
                echo '========== RELEASE =========='

                dir("${PROJECT_DIR}") {

                    bat(script: 'git tag -a v%BUILD_VERSION% -m "Release v%BUILD_VERSION%"', returnStatus: true)

                    bat 'docker tag %DOCKER_IMAGE%:%BUILD_VERSION% %DOCKER_REGISTRY%/%DOCKER_IMAGE%:%BUILD_VERSION%'
                    bat 'docker tag %DOCKER_IMAGE%:%BUILD_VERSION% %DOCKER_REGISTRY%/%DOCKER_IMAGE%:latest'

                    bat 'docker push %DOCKER_REGISTRY%/%DOCKER_IMAGE%:%BUILD_VERSION%'
                    bat 'docker push %DOCKER_REGISTRY%/%DOCKER_IMAGE%:latest'

                    bat 'docker compose -f docker-compose.production.yml down --remove-orphans'
                    bat 'set "RELEASE_VERSION=%BUILD_VERSION%" && docker compose -f docker-compose.production.yml up -d'
                }
            }
        }

        // ========================================================
        // MONITORING
        // ========================================================
        stage('Monitoring') {
            steps {
                echo '========== MONITORING =========='

                dir("${PROJECT_DIR}") {

                    bat 'docker compose -f docker-compose.monitoring.yml up -d'

                    bat 'type monitoring\\prometheus.yml'
                    bat 'type monitoring\\alert-rules.yml'
                }

                bat(script: 'curl -sf http://localhost:9090/-/ready', returnStatus: true)
                bat(script: 'curl -sf http://localhost:3001/api/health', returnStatus: true)
            }
        }
    }

    // ============================================================
    // POST ACTIONS (EMAIL FIXED)
    // ============================================================
    post {

        always {
            echo "Pipeline completed: ${currentBuild.currentResult}"
        }

        success {
            script {
                emailext(
                    to: "${NOTIFICATION_EMAIL}",
                    subject: " Jenkins SUCCESS: ${APP_NAME} v${BUILD_VERSION}",
                    body: """
Build Successful

Project : ${APP_NAME}
Job     : ${env.JOB_NAME}
Build   : #${env.BUILD_NUMBER}
Version : ${BUILD_VERSION}
Status  : SUCCESS
Duration: ${currentBuild.durationString}

URL:
${env.BUILD_URL}
""",
                    attachLog: true
                )
            }
        }

        failure {
            script {
                emailext(
                    to: "${NOTIFICATION_EMAIL}",
                    subject: " Jenkins FAILED: ${APP_NAME} v${BUILD_VERSION}",
                    body: """
Build Failed

Project : ${APP_NAME}
Job     : ${env.JOB_NAME}
Build   : #${env.BUILD_NUMBER}
Version : ${BUILD_VERSION}
Status  : FAILURE
Duration: ${currentBuild.durationString}

URL:
${env.BUILD_URL}

Please investigate immediately.
""",
                    attachLog: true
                )
            }
        }
    }
}
