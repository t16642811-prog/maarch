<?php
session_start();

require __DIR__ . '/config.php';
require_once __DIR__ . '/ldap_auth.php';

$message = '';

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $loginInput = trim($_POST["email"] ?? '');
    $password = $_POST["mot_de_passe"] ?? '';

    if ($loginInput === '' || $password === '') {
        $message = "Veuillez renseigner le login et le mot de passe.";
    } else {
        // 1) Local MySQL authentication first
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$loginInput]);
        $user = $stmt->fetch();

        if ($user && !empty($user['mot_de_passe']) && password_verify($password, $user['mot_de_passe'])) {
            $_SESSION["user_id"] = $user["id"];
            $_SESSION["prenom"] = $user["prenom"];
            $_SESSION["nom"] = $user["nom"];
            $_SESSION["email"] = $user["email"];
            $_SESSION["role"] = $user["role"];

            header("Location: " . ($user["role"] === "admin" ? "admin.php" : "dashboard.php"));
            exit();
        }

        // 2) LDAP / Active Directory authentication
        if (ad_authenticate($loginInput, $password)) {
            $ldapHost = "ldap://10.16.220.10";
            $ldapPort = 389;
            $baseDn = "dc=corp,dc=anam,dc=dz";
            $samAccountName = preg_replace('/@.*/', '', $loginInput);

            $ldapConn = @ldap_connect($ldapHost, $ldapPort);
            if ($ldapConn) {
                ldap_set_option($ldapConn, LDAP_OPT_PROTOCOL_VERSION, 3);
                ldap_set_option($ldapConn, LDAP_OPT_REFERRALS, 0);
                ldap_set_option($ldapConn, LDAP_OPT_NETWORK_TIMEOUT, 7);

                // Bind again to read attributes
                $bindOk = @ldap_bind($ldapConn, "ANAM\\" . $samAccountName, $password)
                    || @ldap_bind($ldapConn, $samAccountName . "@corp.anam.dz", $password)
                    || @ldap_bind($ldapConn, $samAccountName, $password);

                if ($bindOk) {
                    $escapedLogin = function_exists('ldap_escape')
                        ? ldap_escape($samAccountName, '', LDAP_ESCAPE_FILTER)
                        : preg_replace('/[\\\\\\*\\(\\)\\x00]/', '', $samAccountName);

                    $filter = "(sAMAccountName={$escapedLogin})";
                    $attrs = ["cn", "mail", "givenName", "sn"];
                    $search = @ldap_search($ldapConn, $baseDn, $filter, $attrs);
                    $entries = $search ? @ldap_get_entries($ldapConn, $search) : ["count" => 0];

                    if (($entries["count"] ?? 0) > 0) {
                        $entry = $entries[0];

                        $prenom = $entry["givenname"][0] ?? '';
                        $nom = $entry["sn"][0] ?? '';
                        $fullName = $entry["cn"][0] ?? '';
                        $email = $entry["mail"][0] ?? '';

                        if ($prenom === '' && $nom === '' && $fullName !== '') {
                            $parts = explode(' ', $fullName, 2);
                            $prenom = $parts[0] ?? '';
                            $nom = $parts[1] ?? '';
                        }

                        if ($email === '') {
                            $email = strtolower($samAccountName) . "@corp.anam.dz";
                        }

                        // Keep existing role if account exists, otherwise create a basic user
                        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
                        $stmt->execute([$email]);
                        $existingUser = $stmt->fetch();

                        if ($existingUser) {
                            $stmt = $pdo->prepare("UPDATE users SET prenom = ?, nom = ? WHERE email = ?");
                            $stmt->execute([$prenom, $nom, $email]);

                            $role = $existingUser['role'];
                            $userId = $existingUser['id'];
                        } else {
                            $stmt = $pdo->prepare("INSERT INTO users (prenom, nom, email, mot_de_passe, role) VALUES (?, ?, ?, '', 'user')");
                            $stmt->execute([$prenom, $nom, $email]);

                            $role = 'user';
                            $userId = $pdo->lastInsertId();
                        }

                        $_SESSION["user_id"] = $userId;
                        $_SESSION["prenom"] = $prenom;
                        $_SESSION["nom"] = $nom;
                        $_SESSION["email"] = $email;
                        $_SESSION["role"] = $role;

                        @ldap_unbind($ldapConn);

                        header("Location: " . ($role === "admin" ? "admin.php" : "dashboard.php"));
                        exit();
                    } else {
                        $message = "Authentifie sur LDAP, mais utilisateur introuvable dans l'annuaire.";
                    }
                } else {
                    $message = "Connexion LDAP impossible avec ce login/mot de passe.";
                }

                @ldap_unbind($ldapConn);
            } else {
                $message = "Impossible d'initialiser la connexion LDAP.";
            }
        } else {
            $message = "Email/login ou mot de passe incorrect.";
        }
    }
}
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Connexion</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background-color: #f5f7fb; }
        .login-card { max-width: 450px; margin: 50px auto; border-radius: 10px; overflow: hidden; }
        .login-logo { display: block; margin: 20px auto; max-height: 80px; }
        .btn-login { background-color: #983544; border: none; }
        .btn-login:hover { background-color: #6b3a49; }
        .link-custom { color: #983544; text-decoration: none; }
        .link-custom:hover { text-decoration: underline; color: #6b3a49; }
    </style>
</head>
<body>
<div class="container">
    <div class="card shadow login-card">
        <div class="card-body p-4">
            <img src="includes/logo.png/logo.png" alt="Logo" class="login-logo">
            <h4 class="text-center mb-4">Connexion</h4>
            <?php if ($message !== ''): ?>
                <div class="alert alert-danger" role="alert">
                    <?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?>
                </div>
            <?php endif; ?>
            <form method="post">
                <div class="mb-3">
                    <label for="email" class="form-label">Email ou login LDAP</label>
                    <input type="text" class="form-control" name="email" id="email" required autocomplete="username">
                </div>
                <div class="mb-3">
                    <label for="mot_de_passe" class="form-label d-flex justify-content-between">
                        <span>Mot de passe</span>
                        <a href="forgot.php" class="link-custom small">Mot de passe oublie ?</a>
                    </label>
                    <input type="password" class="form-control" name="mot_de_passe" id="mot_de_passe" required>
                </div>
                <div class="form-check mb-3">
                    <input type="checkbox" class="form-check-input" id="remember_me" name="remember_me">
                    <label class="form-check-label" for="remember_me">Se souvenir de moi</label>
                </div>
                <button type="submit" class="btn btn-login w-100 text-white">Se connecter</button>
            </form>
        </div>
        <div class="card-footer text-center">
            Pas encore inscrit ? <a href="register.php" class="link-custom small">Creer un compte</a>
        </div>
    </div>
</div>
</body>
</html>

