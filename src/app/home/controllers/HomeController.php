<?php

/**
 * Copyright Maarch since 2008 under licence GPLv3.
 * See LICENCE.txt file at the root folder for more details.
 * This file is part of Maarch software.
 *
 */

/**
 * @brief Home Controller
 * @author dev@maarch.org
 */

namespace Home\controllers;

use Basket\models\BasketModel;
use Basket\models\RedirectBasketModel;
use Doctype\models\DoctypeModel;
use Exception;
use Group\models\GroupModel;
use Priority\models\PriorityModel;
use Resource\models\ResModel;
use Slim\Psr7\Request;
use SrcCore\controllers\PreparedClauseController;
use SrcCore\http\Response;
use SrcCore\models\CoreConfigModel;
use SrcCore\models\CurlModel;
use User\models\UserModel;
use Parameter\models\ParameterModel;

class HomeController
{
    private const HOME_STATS_CACHE_TTL = 60; // seconds

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws Exception
     */
    public function get(Request $request, Response $response): Response
    {
        $queryParams = $request->getQueryParams();
        if (!empty($queryParams['statsOnly'])) {
            $forceRefresh = !empty($queryParams['refresh']);
            $cachedStatistics = $forceRefresh ? null : self::getCachedHomeStatistics($GLOBALS['id']);
            if ($cachedStatistics !== null) {
                return $response->withJson(['statistics' => $cachedStatistics, 'cached' => true]);
            }

            $statistics = self::getHomeStatistics(self::getStatsSourcesForCurrentUser());
            self::setCachedHomeStatistics($GLOBALS['id'], $statistics);
            return $response->withJson([
                'statistics' => $statistics,
                'cached'     => false
            ]);
        }

        $regroupedBaskets = [];
        $statsSources = [];
        $withStats = !empty($queryParams['withStats']);

        $user = UserModel::getById(['id' => $GLOBALS['id'], 'select' => ['preferences', 'external_id']]);

        $redirectedBaskets = RedirectBasketModel::getRedirectedBasketsByUserId(['userId' => $GLOBALS['id']]);
        $groups = UserModel::getGroupsById(['id' => $GLOBALS['id']]);

        $preferences = json_decode($user['preferences'], true);
        if (!empty($preferences['homeGroups'])) {
            $orderGroups = [];
            $noOrderGroups = [];
            foreach ($groups as $group) {
                $key = array_search($group['id'], $preferences['homeGroups']);
                if ($key === false) {
                    $noOrderGroups[] = $group;
                } else {
                    $orderGroups[$key] = $group;
                }
            }
            ksort($orderGroups);
            $groups = array_merge($orderGroups, $noOrderGroups);
        }

        foreach ($groups as $group) {
            $baskets = BasketModel::getAvailableBasketsByGroupUser([
                'select'        => [
                    'baskets.id',
                    'baskets.basket_id',
                    'baskets.basket_name',
                    'baskets.basket_desc',
                    'baskets.basket_clause',
                    'baskets.color',
                    'users_baskets_preferences.color as pcolor'
                ],
                'userSerialId'  => $GLOBALS['id'],
                'groupId'       => $group['group_id'],
                'groupSerialId' => $group['id']
            ]);

            foreach ($baskets as $kBasket => $basket) {
                $baskets[$kBasket]['owner_user_id'] = $GLOBALS['id'];
                if (!empty($basket['pcolor'])) {
                    $baskets[$kBasket]['color'] = $basket['pcolor'];
                }
                if (empty($baskets[$kBasket]['color'])) {
                    $baskets[$kBasket]['color'] = '#666666';
                }

                $baskets[$kBasket]['redirected'] = false;
                foreach ($redirectedBaskets as $redirectedBasket) {
                    if (
                        $redirectedBasket['basket_id'] == $basket['basket_id'] &&
                        $redirectedBasket['group_id'] == $group['id']
                    ) {
                        $baskets[$kBasket]['redirected'] = true;
                        $baskets[$kBasket]['redirectedUser'] = $redirectedBasket['userToDisplay'];
                    }
                }

                $baskets[$kBasket]['resourceNumber'] = BasketModel::getResourceNumberByClause(
                    ['userId' => $GLOBALS['id'], 'clause' => $basket['basket_clause']]
                );

                if ($withStats && !empty($basket['basket_clause'])) {
                    $statsSources[] = [
                        'userId' => $GLOBALS['id'],
                        'clause' => $basket['basket_clause']
                    ];
                }

                unset($baskets[$kBasket]['pcolor'], $baskets[$kBasket]['basket_clause']);
            }

            if (!empty($baskets)) {
                $regroupedBaskets[] = [
                    'groupSerialId' => $group['id'],
                    'groupId'       => $group['group_id'],
                    'groupDesc'     => $group['group_desc'],
                    'baskets'       => $baskets
                ];
            }
        }

        $assignedBaskets = RedirectBasketModel::getAssignedBasketsByUserId(['userId' => $GLOBALS['id']]);
        foreach ($assignedBaskets as $key => $assignedBasket) {
            $basket = BasketModel::getByBasketId(
                ['select' => ['id', 'basket_clause'], 'basketId' => $assignedBasket['basket_id']]
            );
            $assignedBaskets[$key]['id'] = $basket['id'];
            $assignedBaskets[$key]['resourceNumber'] = BasketModel::getResourceNumberByClause(
                ['userId' => $assignedBasket['owner_user_id'], 'clause' => $basket['basket_clause']]
            );
            if ($withStats && !empty($basket['basket_clause'])) {
                $statsSources[] = [
                    'userId' => (int)$assignedBasket['owner_user_id'],
                    'clause' => $basket['basket_clause']
                ];
            }
            $assignedBaskets[$key]['uselessGroupId'] = GroupModel::getById(
                ['id' => $assignedBasket['group_id'], 'select' => ['group_id']]
            )['group_id'];
            $assignedBaskets[$key]['ownerLogin'] = UserModel::getById(
                ['id' => $assignedBasket['owner_user_id'], 'select' => ['user_id']]
            )['user_id'];
        }

        $externalId = json_decode($user['external_id'], true);

        $isExternalSignatoryBookConnected = false;
        $externalSignatoryBookUrl = null;
        $loadedXml = CoreConfigModel::getXmlLoaded(['path' => 'modules/visa/xml/remoteSignatoryBooks.xml']);
        if (!empty($loadedXml)) {
            $signatoryBookEnabled = (string)$loadedXml->signatoryBookEnabled;
            foreach ($loadedXml->signatoryBook as $value) {
                if ($value->id == "maarchParapheur" && $value->id == $signatoryBookEnabled) {
                    if (
                        !empty($value->url) && !empty($value->userId) &&
                        !empty($value->password) && !empty($externalId['maarchParapheur'])
                    ) {
                        $isExternalSignatoryBookConnected = true;
                        $externalSignatoryBookUrl = rtrim((string)$value->url, "/");
                    }
                    break;
                } elseif ($value->id == "fastParapheur" && $value->id == $signatoryBookEnabled) {
                    if (!empty($value->url) && !empty($value->subscriberId) && !empty($externalId['fastParapheur'])) {
                        $isExternalSignatoryBookConnected = true;
                        $fastParapheurUrl = (string)$value->url;
                        $fastParapheurUrl = str_replace('/parapheur-ws/rest/v1', '', $fastParapheurUrl);
                        $externalSignatoryBookUrl = rtrim($fastParapheurUrl, "/");
                    }
                    break;
                }
            }
        }

        $homeMessage = ParameterModel::getById(['select' => ['param_value_string'], 'id' => 'homepage_message']);
        $homeMessage = trim($homeMessage['param_value_string']);

        $statistics = $withStats ? (self::getCachedHomeStatistics($GLOBALS['id']) ?? self::getHomeStatistics($statsSources)) : [
            'priority'     => [],
            'doctype'      => [],
            'evolutionDay' => [],
            'evolutionWeek'=> []
        ];
        if ($withStats) {
            self::setCachedHomeStatistics($GLOBALS['id'], $statistics);
        }

        return $response->withJson([
            'regroupedBaskets'                => $regroupedBaskets,
            'assignedBaskets'                 => $assignedBaskets,
            'homeMessage'                     => $homeMessage,
            'statistics'                      => $statistics,
            'isLinkedToExternalSignatoryBook' => $isExternalSignatoryBookConnected,
            'externalSignatoryBookUrl'        => $externalSignatoryBookUrl,
            'signatoryBookEnabled'            => $signatoryBookEnabled ?? null,
        ]);
    }

