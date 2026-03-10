<?php

/**
 * Copyright Maarch since 2008 under licence GPLv3.
 * See LICENCE.txt file at the root folder for more details.
 * This file is part of Maarch software.
 */

/**
 * @brief Authentication Controller
 *
 * @author dev@maarch.org
 */

namespace SrcCore\controllers;

use Configuration\models\ConfigurationModel;
use DateInterval;
use DateTime;
use Email\controllers\EmailController;
use Exception;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use History\controllers\HistoryController;
use Parameter\models\ParameterModel;
use phpCAS;
use Respect\Validation\Validator;
use SimpleSAML\Auth\Simple;
use Slim\Psr7\Request;
use SrcCore\http\Response;
use SrcCore\models\AuthenticationModel;
use SrcCore\models\CoreConfigModel;
use SrcCore\models\CurlModel;
use SrcCore\models\PasswordModel;
use SrcCore\models\ValidatorModel;
use stdClass;
use Stevenmaguire\OAuth2\Client\Provider\Keycloak;
use User\controllers\UserController;
use User\models\UserEntityModel;
use User\models\UserModel;
use Entity\models\EntityModel;
use VersionUpdate\controllers\VersionUpdateController;

class AuthenticationController
{
    public const MAX_DURATION_TOKEN = 30; //Minutes
    public const ROUTES_WITHOUT_AUTHENTICATION = [
        'GET/authenticationInformations',
        'PUT/versionsUpdateSQL',
        'GET/validUrl',
        'GET/authenticate/token',
        'GET/images',
        'POST/password',
        'PUT/password',
        'GET/passwordRules',
        'GET/jnlp/{jnlpUniqueId}',
        'GET/onlyOffice/mergedFile',
        'POST/onlyOfficeCallback',
        'POST/authenticate',
        'GET/wopi/files/{id}',
        'GET/wopi/files/{id}/contents',
        'POST/wopi/files/{id}/contents',
        'GET/onlyOffice/content',
        'GET/languages/{lang}',
        'GET/languages',
        'POST/administration/shippings/{id}/notifications',
        'POST/signatureBook/webhook'
    ];

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws Exception
     */
    public function getInformations(Request $request, Response $response): Response
    {
        $path = CoreConfigModel::getConfigPath();
        if (!file_exists($path)) {
            return $response->withStatus(403)->withJson(['errors' => 'No configuration file found']);
        }
        $hashedPath = hash('sha256', $path);

        $appName = CoreConfigModel::getApplicationName();
        $configFile = CoreConfigModel::getJsonLoaded(['path' => 'config/config.json']);
        $maarchUrl = $configFile['config']['maarchUrl'] ?? '';
        $plugins = $configFile['config']['plugins'] ?? [];

        $parameter = ParameterModel::getById(['id' => 'loginpage_message', 'select' => ['param_value_string']]);

        $encryptKeyChanged = CoreConfigModel::hasEncryptKeyChanged();

        $loggingMethod = CoreConfigModel::getLoggingMethod();
        $authUri = null;
        if ($loggingMethod['id'] == 'cas') {
            $casConfiguration = CoreConfigModel::getXmlLoaded(['path' => 'config/cas_config.xml']);
            $hostname = (string)$casConfiguration->WEB_CAS_URL;
            $port = (string)$casConfiguration->WEB_CAS_PORT;
            $uri = (string)$casConfiguration->WEB_CAS_CONTEXT;
            $authUri = "https://{$hostname}:{$port}{$uri}/login?service=" .
                UrlController::getCoreUrl() .
                'dist/index.html#/login';
        } elseif ($loggingMethod['id'] == 'keycloak') {
            $keycloakConfig = CoreConfigModel::getKeycloakConfiguration();
            $provider = new Keycloak($keycloakConfig);
            $authUri = $provider->getAuthorizationUrl(['scope' => $keycloakConfig['scope']]);
            $keycloakState = $provider->getState();
        } elseif ($loggingMethod['id'] == 'sso') {
            $ssoConfiguration = ConfigurationModel::getByPrivilege(
                [
                    'privilege' => 'admin_sso',
                    'select'    => ['value']
                ]
            );
            $ssoConfiguration = !empty($ssoConfiguration['value'])
                ? json_decode($ssoConfiguration['value'], true)
                : null;
            $authUri = $ssoConfiguration['url'] ?? null;
        } elseif ($loggingMethod['id'] == 'openam') {
            $configuration = CoreConfigModel::getJsonLoaded(['path' => 'config/openAM.json']);
            $authUri = $configuration['connectionUrl'] ?? null;
        }


        $emailConfiguration = ConfigurationModel::getByPrivilege(
            [
                'privilege' => 'admin_email_server',
                'select'    => ['value']
            ]
        );
        $emailConfiguration = !empty($emailConfiguration['value'])
            ? json_decode($emailConfiguration['value'], true)
            : null;

        $loadedXml = CoreConfigModel::getXmlLoaded(['path' => 'modules/visa/xml/remoteSignatoryBooks.xml']);
        $externalSignatoryBook = null;

        if (!empty($loadedXml)) {
            if (!empty((string)$loadedXml->signatoryBookEnabled)) {
                $externalSignatoryBook['id'] = (string)$loadedXml->signatoryBookEnabled;
                if ($externalSignatoryBook['id'] == 'maarchParapheur') {
                    $externalSignatoryBook['integratedWorkflow'] = true;
                } else {
                    foreach ($loadedXml->signatoryBook as $value) {
                        if ((string)$value->id === $externalSignatoryBook['id']) {
                            $externalSignatoryBook['integratedWorkflow'] =
                                filter_var(
                                    (string)$value->integratedWorkflow,
                                    FILTER_VALIDATE_BOOLEAN
                                ) ?? false;
                            break;
                        }
                    }
                }
            }
        }

        $file = CoreConfigModel::getJsonLoaded(['path' => 'config/config.json']);
        $idleTime = 10080; // minutes
        if (!empty($file['config']['idleTime'])) {
            $idleTime = (int)$file['config']['idleTime'];
        }

        $return = [
            'instanceId'            => $hashedPath,
            'applicationName'       => $appName,
            'loginMessage'          => $parameter['param_value_string'] ?? null,
            'changeKey'             => !$encryptKeyChanged,
            'authMode'              => $loggingMethod['id'],
            'authUri'               => $authUri,
            'lang'                  => CoreConfigModel::getLanguage(),
            'mailServerOnline'      => $emailConfiguration['online'] ?? false,
            'maarchUrl'             => $maarchUrl,
            'externalSignatoryBook' => $externalSignatoryBook,
            'idleTime'              => $idleTime,
            'migrating'             => VersionUpdateController::isMigrating(),
            'plugins'               => $plugins
        ];

        if (!empty($keycloakState)) {
            $return['keycloakState'] = $keycloakState;
        }

        return $response->withJson($return);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     */
    public function getValidUrl(Request $request, Response $response): Response
    {
        if (!is_file('custom/custom.json')) {
            return $response->withJson(['message' => 'No custom file', 'lang' => 'noConfiguration']);
        }

        $jsonFile = file_get_contents('custom/custom.json');
        $jsonFile = json_decode($jsonFile, true);
        if (empty($jsonFile)) {
            return $response->withJson(['message' => 'No custom', 'lang' => 'noConfiguration']);
        } elseif (count($jsonFile) > 1) {
            return $response->withJson(['message' => 'There is more than 1 custom', 'lang' => 'moreOneCustom']);
        }

        $url = null;
        if (!empty($jsonFile[0]['path'])) {
            $coreUrl = UrlController::getCoreUrl();
            $url = $coreUrl . $jsonFile[0]['path'] . "/dist/index.html";
        } elseif (!empty($jsonFile[0]['uri'])) {
            $url = $jsonFile[0]['uri'] . "/dist/index.html";
        }

        return $response->withJson(['url' => $url]);
    }

    /**
     * @param array $authorizationHeaders
     * @return mixed|null
     * @throws Exception
     */
    public static function authentication(array $authorizationHeaders = []): mixed
    {
        $userId = null;

        $canBasicAuth = true;
        $loginMethod = CoreConfigModel::getLoggingMethod();
        if ($loginMethod['id'] != 'standard' && !empty($_SERVER['PHP_AUTH_USER']) && !empty($_SERVER['PHP_AUTH_PW'])) {
            $rawUser = UserModel::getByLogin(['select' => ['mode'], 'login' => $_SERVER['PHP_AUTH_USER']]);
            if (!empty($rawUser) && $rawUser['mode'] != 'rest') {
                $canBasicAuth = false;
            }
        }

        if (
            !empty($_SERVER['PHP_AUTH_USER'])
            && !empty($_SERVER['PHP_AUTH_PW'])
            && $canBasicAuth
        ) {
            if (
                AuthenticationModel::authentication(
                    [
                        'login'    => $_SERVER['PHP_AUTH_USER'],
                        'password' => $_SERVER['PHP_AUTH_PW']
                    ]
                )
            ) {
                $user = UserModel::getByLogin(['select' => ['id', 'mode'], 'login' => $_SERVER['PHP_AUTH_USER']]);
                $userId = $user['id'];
            }
        } elseif (!empty($authorizationHeaders)) {
            $token = null;
            foreach ($authorizationHeaders as $authorizationHeader) {
                if (str_starts_with($authorizationHeader, 'Bearer')) {
                    $token = str_replace('Bearer ', '', $authorizationHeader);
                }
            }

            $headers = new stdClass();
            $headers->headers = ['HS256'];
            $encryptKey = CoreConfigModel::getEncryptKey();
            $key = new Key($encryptKey, 'HS256');
            if (!empty($token)) {
                try {
                    $jwt = (array)JWT::decode($token, $key, $headers);
                } catch (Exception) {
                    return null;
                }
                $jwt['user'] = (array)$jwt['user'];
                if (!empty($jwt) && !empty($jwt['user']['id'])) {
                    $userId = $jwt['user']['id'];
                }
                $GLOBALS['token'] = $token;
            }
        }

        if (!empty($userId)) {
            UserModel::update([
                'set'   => ['reset_token' => null],
                'where' => ['id = ?'],
                'data'  => [$userId]
            ]);
        }

        return $userId;
    }

    /**
     * @param array $args
     * @return array|true[]
     * @throws Exception
     */
    public static function isRouteAvailable(array $args): array
    {
        ValidatorModel::notEmpty($args, ['userId', 'currentRoute', 'currentMethod']);
        ValidatorModel::intVal($args, ['userId']);
        ValidatorModel::stringType($args, ['currentRoute', 'currentMethod']);

        $user = UserModel::getById(
            [
                'select' => ['status', 'password_modification_date', 'mode', 'authorized_api'],
                'id'     => $args['userId']
            ]
        );

        if ($user['mode'] == 'rest') {
            $authorizedApi = json_decode($user['authorized_api'], true);
            if (
                !empty($authorizedApi)
                && !in_array(
                    $args['currentMethod'] .
                    $args['currentRoute'],
                    $authorizedApi
                )
            ) {
                return ['isRouteAvailable' => false, 'errors' => 'This route is not authorized for this user'];
            }
            return ['isRouteAvailable' => true];
        } elseif (
            $user['status'] == 'ABS'
            && !in_array(
                $args['currentRoute'],
                [
                    '/users/{id}/status',
                    '/currentUser/profile',
                    '/header',
                    '/passwordRules',
                    '/users/{id}/password'
                ]
            )
        ) {
            return ['isRouteAvailable' => false, 'errors' => 'User is ABS and must be activated'];
        }

        if (!in_array($args['currentRoute'], ['/passwordRules', '/users/{id}/password'])) {
            $loggingMethod = CoreConfigModel::getLoggingMethod();

            if ($loggingMethod['id'] == 'standard') {
                $passwordRules = PasswordModel::getEnabledRules();
                if (!empty($passwordRules['renewal'])) {
                    $currentDate = new DateTime();
                    $lastModificationDate = new DateTime($user['password_modification_date']);
                    $lastModificationDate->add(new DateInterval("P{$passwordRules['renewal']}D"));

                    if ($currentDate > $lastModificationDate) {
                        return ['isRouteAvailable' => false, 'errors' => 'User must change his password'];
                    }
                }
            }
        }

        return ['isRouteAvailable' => true];
    }

    /**
     * @param array $args
     * @return array|true
     * @throws Exception
     */
    public static function handleFailedAuthentication(array $args): bool|array
    {
        ValidatorModel::notEmpty($args, ['userId']);
        ValidatorModel::intVal($args, ['userId']);

        $passwordRules = PasswordModel::getEnabledRules();

        if (!empty($passwordRules['lockAttempts'])) {
            $user = UserModel::getById(
                [
                    'select' => [
                        'failed_authentication',
                        'locked_until'
                    ],
                    'id'     => $args['userId']
                ]
            );
            $set = [];
            if (!empty($user['locked_until'])) {
                $currentDate = new DateTime();
                $lockedUntil = new DateTime($user['locked_until']);
                if ($lockedUntil < $currentDate) {
                    $set['locked_until'] = null;
                    $user['failed_authentication'] = 0;
                } else {
                    return ['accountLocked' => true, 'lockedDate' => $user['locked_until']];
                }
            }

            $set['failed_authentication'] = $user['failed_authentication'] + 1;
            UserModel::update(
                [
                    'set'   => $set,
                    'where' => ['id = ?'],
                    'data'  => [
                        $args['userId']
                    ]
                ]
            );

            if (
                !empty($user['failed_authentication'])
                && ($user['failed_authentication'] + 1) >= $passwordRules['lockAttempts']
                && !empty($passwordRules['lockTime'])
            ) {
                $lockedUntil = time() + 60 * $passwordRules['lockTime'];
                UserModel::update([
                    'set'   => ['locked_until' => date('Y-m-d H:i:s', $lockedUntil)],
                    'where' => ['id = ?'],
                    'data'  => [$args['userId']]
                ]);
                return ['accountLocked' => true, 'lockedDate' => date('Y-m-d H:i:s', $lockedUntil)];
            }
        }

        return true;
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws Exception
     */
    public function authenticate(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody();

        $loggingMethod = CoreConfigModel::getLoggingMethod();
        if (in_array($loggingMethod['id'], ['standard', 'ldap'])) {
            if (
                !Validator::stringType()->notEmpty()->validate($body['login'] ?? null)
                || !Validator::stringType()->notEmpty()->validate($body['password'])
            ) {
                return $response->withStatus(400)->withJson(['errors' => 'Bad Request']);
            }
        }

        if ($loggingMethod['id'] == 'standard') {
            $login = strtolower($body['login']);
            if (!AuthenticationController::isUserAuthorized(['login' => $login])) {
                return $response->withStatus(403)->withJson(['errors' => 'Authentication Failed']);
            }
            $authenticated = AuthenticationController::standardConnection(
                [
                    'login'    => $login,
                    'password' => $body['password']
                ]
            );
            if (!empty($authenticated['date'])) {
                return $response->withStatus(401)->withJson(
                    [
                        'errors' => $authenticated['errors'],
                        'date'   => $authenticated['date']
                    ]
                );
            } elseif (!empty($authenticated['errors'])) {
                return $response->withStatus(401)->withJson(['errors' => $authenticated['errors']]);
            }
        } elseif ($loggingMethod['id'] == 'ldap') {
            $login = $body['login'];
            $existingUser = UserModel::getByLowerLogin(['login' => $login, 'select' => ['mode', 'status']]);
            if (!empty($existingUser) && ($existingUser['mode'] == 'rest' || $existingUser['status'] == 'SPD')) {
                return $response->withStatus(403)->withJson(['errors' => 'Authentication Failed']);
            }
            $authenticated = AuthenticationController::ldapConnection(
                [
                    'login'    => $login,
                    'password' => $body['password']
                ]
            );
            if (!empty($authenticated['errors'])) {
                return $response->withStatus(401)->withJson(['errors' => $authenticated['errors']]);
            }
            try {
                $ldapUserData = AuthenticationController::getLdapUserData([
                    'login'    => $login,
                    'password' => $body['password']
                ]);
                AuthenticationController::ensureLdapUserExists(['login' => $login, 'ldapData' => $ldapUserData]);
                AuthenticationController::syncLdapUserData(['login' => $login, 'ldapData' => $ldapUserData]);
                AuthenticationController::syncLdapUserEntity(['login' => $login, 'ldapData' => $ldapUserData]);
            } catch (\Throwable) {
                // Do not block successful LDAP authentication on profile/entity sync issue.
                try {
                    AuthenticationController::ensureLdapUserExists(['login' => $login]);
                } catch (\Throwable) {
                    return $response->withStatus(401)->withJson(['errors' => 'Authentication Failed']);
                }
            }
        } elseif ($loggingMethod['id'] == 'cas') {
            $authenticated = AuthenticationController::casConnection();
            if (!empty($authenticated['errors'])) {
                return $response->withStatus(401)->withJson(['errors' => $authenticated['errors']]);
            }
            $login = strtolower($authenticated['login']);
            if (!AuthenticationController::isUserAuthorized(['login' => $login])) {
                return $response->withStatus(403)->withJson(['errors' => 'Authentication Failed']);
            }
        } elseif ($loggingMethod['id'] == 'keycloak') {
            $queryParams = $request->getQueryParams();
            $authenticated = AuthenticationController::keycloakConnection(['code' => $queryParams['code']]);
            if (!empty($authenticated['errors'])) {
                return $response->withStatus(401)->withJson(['errors' => $authenticated['errors']]);
            }
            $login = $authenticated['login'];
            if (!AuthenticationController::isUserAuthorized(['login' => $login])) {
                return $response->withStatus(403)->withJson(['errors' => 'Authentication unauthorized']);
            }
        } elseif ($loggingMethod['id'] == 'sso') {
            $authenticated = AuthenticationController::ssoConnection();
            if (!empty($authenticated['errors'])) {
                return $response->withStatus(401)->withJson(['errors' => $authenticated['errors']]);
            }
            $login = strtolower($authenticated['login']);
            if (!AuthenticationController::isUserAuthorized(['login' => $login])) {
                return $response->withStatus(403)->withJson(['errors' => 'Authentication unauthorized']);
            }
        } elseif ($loggingMethod['id'] == 'openam') {
            $authenticated = AuthenticationController::openAMConnection();
            if (!empty($authenticated['errors'])) {
                return $response->withStatus(401)->withJson(['errors' => $authenticated['errors']]);
            }
            $login = strtolower($authenticated['login']);
            if (!AuthenticationController::isUserAuthorized(['login' => $login])) {
                return $response->withStatus(403)->withJson(['errors' => 'Authentication unauthorized']);
            }
        } elseif ($loggingMethod['id'] == 'azure_saml') {
            $authenticated = AuthenticationController::azureSamlConnection();
            if (!empty($authenticated['errors'])) {
                return $response->withStatus(401)->withJson(['errors' => $authenticated['errors']]);
            }
            $login = strtolower($authenticated['login']);
            if (!AuthenticationController::isUserAuthorized(['login' => $login])) {
                return $response->withStatus(403)->withJson(['errors' => 'Authentication unauthorized']);
            }
        } else {
            return $response->withStatus(403)->withJson(['errors' => 'Logging method unauthorized']);
        }

        UserController::setAbsences();
        $user = UserModel::getByLowerLogin(['login' => $login, 'select' => ['id', 'refresh_token', 'user_id']]);
        if (empty($user['id'])) {
            return $response->withStatus(401)->withJson(['errors' => 'Authentication Failed']);
        }

        $GLOBALS['id'] = $user['id'];
        $GLOBALS['login'] = $user['user_id'];

        $user['refresh_token'] = json_decode($user['refresh_token'], true);
        foreach ($user['refresh_token'] as $key => $refreshToken) {
            $headers = new stdClass();
            $headers->headers = ['HS256'];
            $encryptKey = CoreConfigModel::getEncryptKey();
            $jwtKey = new Key($encryptKey, 'HS256');
            try {
                JWT::decode($refreshToken, $jwtKey, $headers);
            } catch (Exception $e) {
                unset($user['refresh_token'][$key]);
            }
        }
        $user['refresh_token'] = array_values($user['refresh_token']);
        if (count($user['refresh_token']) > 10) {
            array_shift($user['refresh_token']);
        }

        $refreshToken = AuthenticationController::getRefreshJWT();
        $user['refresh_token'][] = $refreshToken;
        UserModel::update([
            'set'   => [
                'reset_token'           => null,
                'refresh_token'         => json_encode($user['refresh_token']),
                'failed_authentication' => 0,
                'locked_until'          => null
            ],
            'where' => ['id = ?'],
            'data'  => [$user['id']]
        ]);

        $response = $response->withHeader('Token', AuthenticationController::getJWT());
        $response = $response->withHeader('Refresh-Token', $refreshToken);

        HistoryController::add([
            'tableName' => 'users',
            'recordId'  => $user['id'],
            'eventType' => 'LOGIN',
            'info'      => _LOGIN . ' : ' . $login,
            'moduleId'  => 'authentication',
            'eventId'   => 'userlogin'
        ]);

        return $response->withStatus(204);
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws Exception
     */
    public function logout(Request $request, Response $response): Response
    {
        $loggingMethod = CoreConfigModel::getLoggingMethod();

        $logoutUrl = null;
        if ($loggingMethod['id'] == 'cas') {
            $disconnection = AuthenticationController::casDisconnection();
            $logoutUrl = $disconnection['logoutUrl'];
        } elseif ($loggingMethod['id'] == 'keycloak') {
            $disconnection = AuthenticationController::keycloakDisconnection();
            $logoutUrl = $disconnection['logoutUrl'];
        } elseif ($loggingMethod['id'] == 'azure_saml') {
            $disconnection = AuthenticationController::azureSamlDisconnection();
            $logoutUrl = $disconnection['logoutUrl'];
        }

        HistoryController::add([
            'tableName' => 'users',
            'recordId'  => $GLOBALS['id'],
            'eventType' => 'LOGOUT',
            'info'      => _LOGOUT . ' : ' . $GLOBALS['login'],
            'moduleId'  => 'authentication',
            'eventId'   => 'userlogout'
        ]);

        return $response->withJson(['logoutUrl' => $logoutUrl]);
    }

    /**
     * @param array $args
     * @return array|string[]|true
     * @throws Exception
     */
    private static function standardConnection(array $args): array|bool
    {
        $login = $args['login'];
        $password = $args['password'];

        $authenticated = AuthenticationModel::authentication(['login' => $login, 'password' => $password]);
        if (empty($authenticated)) {
            $user = UserModel::getByLowerLogin(['login' => $login, 'select' => ['id']]);
            $handle = AuthenticationController::handleFailedAuthentication(['userId' => $user['id']]);
            if (!empty($handle['accountLocked'])) {
                return ['errors' => 'Account Locked', 'date' => $handle['lockedDate']];
            }
            return ['errors' => 'Authentication Failed'];
        }

        return true;
    }

    /**
     * @param array $args
     * @return array|bool
     * @throws Exception
     */
    private static function ldapConnection(array $args): array|bool
    {
        $login = $args['login'];
        $password = $args['password'];

        $ldapConfigurations = CoreConfigModel::getXmlLoaded(['path' => 'modules/ldap/xml/config.xml']);
        if (empty($ldapConfigurations) || empty($ldapConfigurations->config->ldap)) {
            return ['errors' => 'No ldap configurations'];
        }

        foreach ($ldapConfigurations->config->ldap as $ldapConfiguration) {
            $ssl = (string)$ldapConfiguration->ssl;
            $domain = (string)$ldapConfiguration->domain;
            $prefix = (string)$ldapConfiguration->prefix_login;
            $suffix = (string)$ldapConfiguration->suffix_login;
            $standardConnect = (string)$ldapConfiguration->standardConnect;

            $uri = ($ssl == 'true' ? "LDAPS://{$domain}" : $domain);

            $ldap = @ldap_connect($uri);
            if ($ldap === false) {
                $error = 'Ldap connect failed : uri is maybe wrong';
                continue;
            }
            ldap_set_option($ldap, LDAP_OPT_PROTOCOL_VERSION, 3);
            ldap_set_option($ldap, LDAP_OPT_REFERRALS, 0);
            ldap_set_option($ldap, LDAP_OPT_NETWORK_TIMEOUT, 10);
            $ldapLogin = (!empty($prefix) ? $prefix . '\\' . $login : $login);
            $ldapLogin = (!empty($suffix) ? $ldapLogin . $suffix : $ldapLogin);
            if (!empty((string)$ldapConfiguration->baseDN)) { //OpenLDAP
                $search = @ldap_search($ldap, (string)$ldapConfiguration->baseDN, "(uid={$ldapLogin})", ['dn']);
                if ($search === false) {
                    $error = 'Ldap search failed : baseDN is maybe wrong => ' . ldap_error($ldap);
                    continue;
                }
                $entries = ldap_get_entries($ldap, $search);
                $ldapLogin = $entries[0]['dn'];
            }
            $authenticated = @ldap_bind($ldap, $ldapLogin, $password);
            if ($authenticated) {
                break;
            }
            $error = ldap_error($ldap);
        }

        if (!empty($standardConnect) && $standardConnect == 'true') {
            if (empty($authenticated)) {
                $authenticated = AuthenticationModel::authentication(['login' => $login, 'password' => $password]);
            } else {
                $user = UserModel::getByLowerLogin(['login' => $login, 'select' => ['id']]);
                UserModel::updatePassword(['id' => $user['id'], 'password' => $password]);
            }
        }

        if (empty($authenticated) && !empty($error) && $error != 'Invalid credentials') {
            return ['errors' => $error];
        } elseif (empty($authenticated)) {
            return ['errors' => 'Authentication Failed'];
        }

        return true;
    }

    /**
     * @return array|string[]
     * @throws Exception
     */
    private static function casConnection(): array
    {
        $configFile = CoreConfigModel::getJsonLoaded(['path' => 'config/config.json']);
        $maarchUrl = $configFile['config']['maarchUrl'] ?? '';

        $casConfiguration = CoreConfigModel::getXmlLoaded(['path' => 'config/cas_config.xml']);

        $version = (string)$casConfiguration->CAS_VERSION;
        $hostname = (string)$casConfiguration->WEB_CAS_URL;
        $port = (string)$casConfiguration->WEB_CAS_PORT;
        $uri = (string)$casConfiguration->WEB_CAS_CONTEXT;
        $certificate = (string)$casConfiguration->PATH_CERTIFICATE;
        $separator = (string)$casConfiguration->ID_SEPARATOR;

        if (!in_array($version, ['CAS_VERSION_2_0', 'CAS_VERSION_3_0'])) {
            return ['errors' => 'Cas version not supported'];
        }
        $logConfig = LogsController::getLogConfig();
        $logTypeInfo = LogsController::getLogType('logTechnique');
        $logger = LogsController::initMonologLogger($logConfig, $logTypeInfo);

        phpCAS::setLogger($logger);

        if (!empty($logTypeInfo['errors'])) {
            return ['errors' => 'Cas configuration missing : ' . $logTypeInfo['errors']];
        }

        if ($logTypeInfo['level'] == 'DEBUG') {
            phpCAS::setVerbose(true);
        }

        phpCAS::client(constant($version), $hostname, (int)$port, $uri, $maarchUrl, $version != 'CAS_VERSION_3_0');

        if (!empty($certificate)) {
            phpCAS::setCasServerCACert($certificate);
        } else {
            phpCAS::setNoCasServerValidation();
        }
        phpCAS::setFixedServiceURL(UrlController::getCoreUrl() . 'dist/index.html');
        phpCAS::setNoClearTicketsFromUrl();
        if (!phpCAS::isAuthenticated()) {
            return ['errors' => 'Cas authentication failed'];
        }

        $casId = phpCAS::getUser();
        if (!empty($separator)) {
            $login = explode($separator, $casId)[0];
        } else {
            $login = $casId;
        }

        return ['login' => $login];
    }

    /**
     * @return array|string[]
     * @throws Exception
     */
    private static function casDisconnection(): array
    {
        $configFile = CoreConfigModel::getJsonLoaded(['path' => 'config/config.json']);
        $maarchUrl = $configFile['config']['maarchUrl'] ?? '';

        $casConfiguration = CoreConfigModel::getXmlLoaded(['path' => 'config/cas_config.xml']);

        $version = (string)$casConfiguration->CAS_VERSION;
        $hostname = (string)$casConfiguration->WEB_CAS_URL;
        $port = (string)$casConfiguration->WEB_CAS_PORT;
        $uri = (string)$casConfiguration->WEB_CAS_CONTEXT;
        $certificate = (string)$casConfiguration->PATH_CERTIFICATE;


        $logConfig = LogsController::getLogConfig();
        $logTypeInfo = LogsController::getLogType('logTechnique');
        $logger = LogsController::initMonologLogger($logConfig, $logTypeInfo);
        phpCAS::setLogger($logger);

        if (!empty($logTypeInfo['errors'])) {
            return ['errors' => 'Cas configuration missing : ' . $logTypeInfo['errors']];
        }

        if ($logTypeInfo['level'] == 'DEBUG') {
            phpCAS::setVerbose(true);
        }

        phpCAS::client(constant($version), $hostname, (int)$port, $uri, $maarchUrl, $version != 'CAS_VERSION_3_0');

        if (!empty($certificate)) {
            phpCAS::setCasServerCACert($certificate);
        } else {
            phpCAS::setNoCasServerValidation();
        }
        phpCAS::setFixedServiceURL(UrlController::getCoreUrl() . 'dist/index.html');
        phpCAS::setNoClearTicketsFromUrl();
        $logoutUrl = phpCAS::getServerLogoutURL();

        return ['logoutUrl' => $logoutUrl];
    }

    /**
     * @return array|string[]
     */
    private static function ssoConnection(): array
    {
        $ssoConfiguration = ConfigurationModel::getByPrivilege(['privilege' => 'admin_sso', 'select' => ['value']]);
        if (empty($ssoConfiguration['value'])) {
            return ['errors' => 'Sso configuration missing'];
        }

        $ssoConfiguration = json_decode($ssoConfiguration['value'], true);
        $mapping = array_column($ssoConfiguration['mapping'], 'ssoId', 'maarchId');
        if (empty($mapping['login'])) {
            return ['errors' => 'Sso configuration missing : no login mapping'];
        }

        if (in_array(strtoupper($mapping['login']), ['REMOTE_USER', 'PHP_AUTH_USER'])) {
            $login = $_SERVER[strtoupper($mapping['login'])] ?? null;
        } else {
            $login = $_SERVER['HTTP_' . strtoupper($mapping['login'])] ?? null;
        }
        if (empty($login)) {
            $headers = [];
            $apacheHeaders = apache_request_headers();
            if (!empty($apacheHeaders)) {
                foreach ($apacheHeaders as $key => $value) {
                    $headers[strtoupper($key)] = $value;
                }
            }
            $login = $headers[strtoupper($mapping['login'])] ?? null;
        }
        if (empty($login)) {
            return ['errors' => 'Authentication Failed : login not present in header'];
        }

        return ['login' => $login];
    }

    /**
     * @param array $args
     * @return array|string[]
     * @throws Exception
     */
    private static function keycloakConnection(array $args): array
    {
        $keycloakConfig = CoreConfigModel::getKeycloakConfiguration();

        if (
            empty($keycloakConfig)
            || empty($keycloakConfig['authServerUrl'])
            || empty($keycloakConfig['realm'])
            || empty($keycloakConfig['clientId'])
            || empty($keycloakConfig['clientSecret'])
            || empty($keycloakConfig['redirectUri'])
            || empty($keycloakConfig['version'])
        ) {
            return ['errors' => 'Keycloak not configured'];
        }

        $provider = new Keycloak($keycloakConfig);

        try {
            $token = $provider->getAccessToken('authorization_code', ['code' => $args['code']]);
        } catch (Exception $e) {
            return ['errors' => 'Authentication Failed'];
        }

        try {
            $user = $provider->getResourceOwner($token);

            $login = $user->getUsername();
            $keycloakAccessToken = $token->getToken();

            $userMaarch = UserModel::getByLogin(['login' => $login, 'select' => ['id', 'external_id']]);

            if (empty($userMaarch)) {
                return ['errors' => 'Authentication Failed'];
            }

            $userMaarch['external_id'] = json_decode($userMaarch['external_id'], true);
            $userMaarch['external_id']['keycloakAccessToken'] = $keycloakAccessToken;
            $userMaarch['external_id'] = json_encode($userMaarch['external_id']);

            UserModel::updateExternalId(['id' => $userMaarch['id'], 'externalId' => $userMaarch['external_id']]);

            return ['login' => $login];
        } catch (Exception) {
            return ['errors' => 'Authentication Failed'];
        }
    }

    /**
     * @return array
     * @throws Exception
     */
    private static function keycloakDisconnection(): array
    {
        $keycloakConfig = CoreConfigModel::getKeycloakConfiguration();

        $provider = new Keycloak($keycloakConfig);

        $externalId = UserModel::getById(['id' => $GLOBALS['id'], 'select' => ['external_id']]);
        $externalId = json_decode($externalId['external_id'], true);
        $accessToken = $externalId['keycloakAccessToken'];
        unset($externalId['keycloakAccessToken']);
        UserModel::update([
            'set'   => ['external_id' => json_encode($externalId)],
            'where' => ['id = ?'],
            'data'  => [$GLOBALS['id']]
        ]);

        $url = $provider->getLogoutUrl(['client_id' => $keycloakConfig['clientId'], 'refresh_token' => $accessToken]);

        return ['logoutUrl' => $url];
    }

    /**
     * @return array|string[]
     * @throws Exception
     */
    private static function openAMConnection(): array
    {
        $configuration = CoreConfigModel::getJsonLoaded(['path' => 'config/openAM.json']);

        if (
            empty($configuration['attributeUrl'])
            || empty($configuration['cookieName'])
            || empty($configuration['attributeName'])
        ) {
            return ['errors' => 'OpenAM configuration missing'];
        }

        if (empty($_COOKIE[$configuration['cookieName']])) {
            return ['errors' => 'Authentication Failed : User cookie is not set'];
        }
        $curlResponse = CurlModel::exec([
            'url'    => "{$configuration['attributeUrl']}
            ?subjectid={$_COOKIE[$configuration['cookieName']]}
            &attributenames={$configuration['attributeName']}",
            'method' => 'GET',
        ]);

        $login = $curlResponse['response']['attributes'][0]['values'][0] ?? null;

        if (empty($login)) {
            return ['errors' => 'Authentication Failed : login not present in response'];
        }

        return ['login' => $login];
    }

    /**
     * @return array|string[]
     */
    private static function azureSamlConnection(): array
    {
        $libDir = CoreConfigModel::getLibrariesDirectory();
        if (!is_file($libDir . 'simplesamlphp/lib/_autoload.php')) {
            return ['errors' => 'Library simplesamlphp not present'];
        }

        require_once($libDir . 'simplesamlphp/lib/_autoload.php');
        $as = new Simple('default-sp');
        $as->requireAuth([
            'ReturnTo'        => UrlController::getCoreUrl(),
            'skipRedirection' => true
        ]);

        $attributes = $as->getAttributes();
        $login = $attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'][0];
        if (empty($login)) {
            return ['errors' => 'Authentication Failed : login not present in attributes'];
        }

        return ['login' => $login];
    }

    /**
     * @return array|string[]
     */
    private static function azureSamlDisconnection(): array
    {
        $libDir = CoreConfigModel::getLibrariesDirectory();
        if (!is_file($libDir . 'simplesamlphp/lib/_autoload.php')) {
            return ['errors' => 'Library simplesamlphp not present'];
        }

        require_once($libDir . 'simplesamlphp/lib/_autoload.php');
        $as = new Simple('default-sp');
        $url = $as->getLogoutURL();

        return ['logoutUrl' => $url];
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws Exception
     */
    public function getRefreshedToken(Request $request, Response $response): Response
    {
        $queryParams = $request->getQueryParams();

        if (!Validator::stringType()->notEmpty()->validate($queryParams['refreshToken'])) {
            return $response->withStatus(400)->withJson(['errors' => 'Refresh Token is empty']);
        }

        $headers = new stdClass();
        $headers->headers = ['HS256'];
        $encryptKey = CoreConfigModel::getEncryptKey();
        $key = new Key($encryptKey, 'HS256');
        try {
            $jwt = JWT::decode($queryParams['refreshToken'], $key, $headers);
        } catch (Exception $e) {
            return $response->withStatus(401)->withJson(['errors' => 'Authentication Failed']);
        }

        $user = UserModel::getById(['select' => ['id', 'refresh_token'], 'id' => $jwt->user->id]);
        if (empty($user['refresh_token'])) {
            return $response->withStatus(401)->withJson(['errors' => 'Authentication Failed']);
        }

        $user['refresh_token'] = json_decode($user['refresh_token'], true);
        if (!in_array($queryParams['refreshToken'], $user['refresh_token'])) {
            return $response->withStatus(401)->withJson(['errors' => 'Authentication Failed']);
        }

        $GLOBALS['id'] = $user['id'];

        return $response->withJson(['token' => AuthenticationController::getJWT()]);
    }

    /**
     * @return string
     * @throws Exception
     */
    public static function getJWT(): string
    {
        $sessionTime = AuthenticationController::MAX_DURATION_TOKEN;

        $file = CoreConfigModel::getJsonLoaded(['path' => 'config/config.json']);
        if ($file) {
            if (!empty($file['config']['cookieTime'])) {
                if ($sessionTime > (int)$file['config']['cookieTime']) {
                    $sessionTime = (int)$file['config']['cookieTime'];
                }
            }
        }
        if ($file['config']['newInternalParaph'] ?? null) {
            $user = UserModel::getById(
                [
                    'id'     => $GLOBALS['id'],
                    'select' => ['id', 'firstname', 'lastname', 'status', 'user_id as login', 'external_id']
                ]
            );
            $externalId = json_decode($user['external_id'], true);
            if ($externalId['internalParapheur'] ?? null) {
                $user['external_id'] = $externalId['internalParapheur'];
            } else {
                $user = UserModel::getById(
                    [
                        'id'     => $GLOBALS['id'],
                        'select' => ['id', 'firstname', 'lastname', 'status', 'user_id as login']
                    ]
                );
            }
        } else {
            $user = UserModel::getById(
                [
                    'id'     => $GLOBALS['id'],
                    'select' => ['id', 'firstname', 'lastname', 'status', 'user_id as login']
                ]
            );
        }

        $token = [
            'exp'  => time() + 60 * $sessionTime,
            'user' => $user
        ];

        return JWT::encode($token, CoreConfigModel::getEncryptKey(), 'HS256');
    }

    /**
     * @return string
     * @throws Exception
     */
    public static function getRefreshJWT(): string
    {
        $sessionTime = AuthenticationController::MAX_DURATION_TOKEN;

        $file = CoreConfigModel::getJsonLoaded(['path' => 'config/config.json']);
        if ($file) {
            $sessionTime = (int)$file['config']['cookieTime'];
        }

        $token = [
            'exp'  => time() + 60 * $sessionTime,
            'user' => [
                'id' => $GLOBALS['id']
            ]
        ];

        return JWT::encode($token, CoreConfigModel::getEncryptKey(), 'HS256');
    }

    /**
     * @param array $args
     * @return string
     */
    public static function getResetJWT(array $args = []): string
    {
        $token = [
            'exp'  => time() + $args['expirationTime'],
            'user' => [
                'id' => $args['id']
            ]
        ];

        return JWT::encode($token, CoreConfigModel::getEncryptKey(), 'HS256');
    }

    /**
     * @param array $args
     * @return bool
     * @throws Exception
     */
    public static function sendAccountActivationNotification(array $args): bool
    {
        $resetToken = AuthenticationController::getResetJWT(
            [
                'id'             => $args['userId'],
                'expirationTime' => 1209600
            ]
        ); // 14 days
        UserModel::update(
            [
                'set'   => ['reset_token' => $resetToken],
                'where' => ['id = ?'],
                'data'  => [$args['userId']]
            ]
        );

        $url = UrlController::getCoreUrl() . 'dist/index.html#/reset-password?token=' . $resetToken;

        $configuration = ConfigurationModel::getByPrivilege(
            [
                'privilege' => 'admin_email_server',
                'select'    => ['value']
            ]
        );
        $configuration = json_decode($configuration['value'], true);
        if (!empty($configuration['from'])) {
            $sender = $configuration['from'];
        } else {
            $sender = $args['userEmail'];
        }
        $user = UserModel::getById(['select' => ['user_id'], 'id' => $args['userId']]);
        EmailController::createEmail([
            'userId' => $args['userId'],
            'data'   => [
                'sender'     => ['email' => $sender],
                'recipients' => [$args['userEmail']],
                'object'     => _NOTIFICATIONS_USER_CREATION_SUBJECT,
                'body'       => _NOTIFICATIONS_USER_CREATION_BODY
                    . '<a href="'
                    . $url
                    . '">'
                    . $url
                    . '</a><br/><br/>'
                    . _YOUR_ID
                    . ' '
                    . $user['user_id']
                    . _NOTIFICATIONS_USER_CREATION_FOOTER,
                'isHtml'     => true,
                'status'     => 'WAITING'
            ]
        ]);

        return true;
    }

    /**
     * @param array $args
     * @return bool
     * @throws Exception
     */
    private static function isUserAuthorized(array $args): bool
    {
        $user = UserModel::getByLowerLogin(['login' => $args['login'], 'select' => ['mode', 'status']]);
        if (empty($user) || $user['mode'] == 'rest' || $user['status'] == 'SPD') {
            return false;
        }

        return true;
    }

    /**
     * Ensure LDAP-authenticated users exist in local Maarch users table.
     * They can then be assigned groups/entities by an administrator.
     */
    private static function ensureLdapUserExists(array $args): void
    {
        $login = trim((string)($args['login'] ?? ''));
        $ldapData = $args['ldapData'] ?? [];
        if ($login === '') {
            return;
        }

        $user = UserModel::getByLowerLogin(['login' => $login, 'select' => ['id']]);
        if (!empty($user)) {
            return;
        }

        $firstname = trim((string)($ldapData['firstname'] ?? ''));
        $lastname = trim((string)($ldapData['lastname'] ?? ''));
        $mail = trim((string)($ldapData['mail'] ?? ''));
        $phone = trim((string)($ldapData['phone'] ?? ''));

        if ($firstname === '') {
            $firstname = $login;
        }
        if ($lastname === '') {
            $lastname = $login;
        }

        UserModel::create([
            'user' => [
                'userId'      => $login,
                'password'    => '',
                'firstname'   => $firstname,
                'lastname'    => $lastname,
                'mail'        => $mail,
                'phone'       => $phone,
                'preferences' => '{}',
                'mode'        => 'standard'
            ]
        ]);
    }

    /**
     * Update local user profile fields from LDAP directory attributes.
     */
    private static function syncLdapUserData(array $args): void
    {
        $login = trim((string)($args['login'] ?? ''));
        if ($login === '') {
            return;
        }

        $ldapData = $args['ldapData'] ?? [];
        if (empty($ldapData)) {
            return;
        }

        $user = UserModel::getByLowerLogin([
            'login'  => $login,
            'select' => ['id', 'firstname', 'lastname', 'mail', 'phone']
        ]);
        if (empty($user)) {
            return;
        }

        $set = [];
        foreach (['firstname', 'lastname', 'mail', 'phone'] as $field) {
            if (!empty($ldapData[$field]) && $ldapData[$field] !== ($user[$field] ?? null)) {
                $set[$field] = $ldapData[$field];
            }
        }

        if (!empty($set)) {
            UserModel::update([
                'set'   => $set,
                'where' => ['id = ?'],
                'data'  => [$user['id']]
            ]);
        }
    }

    /**
     * Auto-assign LDAP user to a Maarch entity and set primary entity.
     */
    private static function syncLdapUserEntity(array $args): void
    {
        $login = trim((string)($args['login'] ?? ''));
        if ($login === '') {
            return;
        }

        $user = UserModel::getByLowerLogin([
            'login'  => $login,
            'select' => ['id']
        ]);
        if (empty($user['id'])) {
            return;
        }

        $entityId = AuthenticationController::resolveEntityIdFromLdapData($args['ldapData'] ?? []);
        if (empty($entityId)) {
            return;
        }

        $hasEntity = UserModel::hasEntity([
            'id'       => (int)$user['id'],
            'entityId' => $entityId
        ]);
        if (!$hasEntity) {
            $existingEntities = EntityModel::getByUserId([
                'userId' => (int)$user['id'],
                'select' => ['entity_id']
            ]);
            UserEntityModel::addUserEntity([
                'id'            => (int)$user['id'],
                'entityId'      => $entityId,
                'role'          => '',
                'primaryEntity' => empty($existingEntities) ? 'Y' : 'N'
            ]);
        }

        // Keep LDAP-resolved entity as primary for consistency with directory.
        UserEntityModel::updateUserPrimaryEntity([
            'id'       => (int)$user['id'],
            'entityId' => $entityId
        ]);
    }

    /**
     * Read user identity fields from LDAP after successful bind.
     */
    private static function getLdapUserData(array $args): array
    {
        $login = trim((string)($args['login'] ?? ''));
        $password = (string)($args['password'] ?? '');
        if ($login === '' || $password === '') {
            return [];
        }

        $ldapConfigurations = CoreConfigModel::getXmlLoaded(['path' => 'modules/ldap/xml/config.xml']);
        if (empty($ldapConfigurations) || empty($ldapConfigurations->config->ldap)) {
            return [];
        }

        $baseDn = '';
        if (!empty($ldapConfigurations->filter->dn)) {
            foreach ($ldapConfigurations->filter->dn as $dn) {
                $id = trim((string)$dn['id']);
                $type = strtolower(trim((string)$dn['type']));
                if (!empty($id) && ($type === '' || $type === 'users')) {
                    $baseDn = $id;
                    break;
                }
            }
        }

        $simpleLogin = AuthenticationController::normalizeLdapLogin($login);
        $simpleLoginEscaped = AuthenticationController::escapeLdapFilter($simpleLogin);
        $upnEscaped = AuthenticationController::escapeLdapFilter($simpleLogin . '@corp.anam.dz');
        $searchFilter = "(|(sAMAccountName={$simpleLoginEscaped})(userPrincipalName={$simpleLoginEscaped})(userPrincipalName={$upnEscaped}))";
        $attributes = ['givenName', 'sn', 'mail', 'telephoneNumber', 'displayName', 'memberOf', 'department'];

        foreach ($ldapConfigurations->config->ldap as $ldapConfiguration) {
            $ssl = strtolower(trim((string)$ldapConfiguration->ssl));
            $domain = trim((string)$ldapConfiguration->domain);
            $prefix = trim((string)$ldapConfiguration->prefix_login);
            $suffix = trim((string)$ldapConfiguration->suffix_login);
            $configBaseDn = trim((string)$ldapConfiguration->baseDN);

            if (empty($domain)) {
                continue;
            }

            $uri = ($ssl === 'true' ? "LDAPS://{$domain}" : $domain);
            $ldap = @ldap_connect($uri);
            if ($ldap === false) {
                continue;
            }

            ldap_set_option($ldap, LDAP_OPT_PROTOCOL_VERSION, 3);
            ldap_set_option($ldap, LDAP_OPT_REFERRALS, 0);
            ldap_set_option($ldap, LDAP_OPT_NETWORK_TIMEOUT, 10);

            $ldapLogin = (!empty($prefix) ? $prefix . '\\' . $login : $login);
            $ldapLogin = (!empty($suffix) ? $ldapLogin . $suffix : $ldapLogin);

            $authenticated = @ldap_bind($ldap, $ldapLogin, $password);
            if (!$authenticated) {
                continue;
            }

            $currentBaseDn = !empty($configBaseDn) ? $configBaseDn : $baseDn;
            if (empty($currentBaseDn)) {
                continue;
            }

            $search = @ldap_search($ldap, $currentBaseDn, $searchFilter, $attributes);
            if ($search === false) {
                continue;
            }

            $entries = @ldap_get_entries($ldap, $search);
            if (empty($entries) || empty($entries['count']) || (int)$entries['count'] < 1) {
                continue;
            }

            $entry = $entries[0];
            $result = [
                'firstname' => $entry['givenname'][0] ?? '',
                'lastname'  => $entry['sn'][0] ?? '',
                'mail'      => $entry['mail'][0] ?? '',
                'phone'     => $entry['telephonenumber'][0] ?? '',
                'department'=> $entry['department'][0] ?? '',
                'memberOf'  => []
            ];

            if (!empty($entry['memberof']) && is_array($entry['memberof'])) {
                $count = (int)($entry['memberof']['count'] ?? 0);
                for ($i = 0; $i < $count; $i++) {
                    if (!empty($entry['memberof'][$i])) {
                        $result['memberOf'][] = (string)$entry['memberof'][$i];
                    }
                }
            }

            if (empty($result['firstname']) && empty($result['lastname']) && !empty($entry['displayname'][0])) {
                $displayName = trim((string)$entry['displayname'][0]);
                $parts = preg_split('/\s+/', $displayName, 2);
                $result['firstname'] = $parts[0] ?? '';
                $result['lastname'] = $parts[1] ?? '';
            }

            return $result;
        }

        return [];
    }

    /**
     * Resolve Maarch entity id from LDAP data (memberOf / department / defaultEntity).
     */
    private static function resolveEntityIdFromLdapData(array $ldapData): ?string
    {
        $defaultEntity = AuthenticationController::getLdapDefaultEntity();
        if (!empty($defaultEntity)) {
            $entity = EntityModel::getByEntityId(['entityId' => $defaultEntity, 'select' => ['entity_id']]);
            if (!empty($entity['entity_id'])) {
                return $entity['entity_id'];
            }
        }

        $memberOf = $ldapData['memberOf'] ?? [];
        if (is_array($memberOf)) {
            foreach ($memberOf as $dn) {
                if (preg_match('/CN=([^,]+)/i', (string)$dn, $matches)) {
                    $cn = trim($matches[1]);
                    if ($cn === '') {
                        continue;
                    }

                    // Match by entity_id first.
                    $entity = EntityModel::getByEntityId(['entityId' => strtoupper($cn), 'select' => ['entity_id']]);
                    if (!empty($entity['entity_id'])) {
                        return $entity['entity_id'];
                    }

                    // Fallback: match by label/short label.
                    $labelMatch = EntityModel::get([
                        'select' => ['entity_id'],
                        'where'  => ['(lower(entity_label) = lower(?) OR lower(short_label) = lower(?))', 'enabled = ?'],
                        'data'   => [$cn, $cn, 'Y'],
                        'limit'  => 1
                    ]);
                    if (!empty($labelMatch[0]['entity_id'])) {
                        return $labelMatch[0]['entity_id'];
                    }
                }
            }
        }

        $department = trim((string)($ldapData['department'] ?? ''));
        if ($department !== '') {
            $entity = EntityModel::get([
                'select' => ['entity_id'],
                'where'  => ['(lower(entity_label) = lower(?) OR lower(short_label) = lower(?))', 'enabled = ?'],
                'data'   => [$department, $department, 'Y'],
                'limit'  => 1
            ]);
            if (!empty($entity[0]['entity_id'])) {
                return $entity[0]['entity_id'];
            }
        }

        return null;
    }

    private static function getLdapDefaultEntity(): ?string
    {
        $ldapConfigurations = CoreConfigModel::getXmlLoaded(['path' => 'modules/ldap/xml/config.xml']);
        if (empty($ldapConfigurations) || empty($ldapConfigurations->mapping->user->defaultEntity)) {
            return null;
        }

        $defaultEntity = trim((string)$ldapConfigurations->mapping->user->defaultEntity);
        return $defaultEntity === '' ? null : $defaultEntity;
    }

    private static function normalizeLdapLogin(string $login): string
    {
        $normalized = trim($login);
        if (str_contains($normalized, '\\')) {
            $parts = explode('\\', $normalized);
            $normalized = end($parts);
        }
        if (str_contains($normalized, '@')) {
            $parts = explode('@', $normalized);
            $normalized = $parts[0];
        }
        return trim($normalized);
    }

    private static function escapeLdapFilter(string $value): string
    {
        if (function_exists('ldap_escape')) {
            return ldap_escape($value, '', LDAP_ESCAPE_FILTER);
        }
        return str_replace(
            ['\\', '*', '(', ')', "\x00"],
            ['\\5c', '\\2a', '\\28', '\\29', '\\00'],
            $value
        );
    }

    /**
     * @param array $args
     * @return bool
     */
    public static function canAccessInstallerWithoutAuthentication(array $args): bool
    {
        $installerRoutes = [
            'GET/installer/prerequisites',
            'GET/installer/databaseConnection',
            'GET/installer/sqlDataFiles',
            'GET/installer/docservers',
            'GET/installer/custom',
            'GET/installer/customs',
            'POST/installer/custom',
            'POST/installer/database',
            'POST/installer/docservers',
            'POST/installer/customization',
            'PUT/installer/administrator',
            'DELETE/installer/lock'
        ];
        $expectedNames = [
            '.',
            '..',
            'custom.json',
            '.gitkeep'
        ];

        if (!in_array($args['route'], $installerRoutes)) {
            return false;
        } elseif (is_file("custom/custom.json")) {
            $customs = scandir('custom');
            $customs = array_diff($customs, $expectedNames);
            foreach ($customs as $custom) {
                if (!is_file("custom/{$custom}/initializing.lck")) {
                    return false;
                }
            }
        }

        return true;
    }
}
