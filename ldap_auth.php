<?php

function ad_authenticate(string $username, string $password): bool
{
    $ldapHost = "ldap://10.16.220.10";
    $ldapPort = 389;
    $ldapDomain = "corp.anam.dz";
    $netbiosDomain = "ANAM";

    $username = trim($username);
    if ($username === '' || $password === '') {
        return false;
    }

    // Keep only the account part if user typed login@domain
    $samAccountName = preg_replace('/@.*/', '', $username);
    $samAccountName = trim((string)$samAccountName);

    $bindCandidates = [];
    if (stripos($username, $netbiosDomain . "\\") === 0) {
        $bindCandidates[] = $username;
    } else {
        $bindCandidates[] = $netbiosDomain . "\\" . $samAccountName; // ANAM\login
        $bindCandidates[] = $samAccountName . "@" . $ldapDomain;     // login@corp.anam.dz
        $bindCandidates[] = $samAccountName;                         // login
    }

    $ldapConn = @ldap_connect($ldapHost, $ldapPort);
    if (!$ldapConn) {
        return false;
    }

    ldap_set_option($ldapConn, LDAP_OPT_PROTOCOL_VERSION, 3);
    ldap_set_option($ldapConn, LDAP_OPT_REFERRALS, 0);
    ldap_set_option($ldapConn, LDAP_OPT_NETWORK_TIMEOUT, 7);

    foreach (array_unique($bindCandidates) as $bindUser) {
        if (@ldap_bind($ldapConn, $bindUser, $password)) {
            @ldap_unbind($ldapConn);
            return true;
        }
    }

    @ldap_unbind($ldapConn);
    return false;
}