    private static function getStatsSourcesForCurrentUser(): array
    {
        $statsSources = [];
        $groups = UserModel::getGroupsById(['id' => $GLOBALS['id']]);

        foreach ($groups as $group) {
            $baskets = BasketModel::getAvailableBasketsByGroupUser([
                'select'        => ['baskets.basket_clause'],
                'userSerialId'  => $GLOBALS['id'],
                'groupId'       => $group['group_id'],
                'groupSerialId' => $group['id']
            ]);

            foreach ($baskets as $basket) {
                if (!empty($basket['basket_clause'])) {
                    $statsSources[] = [
                        'userId' => $GLOBALS['id'],
                        'clause' => $basket['basket_clause']
                    ];
                }
            }
        }

        $assignedBaskets = RedirectBasketModel::getAssignedBasketsByUserId(['userId' => $GLOBALS['id']]);
        foreach ($assignedBaskets as $assignedBasket) {
            $basket = BasketModel::getByBasketId([
                'select'   => ['basket_clause'],
                'basketId' => $assignedBasket['basket_id']
            ]);
            if (!empty($basket['basket_clause'])) {
                $statsSources[] = [
                    'userId' => (int)$assignedBasket['owner_user_id'],
                    'clause' => $basket['basket_clause']
                ];
            }
        }

        return $statsSources;
    }

