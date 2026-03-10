<?php

/**
 * Import all LDAP users into Maarch (safe mode):
 * - create missing users only
 * - optional auto entity assignment
 */

chdir('../..');
require 'vendor/autoload.php';

use Entity\models\EntityModel;
use SrcCore\models\DatabasePDO;
use User\models\UserEntityModel;
use User\models\UserModel;

$options = getopt('', ['customId::', 'bind-user::', 'bind-pass::']);
$customId = $options['customId'] ?? null;
$bindUserOverride = $options['bind-user'] ?? null;
$bindPassOverride = $options['bind-pass'] ?? null;

DatabasePDO::reset();
new DatabasePDO(['customId' => $customId]);

$configPath = 'modules/ldap/xml/config.xml';
if (!empty($customId) && is_file("custom/{$customId}/{$configPath}")) {
    $configPath = "custom/{$customId}/{$configPath}";
}
if (!is_file($configPath)) {
    fwrite(STDERR, "LDAP config file not found: {$configPath}\n");
    exit(1);
}

$xml = simplexml_load_file($configPath);
if (empty($xml) || empty($xml->config->ldap)) {
    fwrite(STDERR, "No LDAP configuration found.\n");
    exit(1);
}

$baseDn = '';
$userFilter = '(sAMAccountName=*)';
if (!empty($xml->filter->dn)) {
    foreach ($xml->filter->dn as $dnNode) {
        $id = trim((string)$dnNode['id']);
        $type = strtolower(trim((string)$dnNode['type']));
        if (!empty($id) && ($type === '' || $type === 'users')) {
            $baseDn = $id;
            $userFilter = trim((string)$dnNode->user) ?: $userFilter;
            break;
        }
    }
}
if ($baseDn === '') {
    fwrite(STDERR, "No users DN found in LDAP config.\n");
    exit(1);
}

$entries = fetchAllLdapUsers($xml, $baseDn, $userFilter, $bindUserOverride, $bindPassOverride);
if (isset($entries['error'])) {
    fwrite(STDERR, "LDAP error: {$entries['error']}\n");
    exit(1);
}

$created = 0;
$skipped = 0;
$entityAssigned = 0;

foreach ($entries as $entry) {
    $login = trim((string)($entry['login'] ?? ''));
    if ($login === '') {
        continue;
    }

    $existing = UserModel::getByLowerLogin(['login' => $login, 'select' => ['id']]);
    if (!empty($existing['id'])) {
        $skipped++;
        continue;
    }

    $firstname = trim((string)($entry['firstname'] ?? ''));
    $lastname = trim((string)($entry['lastname'] ?? ''));
    $mail = trim((string)($entry['mail'] ?? ''));
    $phone = trim((string)($entry['phone'] ?? ''));
    if ($firstname === '') {
        $firstname = $login;
    }
    if ($lastname === '') {
        $lastname = $login;
    }

    $userId = UserModel::create([
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
    $created++;

    $entityId = resolveEntityIdFromLdapData($xml, $entry);
    if (!empty($entityId)) {
        UserEntityModel::addUserEntity([
            'id'            => (int)$userId,
            'entityId'      => $entityId,
            'role'          => '',
            'primaryEntity' => 'Y'
        ]);
        $entityAssigned++;
    }
}

echo "Import done. Created: {$created}, Existing skipped: {$skipped}, Entity assigned: {$entityAssigned}\n";
exit(0);

function fetchAllLdapUsers(SimpleXMLElement $xml, string $baseDn, string $userFilter, ?string $bindUserOverride, ?string $bindPassOverride): array
{
    $attributes = ['sAMAccountName', 'givenName', 'sn', 'mail', 'telephoneNumber', 'displayName', 'memberOf', 'department'];

    foreach ($xml->config->ldap as $ldapConfiguration) {
        $ssl = strtolower(trim((string)$ldapConfiguration->ssl));
        $domain = trim((string)$ldapConfiguration->domain);
        $prefix = trim((string)$ldapConfiguration->prefix_login);
        $suffix = trim((string)$ldapConfiguration->suffix_login);
        $bindUser = $bindUserOverride ?? trim((string)$ldapConfiguration->login_admin);
        $bindPass = $bindPassOverride ?? trim((string)$ldapConfiguration->pass);

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

        if (!empty($bindUser)) {
            $ldapBindUser = (!empty($prefix) ? $prefix . '\\' . $bindUser : $bindUser);
            $ldapBindUser = (!empty($suffix) ? $ldapBindUser . $suffix : $ldapBindUser);
            if (!@ldap_bind($ldap, $ldapBindUser, $bindPass)) {
                continue;
            }
        } else {
            if (!@ldap_bind($ldap)) {
                continue;
            }
        }

        $search = @ldap_search($ldap, $baseDn, $userFilter, $attributes);
        if ($search === false) {
            return ['error' => ldap_error($ldap)];
        }

        $entries = @ldap_get_entries($ldap, $search);
        if (empty($entries) || !isset($entries['count'])) {
            return [];
        }

        $users = [];
        for ($i = 0; $i < (int)$entries['count']; $i++) {
            $e = $entries[$i];
            $login = trim((string)($e['samaccountname'][0] ?? ''));
            if ($login === '') {
                continue;
            }

            $user = [
                'login'      => $login,
                'firstname'  => $e['givenname'][0] ?? '',
                'lastname'   => $e['sn'][0] ?? '',
                'mail'       => $e['mail'][0] ?? '',
                'phone'      => $e['telephonenumber'][0] ?? '',
                'department' => $e['department'][0] ?? '',
                'memberOf'   => []
            ];
            if (empty($user['firstname']) && empty($user['lastname']) && !empty($e['displayname'][0])) {
                $displayName = trim((string)$e['displayname'][0]);
                $parts = preg_split('/\s+/', $displayName, 2);
                $user['firstname'] = $parts[0] ?? '';
                $user['lastname'] = $parts[1] ?? '';
            }

            if (!empty($e['memberof']) && is_array($e['memberof'])) {
                $count = (int)($e['memberof']['count'] ?? 0);
                for ($j = 0; $j < $count; $j++) {
                    if (!empty($e['memberof'][$j])) {
                        $user['memberOf'][] = (string)$e['memberof'][$j];
                    }
                }
            }

            $users[] = $user;
        }
        return $users;
    }

    return ['error' => 'Cannot bind with configured LDAP servers'];
}

function resolveEntityIdFromLdapData(SimpleXMLElement $xml, array $ldapData): ?string
{
    $defaultEntity = trim((string)($xml->mapping->user->defaultEntity ?? ''));
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
                $entity = EntityModel::getByEntityId(['entityId' => strtoupper($cn), 'select' => ['entity_id']]);
                if (!empty($entity['entity_id'])) {
                    return $entity['entity_id'];
                }
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
