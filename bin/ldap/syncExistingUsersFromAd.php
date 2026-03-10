<?php

/**
 * Safe LDAP sync for existing Maarch users.
 * - Updates only firstname / lastname / mail / phone
 * - Does not create or delete users
 */

chdir('../..');
require 'vendor/autoload.php';

use SrcCore\models\DatabasePDO;
use Entity\models\EntityModel;
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
if (!empty($xml->filter->dn)) {
    foreach ($xml->filter->dn as $dnNode) {
        $id = trim((string)$dnNode['id']);
        $type = strtolower(trim((string)$dnNode['type']));
        if (!empty($id) && ($type === '' || $type === 'users')) {
            $baseDn = $id;
            break;
        }
    }
}

$users = UserModel::get([
    'select' => ['id', 'user_id', 'firstname', 'lastname', 'mail', 'phone', 'status', 'mode'],
    'where'  => ["status != 'DEL'", "mode != 'rest'"]
]);

if (empty($users)) {
    echo "No users to sync.\n";
    exit(0);
}

$updated = 0;
$entityAssigned = 0;
$notFound = 0;
$errors = 0;

foreach ($users as $user) {
    $ldapData = fetchLdapUser(
        $xml,
        (string)$user['user_id'],
        $baseDn,
        $bindUserOverride,
        $bindPassOverride
    );

    if (!empty($ldapData['error'])) {
        $errors++;
        continue;
    }
    if (empty($ldapData)) {
        $notFound++;
        continue;
    }

    $set = [];
    foreach (['firstname', 'lastname', 'mail', 'phone'] as $field) {
        if (!empty($ldapData[$field]) && $ldapData[$field] !== ($user[$field] ?? '')) {
            $set[$field] = $ldapData[$field];
        }
    }
    if (!empty($set)) {
        UserModel::update([
            'set'   => $set,
            'where' => ['id = ?'],
            'data'  => [$user['id']]
        ]);
        $updated++;
    }

    $entityId = resolveEntityIdFromLdapData($xml, $ldapData);
    if (!empty($entityId)) {
        $hasEntity = UserModel::hasEntity(['id' => (int)$user['id'], 'entityId' => $entityId]);
        if (!$hasEntity) {
            $existingEntities = EntityModel::getByUserId(['userId' => (int)$user['id'], 'select' => ['entity_id']]);
            UserEntityModel::addUserEntity([
                'id'            => (int)$user['id'],
                'entityId'      => $entityId,
                'role'          => '',
                'primaryEntity' => empty($existingEntities) ? 'Y' : 'N'
            ]);
        }
        UserEntityModel::updateUserPrimaryEntity(['id' => (int)$user['id'], 'entityId' => $entityId]);
        $entityAssigned++;
    }
}

echo "LDAP sync done. Updated profile: {$updated}, Entity sync: {$entityAssigned}, Not found: {$notFound}, Errors: {$errors}\n";
exit(0);

function fetchLdapUser(SimpleXMLElement $xml, string $login, string $defaultBaseDn, ?string $bindUserOverride, ?string $bindPassOverride): array
{
    $normalized = normalizeLogin($login);
    $filter = "(|(sAMAccountName=" . ldapFilterEscape($normalized) . ")(userPrincipalName=" . ldapFilterEscape($normalized) . ")(userPrincipalName=" . ldapFilterEscape($normalized . '@corp.anam.dz') . "))";
    $attributes = ['givenName', 'sn', 'mail', 'telephoneNumber', 'displayName', 'memberOf', 'department'];

    foreach ($xml->config->ldap as $ldapConfiguration) {
        $ssl = strtolower(trim((string)$ldapConfiguration->ssl));
        $domain = trim((string)$ldapConfiguration->domain);
        $prefix = trim((string)$ldapConfiguration->prefix_login);
        $suffix = trim((string)$ldapConfiguration->suffix_login);
        $configBaseDn = trim((string)$ldapConfiguration->baseDN);
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

        $baseDn = !empty($configBaseDn) ? $configBaseDn : $defaultBaseDn;
        if (empty($baseDn)) {
            continue;
        }

        $search = @ldap_search($ldap, $baseDn, $filter, $attributes);
        if ($search === false) {
            return ['error' => ldap_error($ldap)];
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

function normalizeLogin(string $login): string
{
    $value = trim($login);
    if (str_contains($value, '\\')) {
        $parts = explode('\\', $value);
        $value = end($parts);
    }
    if (str_contains($value, '@')) {
        $parts = explode('@', $value);
        $value = $parts[0];
    }
    return trim($value);
}

function ldapFilterEscape(string $value): string
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