    private static function getHomeStatsCachePath(int $userId): string
    {
        $baseDir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'maarch_home_stats_cache';
        if (!is_dir($baseDir)) {
            @mkdir($baseDir, 0777, true);
        }
        return $baseDir . DIRECTORY_SEPARATOR . "user_{$userId}.json";
    }

    private static function getCachedHomeStatistics(int $userId): ?array
    {
        $path = self::getHomeStatsCachePath($userId);
        if (!is_file($path)) {
            return null;
        }

        $raw = @file_get_contents($path);
        if ($raw === false || $raw === '') {
            return null;
        }

        $payload = json_decode($raw, true);
        if (!is_array($payload) || empty($payload['expiresAt']) || !isset($payload['statistics'])) {
            return null;
        }

        if ((int)$payload['expiresAt'] < time()) {
            @unlink($path);
            return null;
        }

        return is_array($payload['statistics']) ? $payload['statistics'] : null;
    }

    private static function setCachedHomeStatistics(int $userId, array $statistics): void
    {
        $path = self::getHomeStatsCachePath($userId);
        $payload = [
            'expiresAt'   => time() + self::HOME_STATS_CACHE_TTL,
            'generatedAt' => time(),
            'statistics'  => $statistics
        ];
        @file_put_contents($path, json_encode($payload));
    }

    private static function getHomeStatistics(array $statsSources): array
    {
        $resourceIds = self::getUniqueResourceIdsFromSources($statsSources);
        if (empty($resourceIds)) {
            return [
                'priority'     => [],
                'doctype'      => [],
                'evolutionDay' => [],
                'evolutionWeek'=> []
            ];
        }

        $priorityCounts = [];
        $doctypeCounts = [];
        $dayCounts = [];
        $weekCounts = [];

        foreach (array_chunk($resourceIds, 2000) as $chunk) {
            $resources = ResModel::get([
                'select' => ['priority', 'type_id', 'creation_date'],
                'where'  => ['res_id in (?)'],
                'data'   => [$chunk]
            ]);

            foreach ($resources as $resource) {
                $priorityKey = (string)($resource['priority'] ?? '');
                $doctypeKey = (string)($resource['type_id'] ?? '');
                $creationDate = empty($resource['creation_date']) ? null : new \DateTime($resource['creation_date']);

                $priorityCounts[$priorityKey] = ($priorityCounts[$priorityKey] ?? 0) + 1;
                $doctypeCounts[$doctypeKey] = ($doctypeCounts[$doctypeKey] ?? 0) + 1;

                if ($creationDate instanceof \DateTime) {
                    $dayKey = $creationDate->format('Y-m-d');
                    $weekKey = $creationDate->format('o-\WW');
                    $dayCounts[$dayKey] = ($dayCounts[$dayKey] ?? 0) + 1;
                    $weekCounts[$weekKey] = ($weekCounts[$weekKey] ?? 0) + 1;
                }
            }
        }

        return [
            'priority'      => self::formatPriorityStats($priorityCounts),
            'doctype'       => self::formatDoctypeStats($doctypeCounts),
            'evolutionDay'  => self::formatEvolutionStats($dayCounts, 'day'),
            'evolutionWeek' => self::formatEvolutionStats($weekCounts, 'week'),
        ];
    }

    private static function getUniqueResourceIdsFromSources(array $statsSources): array
    {
        $unique = [];

        foreach ($statsSources as $source) {
            if (empty($source['clause']) || empty($source['userId'])) {
                continue;
            }

            $preparedClause = PreparedClauseController::getPreparedClause([
                'userId' => (int)$source['userId'],
                'clause' => $source['clause']
            ]);

            $rows = ResModel::getOnView([
                'select' => ['res_id'],
                'where'  => [$preparedClause]
            ]);

            foreach ($rows as $row) {
                if (!empty($row['res_id'])) {
                    $unique[(int)$row['res_id']] = (int)$row['res_id'];
                }
            }
        }

        return array_values($unique);
    }

    private static function formatPriorityStats(array $priorityCounts): array
    {
        if (empty($priorityCounts)) {
            return [];
        }

        $priorityIds = array_values(array_filter(array_keys($priorityCounts)));
        $labels = [];
        if (!empty($priorityIds)) {
            $priorities = PriorityModel::get([
                'select' => ['id', 'label'],
                'where'  => ['id in (?)'],
                'data'   => [$priorityIds]
            ]);
            $labels = array_column($priorities, 'label', 'id');
        }

        $result = [];
        foreach ($priorityCounts as $id => $count) {
            $result[] = [
                'name'  => empty($id) ? 'Non défini' : ($labels[$id] ?? $id),
                'value' => $count
            ];
        }

        usort($result, fn($a, $b) => $b['value'] <=> $a['value']);
        return $result;
    }

    private static function formatDoctypeStats(array $doctypeCounts): array
    {
        if (empty($doctypeCounts)) {
            return [];
        }

        $doctypeIds = array_values(array_filter(array_keys($doctypeCounts)));
        $labels = [];
        if (!empty($doctypeIds)) {
            $doctypes = DoctypeModel::get([
                'select' => ['type_id', 'description'],
                'where'  => ['type_id in (?)'],
                'data'   => [$doctypeIds]
            ]);
            $labels = array_column($doctypes, 'description', 'type_id');
        }

        $result = [];
        foreach ($doctypeCounts as $id => $count) {
            $result[] = [
                'name'  => empty($id) ? 'Non défini' : ($labels[$id] ?? $id),
                'value' => $count
            ];
        }

        usort($result, fn($a, $b) => $b['value'] <=> $a['value']);
        return array_slice($result, 0, 10);
    }

    private static function formatEvolutionStats(array $counts, string $mode): array
    {
        if (empty($counts)) {
            return [];
        }

        ksort($counts);
        $counts = $mode === 'day' ? array_slice($counts, -14, null, true) : array_slice($counts, -12, null, true);

        $result = [];
        foreach ($counts as $key => $count) {
            if ($mode === 'day') {
                $date = \DateTime::createFromFormat('Y-m-d', $key);
                $label = $date ? $date->format('d/m') : $key;
            } else {
                $label = str_replace('-W', ' S', $key);
            }

            $result[] = [
                'name'  => $label,
                'value' => $count
            ];
        }

        return $result;
    }

    /**
     * @param Request $request
     * @param Response $response
     * @return Response
     * @throws Exception
     */
    public function getMaarchParapheurDocuments(Request $request, Response $response): Response
    {
        $user = UserModel::getById(['id' => $GLOBALS['id'], 'select' => ['external_id']]);

        $externalId = json_decode($user['external_id'], true);
        if (empty($externalId['maarchParapheur'])) {
            return $response->withStatus(400)->withJson(['errors' => 'User is not linked to Maarch Parapheur']);
        }

        $loadedXml = CoreConfigModel::getXmlLoaded(['path' => 'modules/visa/xml/remoteSignatoryBooks.xml']);
        if (empty($loadedXml)) {
            return $response->withStatus(400)->withJson(
                ['errors' => 'SignatoryBooks configuration file missing']
            );
        }

        $url = '';
        $userId = '';
        $password = '';
        foreach ($loadedXml->signatoryBook as $value) {
            if ($value->id == "maarchParapheur") {
                $url = rtrim($value->url, '/');
                $userId = $value->userId;
                $password = $value->password;
                break;
            }
        }

        if (empty($url)) {
            return $response->withStatus(400)->withJson(['errors' => 'Maarch Parapheur configuration missing']);
        }

        $curlResponse = CurlModel::exec([
            'url'         => rtrim($url, '/') . '/rest/documents',
            'basicAuth'   => ['user' => $userId, 'password' => $password],
            'headers'     => ['content-type:application/json'],
            'method'      => 'GET',
            'queryParams' => ['userId' => $externalId['maarchParapheur'], 'limit' => 10]
        ]);

        if ($curlResponse['code'] != '200') {
            if (!empty($curlResponse['response']['errors'])) {
                $errors = $curlResponse['response']['errors'];
            } else {
                $errors = $curlResponse['errors'];
            }
            if (empty($errors)) {
                $errors = 'An error occured. Please check your configuration file.';
            }
            return $response->withStatus(400)->withJson(['errors' => $errors]);
        }

        $curlResponse['response']['url'] = $url;
        return $response->withJson($curlResponse['response']);
    }
}
